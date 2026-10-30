from datetime import timedelta
from decimal import Decimal

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.constants import Role
from apps.departments.models import Department
from apps.leaves.models import LeaveBalance, LeavePolicy, LeaveRequest, LeaveType
from apps.leaves.services import LeaveBalanceService

PASSWORD = "Leave@12345"


def make_user(email, role, department, manager=None):
    return User.objects.create_user(
        email=email, password=PASSWORD, full_name=email.split("@")[0].title(), role=role,
        department=department, reporting_manager=manager, is_active=True, is_password_set=True,
    )


def days_from_now(n):
    return timezone.localdate() + timedelta(days=n)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class LeaveWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        hr = Department.objects.create(name="HR")
        dev = Department.objects.create(name="Dev")
        cls.annual = LeaveType.objects.create(name="Annual")
        LeavePolicy.objects.create(
            leave_type=cls.annual, annual_entitlement=18, max_consecutive_days=10, half_day_allowed=True
        )
        cls.admin = make_user("anita@x.test", Role.ADMIN, hr)
        cls.manager = make_user("ram@x.test", Role.MANAGER, dev, cls.admin)
        cls.sita = make_user("sita@x.test", Role.EMPLOYEE, dev, cls.manager)
        cls.hari = make_user("hari@x.test", Role.EMPLOYEE, hr, cls.admin)
        cls.other_manager = make_user("maya@x.test", Role.MANAGER, dev, cls.admin)
        for user in (cls.admin, cls.manager, cls.sita, cls.hari, cls.other_manager):
            LeaveBalanceService.create_balances_for_user(user)

    def login(self, user):
        client = APIClient()
        response = client.post("/api/auth/login/", {"email": user.email, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        return client

    def apply(self, client, start=3, end=5, **extra):
        payload = {
            "leave_type": self.annual.pk,
            "start_date": str(days_from_now(start)),
            "end_date": str(days_from_now(end)),
            "reason": "Personal work",
            **extra,
        }
        return client.post("/api/leaves/requests/", payload, format="json")

    # -- routing -------------------------------------------------------

    def test_employee_request_goes_to_reporting_manager(self):
        response = self.apply(self.login(self.sita))
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["data"]["approver"], self.manager.pk)
        self.assertEqual(response.data["data"]["total_days"], "3.00")

    def test_hr_employee_request_goes_to_admin(self):
        response = self.apply(self.login(self.hari))
        self.assertEqual(response.data["data"]["approver"], self.admin.pk)

    def test_manager_request_goes_to_admin(self):
        response = self.apply(self.login(self.manager))
        self.assertEqual(response.data["data"]["approver"], self.admin.pk)

    def test_admin_without_manager_cannot_apply(self):
        response = self.apply(self.login(self.admin))
        self.assertEqual(response.status_code, 400)

    # -- validation ----------------------------------------------------

    def test_overlap_is_rejected(self):
        client = self.login(self.sita)
        self.assertEqual(self.apply(client, 3, 5).status_code, 201)
        self.assertEqual(self.apply(client, 4, 6).status_code, 400)

    def test_insufficient_balance_is_rejected(self):
        LeaveBalance.objects.filter(user=self.sita).update(entitled_days=2)
        response = self.apply(self.login(self.sita), 3, 5)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Insufficient", response.data["message"])

    def test_pending_requests_count_against_balance(self):
        LeaveBalance.objects.filter(user=self.sita).update(entitled_days=4)
        client = self.login(self.sita)
        self.assertEqual(self.apply(client, 3, 5).status_code, 201)  # 3 days pending
        self.assertEqual(self.apply(client, 10, 11).status_code, 400)  # needs 2, only 1 left

    def test_max_consecutive_days(self):
        self.assertEqual(self.apply(self.login(self.sita), 3, 20).status_code, 400)

    def test_past_start_date_rejected(self):
        self.assertEqual(self.apply(self.login(self.sita), -3, -1).status_code, 400)

    def test_half_day(self):
        response = self.apply(self.login(self.sita), 3, 3, is_half_day=True)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["data"]["total_days"], "0.50")

    # -- approval ------------------------------------------------------

    def test_balance_deducted_only_after_approval(self):
        sita = self.login(self.sita)
        request_id = self.apply(sita, 3, 5).data["data"]["id"]
        balance = LeaveBalance.objects.get(user=self.sita)
        self.assertEqual(balance.used_days, 0)

        response = self.login(self.manager).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        balance.refresh_from_db()
        self.assertEqual(balance.used_days, Decimal("3"))
        self.assertEqual(balance.remaining_days, Decimal("15"))

    def test_reject_keeps_balance(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        response = self.login(self.manager).post(
            f"/api/leaves/requests/{request_id}/reject/", {"comment": "Busy week"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(LeaveBalance.objects.get(user=self.sita).used_days, 0)

    def test_other_manager_cannot_review(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        response = self.login(self.other_manager).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_approve_requests_not_assigned_to_them(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        response = self.login(self.admin).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_admin_approves_hr_employee(self):
        request_id = self.apply(self.login(self.hari)).data["data"]["id"]
        response = self.login(self.admin).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_employee_cannot_review(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        response = self.login(self.hari).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_cannot_review_twice(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        manager = self.login(self.manager)
        manager.post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        again = manager.post(f"/api/leaves/requests/{request_id}/reject/", {}, format="json")
        self.assertEqual(again.status_code, 400)

    # -- cancel --------------------------------------------------------

    def test_cancel_approved_restores_balance(self):
        sita = self.login(self.sita)
        request_id = self.apply(sita, 3, 5).data["data"]["id"]
        self.login(self.manager).post(f"/api/leaves/requests/{request_id}/approve/", {}, format="json")
        response = sita.post(f"/api/leaves/requests/{request_id}/cancel/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(LeaveBalance.objects.get(user=self.sita).used_days, 0)

    def test_cannot_cancel_someone_elses_request(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        self.assertEqual(self.login(self.hari).post(f"/api/leaves/requests/{request_id}/cancel/").status_code, 404)

    def test_cannot_cancel_started_leave(self):
        leave = LeaveRequest.objects.create(
            employee=self.sita, leave_type=self.annual, approver=self.manager,
            start_date=days_from_now(-1), end_date=days_from_now(1), total_days=3,
            reason="x", status="approved",
        )
        response = self.login(self.sita).post(f"/api/leaves/requests/{leave.pk}/cancel/")
        self.assertEqual(response.status_code, 400)

    # -- notifications / history --------------------------------------

    def test_notifications_and_history(self):
        sita = self.login(self.sita)
        request_id = self.apply(sita).data["data"]["id"]
        manager = self.login(self.manager)
        notes = manager.get("/api/notifications/").data["data"]
        self.assertEqual(notes[0]["notification_type"], "leave_assigned")

        manager.post(f"/api/leaves/requests/{request_id}/approve/", {"comment": "Enjoy"}, format="json")
        types = [n["notification_type"] for n in sita.get("/api/notifications/").data["data"]]
        self.assertIn("leave_approved", types)
        self.assertEqual(sita.get("/api/notifications/unread-count/").data["data"]["unread_count"], 2)
        sita.post("/api/notifications/read-all/")
        self.assertEqual(sita.get("/api/notifications/unread-count/").data["data"]["unread_count"], 0)

        detail = sita.get(f"/api/leaves/requests/{request_id}/").data["data"]
        self.assertEqual([h["action"] for h in detail["history"]], ["submitted", "approved"])

    def test_visibility(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        self.assertEqual(self.login(self.hari).get(f"/api/leaves/requests/{request_id}/").status_code, 404)
        self.assertEqual(self.login(self.admin).get(f"/api/leaves/requests/{request_id}/").status_code, 200)

    def test_calendar_is_scoped(self):
        self.apply(self.login(self.sita))
        self.apply(self.login(self.hari))
        params = {"start": str(days_from_now(0)), "end": str(days_from_now(30))}
        self.assertEqual(len(self.login(self.admin).get("/api/leaves/calendar/", params).data["data"]), 2)
        self.assertEqual(len(self.login(self.manager).get("/api/leaves/calendar/", params).data["data"]), 1)
        self.assertEqual(len(self.login(self.hari).get("/api/leaves/calendar/", params).data["data"]), 1)

    def test_reporting_manager_change_reroutes_pending(self):
        request_id = self.apply(self.login(self.sita)).data["data"]["id"]
        response = self.login(self.admin).patch(
            f"/api/users/{self.sita.pk}/", {"reporting_manager": self.other_manager.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(LeaveRequest.objects.get(pk=request_id).approver_id, self.other_manager.pk)

    def test_dashboard_for_each_role(self):
        for user in (self.admin, self.manager, self.sita):
            self.assertEqual(self.login(user).get("/api/reports/dashboard/").status_code, 200)
        self.assertEqual(self.login(self.admin).get("/api/reports/summary/").status_code, 200)
        self.assertEqual(self.login(self.admin).get("/api/reports/leave-usage/").status_code, 200)
        self.assertEqual(self.login(self.sita).get("/api/reports/summary/").status_code, 403)

    def test_auto_approval_when_policy_does_not_require_it(self):
        casual = LeaveType.objects.create(name="Casual")
        LeavePolicy.objects.create(leave_type=casual, annual_entitlement=5, max_consecutive_days=3, approval_required=False)
        LeaveBalanceService.create_balances_for_user(self.sita)
        response = self.login(self.sita).post(
            "/api/leaves/requests/",
            {"leave_type": casual.pk, "start_date": str(days_from_now(3)), "end_date": str(days_from_now(3)), "reason": "Errand"},
            format="json",
        )
        self.assertEqual(response.data["data"]["status"], "approved")
        self.assertEqual(LeaveBalance.objects.get(user=self.sita, leave_type=casual).used_days, 1)

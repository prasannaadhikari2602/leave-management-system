import re

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.constants import Role
from apps.departments.models import Department
from apps.leaves.models import LeavePolicy, LeaveType

PASSWORD = "Leave@12345"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AccountFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name="Dev")
        cls.admin = User.objects.create_superuser("admin@x.test", PASSWORD, full_name="Admin")
        cls.manager = User.objects.create_user(
            "ram@x.test", PASSWORD, full_name="Ram", role=Role.MANAGER, department=cls.dept,
            reporting_manager=cls.admin, is_active=True, is_password_set=True,
        )
        leave_type = LeaveType.objects.create(name="Annual")
        LeavePolicy.objects.create(leave_type=leave_type, annual_entitlement=18)

    def client_for(self, email):
        client = APIClient()
        response = client.post("/api/auth/login/", {"email": email, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        return client

    def test_invite_set_password_login(self):
        admin = self.client_for("admin@x.test")
        response = admin.post(
            "/api/users/",
            {"full_name": "Sita Rai", "email": "Sita@X.test", "role": "employee",
             "department": self.dept.pk, "reporting_manager": self.manager.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(mail.outbox), 1)

        # cannot log in before setting a password
        anon = APIClient()
        early = anon.post("/api/auth/login/", {"email": "sita@x.test", "password": "whatever"}, format="json")
        self.assertEqual(early.status_code, 400)

        link = re.search(r"uid=([^&\s]+)&token=([^\s]+)", mail.outbox[0].body)
        uid, token = link.groups()
        done = anon.post(
            "/api/auth/set-password/",
            {"uid": uid, "token": token, "password": "Str0ng!Pass99", "confirm_password": "Str0ng!Pass99"},
            format="json",
        )
        self.assertEqual(done.status_code, 200, done.content)

        # the same link cannot be reused
        again = anon.post(
            "/api/auth/set-password/",
            {"uid": uid, "token": token, "password": "An0ther!Pass99", "confirm_password": "An0ther!Pass99"},
            format="json",
        )
        self.assertEqual(again.status_code, 400)

        login = anon.post("/api/auth/login/", {"email": "sita@x.test", "password": "Str0ng!Pass99"}, format="json")
        self.assertEqual(login.status_code, 200)
        me = anon.get("/api/auth/me/")
        self.assertEqual(me.data["data"]["role"], "employee")

        # leave balances were created at invitation time
        self.assertEqual(anon.get("/api/leaves/balances/").data["data"][0]["entitled_days"], "18.00")

    def test_employee_needs_reporting_manager(self):
        admin = self.client_for("admin@x.test")
        response = admin.post(
            "/api/users/",
            {"full_name": "No Boss", "email": "nb@x.test", "role": "employee", "department": self.dept.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_cannot_create_admin_via_api(self):
        admin = self.client_for("admin@x.test")
        response = admin.post(
            "/api/users/",
            {"full_name": "Evil", "email": "e@x.test", "role": "admin", "department": self.dept.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_only_admin_manages_users_and_departments(self):
        manager = self.client_for("ram@x.test")
        self.assertEqual(manager.post("/api/departments/", {"name": "X"}, format="json").status_code, 403)
        self.assertEqual(manager.post("/api/users/", {}, format="json").status_code, 403)
        self.assertEqual(manager.get("/api/departments/").status_code, 200)

    def test_unauthenticated_is_401(self):
        self.assertEqual(APIClient().get("/api/auth/me/").status_code, 401)

    def test_refresh_and_logout(self):
        client = self.client_for("ram@x.test")
        self.assertEqual(client.post("/api/auth/refresh/").status_code, 200)
        self.assertEqual(client.post("/api/auth/logout/").status_code, 200)

    def test_department_crud_and_delete_protection(self):
        admin = self.client_for("admin@x.test")
        created = admin.post("/api/departments/", {"name": "Finance"}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(admin.post("/api/departments/", {"name": "finance"}, format="json").status_code, 400)
        self.assertEqual(admin.delete(f"/api/departments/{created.data['data']['id']}/").status_code, 200)
        self.assertEqual(admin.delete(f"/api/departments/{self.dept.pk}/").status_code, 409)

    def test_deactivate_user_blocks_login(self):
        admin = self.client_for("admin@x.test")
        sita = User.objects.create_user(
            "s@x.test", PASSWORD, full_name="Sita", role=Role.EMPLOYEE, department=self.dept,
            reporting_manager=self.manager, is_active=True, is_password_set=True,
        )
        self.assertEqual(admin.patch(f"/api/users/{sita.pk}/", {"is_active": False}, format="json").status_code, 200)
        res = APIClient().post("/api/auth/login/", {"email": "s@x.test", "password": PASSWORD}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_deactivate_manager_with_team(self):
        User.objects.create_user(
            "s@x.test", PASSWORD, full_name="Sita", role=Role.EMPLOYEE, department=self.dept,
            reporting_manager=self.manager, is_active=True, is_password_set=True,
        )
        admin = self.client_for("admin@x.test")
        res = admin.patch(f"/api/users/{self.manager.pk}/", {"is_active": False}, format="json")
        self.assertEqual(res.status_code, 409)

    def test_change_password(self):
        client = self.client_for("ram@x.test")
        res = client.post(
            "/api/auth/change-password/",
            {"current_password": PASSWORD, "new_password": "Br4nd!NewPass", "confirm_password": "Br4nd!NewPass"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_forgot_password_is_silent(self):
        anon = APIClient()
        self.assertEqual(anon.post("/api/auth/forgot-password/", {"email": "nobody@x.test"}, format="json").status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        anon.post("/api/auth/forgot-password/", {"email": "ram@x.test"}, format="json")
        self.assertEqual(len(mail.outbox), 1)

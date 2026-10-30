from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.common.constants import LeaveStatus, Role
from apps.common.exceptions import ConflictError
from apps.notifications.services import NotificationService

from .models import LeaveRequestHistory
from .repositories import (
    LeaveBalanceRepository,
    LeaveHistoryRepository,
    LeavePolicyRepository,
    LeaveRequestRepository,
    LeaveTypeRepository,
    today,
)

Action = LeaveRequestHistory.Action
ZERO = Decimal("0")
MAX_CALENDAR_DAYS = 100


# ---------------------------------------------------------------------------
# Leave types
# ---------------------------------------------------------------------------

class LeaveTypeService:
    @staticmethod
    def list_leave_types(search=None, is_active=None):
        return LeaveTypeRepository.list(search, is_active)

    @staticmethod
    def get_leave_type(leave_type_id):
        leave_type = LeaveTypeRepository.get_by_id(leave_type_id)
        if leave_type is None:
            raise NotFound("Leave type not found.")
        return leave_type

    @staticmethod
    def create_leave_type(data):
        return LeaveTypeRepository.create(data)

    @staticmethod
    def update_leave_type(leave_type_id, data):
        leave_type = LeaveTypeService.get_leave_type(leave_type_id)
        LeaveTypeRepository.update(leave_type, data)
        return LeaveTypeService.get_leave_type(leave_type_id)

    @staticmethod
    @transaction.atomic
    def delete_leave_type(leave_type_id):
        leave_type = LeaveTypeService.get_leave_type(leave_type_id)
        if leave_type.leave_requests.exists():
            raise ConflictError(
                "Leave requests exist for this type. Deactivate it instead of deleting it."
            )
        LeaveBalanceRepository.delete_for_leave_type(leave_type)
        LeaveTypeRepository.delete(leave_type)


# ---------------------------------------------------------------------------
# Leave policies (rules / entitlements)
# ---------------------------------------------------------------------------

class LeavePolicyService:
    @staticmethod
    def list_policies(is_active=None):
        return LeavePolicyRepository.list(is_active)

    @staticmethod
    def get_policy(policy_id):
        policy = LeavePolicyRepository.get_by_id(policy_id)
        if policy is None:
            raise NotFound("Leave policy not found.")
        return policy

    @staticmethod
    @transaction.atomic
    def create_policy(data):
        policy = LeavePolicyRepository.create(data)
        LeaveBalanceService.allocate_year(today().year)  # give everyone their balance
        return policy

    @staticmethod
    @transaction.atomic
    def update_policy(policy_id, data):
        policy = LeavePolicyService.get_policy(policy_id)
        old_entitlement = policy.annual_entitlement
        LeavePolicyRepository.update(policy, data)

        year = today().year
        delta = policy.annual_entitlement - old_entitlement
        if delta != ZERO:
            # Shift (rather than overwrite) so individual adjustments survive.
            LeaveBalanceRepository.adjust_entitlement_for_year(policy.leave_type, year, delta)
        if policy.is_active:
            LeaveBalanceService.allocate_year(year)
        return LeavePolicyService.get_policy(policy_id)

    @staticmethod
    def delete_policy(policy_id):
        policy = LeavePolicyService.get_policy(policy_id)
        LeavePolicyRepository.delete(policy)


# ---------------------------------------------------------------------------
# Leave balances
# ---------------------------------------------------------------------------

class LeaveBalanceService:
    @staticmethod
    def create_balances_for_user(user, year=None):
        year = year or today().year
        return LeaveBalanceRepository.create_missing_for_user(
            user, LeavePolicyRepository.active_policies(), year
        )

    @staticmethod
    def allocate_year(year):
        """Create any missing balance rows for all active users. Returns rows created."""
        from apps.accounts.repositories import UserRepository

        policies = list(LeavePolicyRepository.active_policies())
        created = 0
        for user in UserRepository.list(is_active=True):
            created += LeaveBalanceRepository.create_missing_for_user(user, policies, year)
        return created

    @staticmethod
    def list_my_balances(user, year=None):
        year = year or today().year
        if year == today().year:
            LeaveBalanceService.create_balances_for_user(user, year)
        return LeaveBalanceRepository.for_user(user, year)

    @staticmethod
    def list_all_balances(**filters):
        return LeaveBalanceRepository.list_all(**filters)

    @staticmethod
    def update_entitlement(balance_id, entitled_days):
        balance = LeaveBalanceRepository.get_by_id(balance_id)
        if balance is None:
            raise NotFound("Leave balance not found.")
        if entitled_days < balance.used_days:
            raise ValidationError(
                {"entitled_days": f"Cannot be lower than the {balance.used_days} days already used."}
            )
        balance.entitled_days = entitled_days
        LeaveBalanceRepository.save(balance, ["entitled_days"])
        return LeaveBalanceRepository.get_by_id(balance_id)

    @staticmethod
    def get_locked_balance(user, leave_type, year, policy):
        """Fetch (creating if needed) and row-lock the balance for a user/type/year."""
        LeaveBalanceRepository.get_or_create(user, leave_type, year, policy.annual_entitlement)
        return LeaveBalanceRepository.get_for_update(user, leave_type, year)


# ---------------------------------------------------------------------------
# Leave requests
# ---------------------------------------------------------------------------

class LeaveRequestService:
    # ---- helpers ------------------------------------------------------

    @staticmethod
    def calculate_days(start_date, end_date, is_half_day):
        if is_half_day:
            return Decimal("0.5")
        return Decimal((end_date - start_date).days + 1)

    @staticmethod
    def resolve_approver(employee):
        """Who reviews this person's leave: their reporting manager, else an admin."""
        manager = employee.reporting_manager
        if (
            manager is not None
            and manager.is_active
            and manager.pk != employee.pk
            and manager.role in (Role.MANAGER, Role.ADMIN)
        ):
            return manager

        if employee.role == Role.MANAGER:
            from apps.accounts.repositories import UserRepository

            admin = UserRepository.active_admins(exclude_id=employee.pk).first()
            if admin is not None:
                return admin

        if employee.role == Role.ADMIN:
            raise ValidationError(
                {"detail": "Admin leave needs a higher-level approver. Ask the system owner to "
                           "assign a reporting manager to your account."}
            )
        raise ValidationError(
            {"detail": "You have no active reporting manager. Please contact HR."}
        )

    @staticmethod
    def _record(lr, by, action, old_status, comment=""):
        LeaveHistoryRepository.record(lr, by, action, old_status, lr.status, comment)

    @staticmethod
    def _deduct_balance(lr):
        policy = LeavePolicyRepository.get_active_for_type(lr.leave_type)
        balance = LeaveBalanceRepository.get_for_update(lr.employee, lr.leave_type, lr.start_date.year)
        if balance is None and policy is not None:
            balance = LeaveBalanceService.get_locked_balance(
                lr.employee, lr.leave_type, lr.start_date.year, policy
            )
        if balance is None:
            raise ValidationError({"detail": "Leave balance not found for this request."})
        if balance.remaining_days < lr.total_days:
            raise ValidationError({"detail": "The employee no longer has enough leave balance."})
        balance.used_days += lr.total_days
        LeaveBalanceRepository.save(balance, ["used_days"])

    @staticmethod
    def _restore_balance(lr):
        balance = LeaveBalanceRepository.get_for_update(lr.employee, lr.leave_type, lr.start_date.year)
        if balance is None:
            return
        balance.used_days = max(ZERO, balance.used_days - lr.total_days)
        LeaveBalanceRepository.save(balance, ["used_days"])

    # ---- apply --------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def apply(employee, data):
        leave_type = data["leave_type"]
        start_date, end_date = data["start_date"], data["end_date"]
        is_half_day = data.get("is_half_day", False)

        if not leave_type.is_active:
            raise ValidationError({"leave_type": "This leave type is not available."})
        policy = LeavePolicyRepository.get_active_for_type(leave_type)
        if policy is None:
            raise ValidationError({"leave_type": "No active leave policy exists for this leave type."})

        # --- date validity
        if start_date < today():
            raise ValidationError({"start_date": "Start date cannot be in the past."})
        if start_date.year != end_date.year:
            raise ValidationError(
                {"end_date": "A request cannot span two calendar years. Submit two requests."}
            )
        if is_half_day:
            if not policy.half_day_allowed:
                raise ValidationError({"is_half_day": "Half-day leave is not allowed for this leave type."})
            if start_date != end_date:
                raise ValidationError({"is_half_day": "A half day must start and end on the same date."})

        total_days = LeaveRequestService.calculate_days(start_date, end_date, is_half_day)
        if policy.max_consecutive_days and total_days > policy.max_consecutive_days:
            raise ValidationError(
                {"end_date": f"{leave_type.name} allows at most {policy.max_consecutive_days} "
                             "consecutive days."}
            )

        # --- overlap
        if LeaveRequestRepository.has_overlap(employee, start_date, end_date):
            raise ValidationError(
                {"start_date": "These dates overlap with an existing pending or approved request."}
            )

        # --- balance (pending requests are counted so nobody can over-request)
        year = start_date.year
        balance = LeaveBalanceService.get_locked_balance(employee, leave_type, year, policy)
        pending = LeaveRequestRepository.pending_days(employee, leave_type, year)
        available = balance.remaining_days - pending
        if total_days > available:
            raise ValidationError(
                {"detail": f"Insufficient leave balance. Available: {available} day(s), "
                           f"requested: {total_days}."}
            )

        # --- routing
        approver = None
        if policy.approval_required:
            approver = LeaveRequestService.resolve_approver(employee)

        lr = LeaveRequestRepository.create(
            employee=employee,
            leave_type=leave_type,
            approver=approver,
            start_date=start_date,
            end_date=end_date,
            is_half_day=is_half_day,
            total_days=total_days,
            reason=data["reason"].strip(),
        )
        LeaveRequestService._record(lr, employee, Action.SUBMITTED, "")

        if approver is None:  # no approval needed: approve straight away
            old = lr.status
            LeaveRequestService._deduct_balance(lr)
            lr.status = LeaveStatus.APPROVED
            lr.decided_at = timezone.now()
            LeaveRequestRepository.save(lr, ["status", "decided_at"])
            LeaveRequestService._record(lr, None, Action.AUTO_APPROVED, old, "No approval required.")
            NotificationService.notify_auto_approved(lr)
        else:
            NotificationService.notify_leave_submitted(lr)
        return lr

    # ---- cancel -------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def cancel(employee, request_id):
        lr = LeaveRequestRepository.get_for_update(request_id)
        if lr is None or lr.employee_id != employee.pk:
            raise NotFound("Leave request not found.")

        if lr.status == LeaveStatus.APPROVED:
            if lr.start_date < today():
                raise ValidationError({"detail": "This leave has already started and cannot be cancelled."})
        elif lr.status != LeaveStatus.PENDING:
            raise ValidationError({"detail": "Only pending or approved requests can be cancelled."})

        old = lr.status
        if old == LeaveStatus.APPROVED:
            LeaveRequestService._restore_balance(lr)
        lr.status = LeaveStatus.CANCELLED
        LeaveRequestRepository.save(lr, ["status"])
        LeaveRequestService._record(lr, employee, Action.CANCELLED, old)
        NotificationService.notify_leave_cancelled(lr)
        return LeaveRequestRepository.get_by_id(lr.pk)

    # ---- review -------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def review(reviewer, request_id, decision, comment=""):
        if decision not in (LeaveStatus.APPROVED, LeaveStatus.REJECTED):
            raise ValidationError({"decision": "Decision must be approved or rejected."})
        if reviewer.role not in (Role.ADMIN, Role.MANAGER):
            raise PermissionDenied("You are not allowed to review leave requests.")

        lr = LeaveRequestRepository.get_for_update(request_id)
        if lr is None:
            raise NotFound("Leave request not found.")
        if lr.employee_id == reviewer.pk:
            raise PermissionDenied("You cannot review your own leave request.")
        # Admins do not approve everything: only requests routed to them.
        if lr.approver_id != reviewer.pk:
            raise PermissionDenied("This request is not assigned to you.")
        if lr.status != LeaveStatus.PENDING:
            raise ValidationError({"detail": "Only pending requests can be reviewed."})

        old = lr.status
        if decision == LeaveStatus.APPROVED:
            LeaveRequestService._deduct_balance(lr)

        lr.status = decision
        lr.decision_comment = comment.strip()
        lr.decided_at = timezone.now()
        LeaveRequestRepository.save(lr, ["status", "decision_comment", "decided_at"])
        LeaveRequestService._record(
            lr, reviewer,
            Action.APPROVED if decision == LeaveStatus.APPROVED else Action.REJECTED,
            old, lr.decision_comment,
        )
        NotificationService.notify_leave_decision(lr)
        return LeaveRequestRepository.get_by_id(lr.pk)

    # ---- re-routing when the reporting manager changes ----------------

    @staticmethod
    def reroute_pending_requests(user):
        try:
            approver = LeaveRequestService.resolve_approver(user)
        except ValidationError:
            return 0
        moved = 0
        for lr in LeaveRequestRepository.pending_for_employee(user):
            if lr.approver_id == approver.pk:
                continue
            lr.approver = approver
            LeaveRequestRepository.save(lr, ["approver"])
            LeaveRequestService._record(lr, None, Action.REASSIGNED, lr.status, "Reporting manager changed.")
            NotificationService.notify_leave_assigned(lr)
            moved += 1
        return moved

    # ---- queries ------------------------------------------------------

    @staticmethod
    def my_requests(user, **filters):
        return LeaveRequestRepository.for_employee(user, **filters)

    @staticmethod
    def review_queue(user, **filters):
        return LeaveRequestRepository.for_approver(user, **filters)

    @staticmethod
    def all_requests(**filters):
        return LeaveRequestRepository.list_all(**filters)

    @staticmethod
    def get_request(user, request_id):
        lr = LeaveRequestRepository.get_by_id(request_id)
        allowed = lr is not None and (
            user.role == Role.ADMIN
            or lr.employee_id == user.pk
            or lr.approver_id == user.pk
        )
        if not allowed:
            raise NotFound("Leave request not found.")
        return lr

    @staticmethod
    def get_history(lr):
        return LeaveHistoryRepository.for_request(lr)

    @staticmethod
    def calendar(user, start, end, department_id=None):
        """Leave calendar: admin = company, manager = own team + self, employee = self."""
        if end < start:
            raise ValidationError({"end": "End date cannot be before start date."})
        if (end - start) > timedelta(days=MAX_CALENDAR_DAYS):
            raise ValidationError({"end": f"Range cannot exceed {MAX_CALENDAR_DAYS} days."})

        if user.role == Role.ADMIN:
            return LeaveRequestRepository.calendar(start, end, department_id=department_id)

        employee_ids = [user.pk]
        if user.role == Role.MANAGER:
            employee_ids += list(user.subordinates.values_list("pk", flat=True))
        return LeaveRequestRepository.calendar(start, end, employee_ids=employee_ids)

from decimal import Decimal

from django.db.models import DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.common.constants import LeaveStatus

from .models import (
    LeaveBalance,
    LeavePolicy,
    LeaveRequest,
    LeaveRequestHistory,
    LeaveType,
)


class LeaveTypeRepository:
    @staticmethod
    def list(search=None, is_active=None):
        queryset = LeaveType.objects.select_related("policy")
        if search:
            queryset = queryset.filter(name__icontains=search)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        return queryset.order_by("name")

    @staticmethod
    def get_by_id(leave_type_id):
        return LeaveType.objects.select_related("policy").filter(pk=leave_type_id).first()

    @staticmethod
    def create(data):
        return LeaveType.objects.create(**data)

    @staticmethod
    def update(leave_type, data):
        for field, value in data.items():
            setattr(leave_type, field, value)
        leave_type.save()
        return leave_type

    @staticmethod
    def has_requests_or_balances(leave_type):
        return (
            leave_type.leave_requests.exists()
            or leave_type.leave_balances.exists()
        )

    @staticmethod
    def delete(leave_type):
        leave_type.delete()


class LeavePolicyRepository:
    @staticmethod
    def list(is_active=None):
        queryset = LeavePolicy.objects.select_related("leave_type")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        return queryset.order_by("leave_type__name")

    @staticmethod
    def get_by_id(policy_id):
        return LeavePolicy.objects.select_related("leave_type").filter(pk=policy_id).first()

    @staticmethod
    def get_active_for_type(leave_type):
        return LeavePolicy.objects.filter(leave_type=leave_type, is_active=True).first()

    @staticmethod
    def active_policies():
        return LeavePolicy.objects.filter(
            is_active=True, leave_type__is_active=True
        ).select_related("leave_type")

    @staticmethod
    def create(data):
        return LeavePolicy.objects.create(**data)

    @staticmethod
    def update(policy, data):
        for field, value in data.items():
            setattr(policy, field, value)
        policy.save()
        return policy

    @staticmethod
    def delete(policy):
        policy.delete()


class LeaveBalanceRepository:
    @staticmethod
    def _with_pending(queryset):
        pending = (
            LeaveRequest.objects.filter(
                employee=OuterRef("user_id"),
                leave_type=OuterRef("leave_type_id"),
                start_date__year=OuterRef("year"),
                status=LeaveStatus.PENDING,
            )
            .values("employee")
            .annotate(total=Sum("total_days"))
            .values("total")
        )
        return queryset.annotate(
            pending_days=Coalesce(
                Subquery(pending),
                Value(Decimal("0")),
                output_field=DecimalField(max_digits=7, decimal_places=2),
            )
        )

    @staticmethod
    def base_queryset():
        return LeaveBalanceRepository._with_pending(
            LeaveBalance.objects.select_related("user", "leave_type")
        )

    @staticmethod
    def for_user(user, year):
        return LeaveBalanceRepository.base_queryset().filter(user=user, year=year).order_by("leave_type__name")

    @staticmethod
    def list_all(year=None, user_id=None, leave_type_id=None, department_id=None, search=None):
        queryset = LeaveBalanceRepository.base_queryset()
        if year:
            queryset = queryset.filter(year=year)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)
        if department_id:
            queryset = queryset.filter(user__department_id=department_id)
        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) | Q(user__email__icontains=search)
            )
        return queryset.order_by("user__full_name", "leave_type__name")

    @staticmethod
    def get_by_id(balance_id):
        return LeaveBalanceRepository.base_queryset().filter(pk=balance_id).first()

    @staticmethod
    def get_for_update(user, leave_type, year):
        return (
            LeaveBalance.objects.select_for_update()
            .filter(user=user, leave_type=leave_type, year=year)
            .first()
        )

    @staticmethod
    def get_or_create(user, leave_type, year, entitled_days):
        balance, created = LeaveBalance.objects.get_or_create(
            user=user, leave_type=leave_type, year=year,
            defaults={"entitled_days": entitled_days, "used_days": Decimal("0")},
        )
        return balance, created

    @staticmethod
    def create_missing_for_user(user, policies, year):
        """Create balances for every policy the user does not have one for yet."""
        existing = LeaveBalanceRepository.existing_leave_type_ids(user, year)
        new_balances = [
            LeaveBalance(
                user=user, leave_type=policy.leave_type, year=year,
                entitled_days=policy.annual_entitlement, used_days=Decimal("0"),
            )
            for policy in policies
            if policy.leave_type_id not in existing
        ]
        LeaveBalance.objects.bulk_create(new_balances, ignore_conflicts=True)
        return len(new_balances)

    @staticmethod
    def delete_for_leave_type(leave_type):
        LeaveBalance.objects.filter(leave_type=leave_type).delete()

    @staticmethod
    def existing_leave_type_ids(user, year):
        return set(
            LeaveBalance.objects.filter(user=user, year=year).values_list("leave_type_id", flat=True)
        )

    @staticmethod
    def adjust_entitlement_for_year(leave_type, year, delta):
        """Shift every user's entitlement for a type/year, never below used days."""
        updated = 0
        for balance in LeaveBalance.objects.filter(leave_type=leave_type, year=year):
            balance.entitled_days = max(balance.used_days, balance.entitled_days + delta)
            balance.save(update_fields=["entitled_days", "updated_at"])
            updated += 1
        return updated

    @staticmethod
    def save(balance, fields):
        balance.save(update_fields=fields + ["updated_at"])
        return balance


class LeaveRequestRepository:
    @staticmethod
    def base_queryset():
        return LeaveRequest.objects.select_related(
            "employee", "employee__department", "leave_type", "approver"
        )

    @staticmethod
    def create(**data):
        return LeaveRequest.objects.create(**data)

    @staticmethod
    def get_by_id(request_id):
        return LeaveRequestRepository.base_queryset().filter(pk=request_id).first()

    @staticmethod
    def get_for_update(request_id):
        # `of=("self",)` locks only the request row (joins may be nullable).
        return (
            LeaveRequest.objects.select_for_update(of=("self",))
            .select_related("employee", "leave_type", "approver")
            .filter(pk=request_id)
            .first()
        )

    @staticmethod
    def save(leave_request, fields):
        leave_request.save(update_fields=fields + ["updated_at"])
        return leave_request

    @staticmethod
    def _apply_filters(queryset, status=None, leave_type_id=None, date_from=None, date_to=None):
        if status:
            queryset = queryset.filter(status=status)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)
        if date_from:
            queryset = queryset.filter(end_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_date__lte=date_to)
        return queryset

    @staticmethod
    def for_employee(user, **filters):
        queryset = LeaveRequestRepository.base_queryset().filter(employee=user)
        return LeaveRequestRepository._apply_filters(queryset, **filters)

    @staticmethod
    def for_approver(user, search=None, **filters):
        queryset = LeaveRequestRepository.base_queryset().filter(approver=user)
        if search:
            queryset = queryset.filter(employee__full_name__icontains=search)
        return LeaveRequestRepository._apply_filters(queryset, **filters)

    @staticmethod
    def list_all(search=None, department_id=None, employee_id=None, **filters):
        queryset = LeaveRequestRepository.base_queryset()
        if search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=search) | Q(employee__email__icontains=search)
            )
        if department_id:
            queryset = queryset.filter(employee__department_id=department_id)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return LeaveRequestRepository._apply_filters(queryset, **filters)

    @staticmethod
    def has_overlap(employee, start_date, end_date):
        return LeaveRequest.objects.filter(
            employee=employee,
            start_date__lte=end_date,
            end_date__gte=start_date,
            status__in=[LeaveStatus.PENDING, LeaveStatus.APPROVED],
        ).exists()

    @staticmethod
    def pending_days(employee, leave_type, year):
        total = LeaveRequest.objects.filter(
            employee=employee, leave_type=leave_type,
            start_date__year=year, status=LeaveStatus.PENDING,
        ).aggregate(total=Sum("total_days"))["total"]
        return total or Decimal("0")

    @staticmethod
    def pending_for_employee(employee):
        return LeaveRequest.objects.select_related("employee", "leave_type").filter(
            employee=employee, status=LeaveStatus.PENDING
        )

    @staticmethod
    def calendar(start, end, employee_ids=None, department_id=None):
        queryset = LeaveRequestRepository.base_queryset().filter(
            status__in=[LeaveStatus.APPROVED, LeaveStatus.PENDING],
            start_date__lte=end,
            end_date__gte=start,
        )
        if employee_ids is not None:
            queryset = queryset.filter(employee_id__in=employee_ids)
        if department_id:
            queryset = queryset.filter(employee__department_id=department_id)
        return queryset.order_by("start_date", "employee__full_name")


class LeaveHistoryRepository:
    @staticmethod
    def record(leave_request, action_by, action, old_status, new_status, comment=""):
        return LeaveRequestHistory.objects.create(
            leave_request=leave_request,
            action_by=action_by,
            action=action,
            old_status=old_status,
            new_status=new_status,
            comment=comment or "",
        )

    @staticmethod
    def for_request(leave_request):
        return leave_request.history.select_related("action_by")


def today():
    return timezone.localdate()

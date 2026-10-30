from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, ExtractMonth

from apps.common.constants import LeaveStatus
from apps.departments.models import Department
from apps.leaves.models import LeaveBalance, LeaveRequest

User = get_user_model()
ZERO = Value(0, output_field=DecimalField(max_digits=8, decimal_places=2))


class ReportRepository:
    # ---- headcount ----------------------------------------------------

    @staticmethod
    def count_active_users():
        return User.objects.filter(is_active=True).count()

    @staticmethod
    def count_users_by_role():
        rows = User.objects.filter(is_active=True).values("role").annotate(total=Count("id"))
        return {row["role"]: row["total"] for row in rows}

    @staticmethod
    def count_departments(active_only=True):
        queryset = Department.objects.all()
        return queryset.filter(is_active=True).count() if active_only else queryset.count()

    @staticmethod
    def employees_by_department():
        return list(
            Department.objects.annotate(
                total=Count("users", filter=Q(users__is_active=True))
            )
            .order_by("name")
            .values("id", "name", "total")
        )

    # ---- requests -----------------------------------------------------

    @staticmethod
    def requests_by_status(year=None):
        queryset = LeaveRequest.objects.all()
        if year:
            queryset = queryset.filter(start_date__year=year)
        rows = queryset.values("status").annotate(total=Count("id"))
        counts = {status: 0 for status in LeaveStatus.values}
        counts.update({row["status"]: row["total"] for row in rows})
        return counts

    @staticmethod
    def on_leave_on(day, employee_ids=None):
        queryset = LeaveRequest.objects.filter(
            status=LeaveStatus.APPROVED, start_date__lte=day, end_date__gte=day
        ).select_related("employee", "leave_type")
        if employee_ids is not None:
            queryset = queryset.filter(employee_id__in=employee_ids)
        return queryset.order_by("employee__full_name")

    @staticmethod
    def pending_for_approver(user):
        return LeaveRequest.objects.filter(approver=user, status=LeaveStatus.PENDING).count()

    @staticmethod
    def my_counts(user, year):
        rows = (
            LeaveRequest.objects.filter(employee=user, start_date__year=year)
            .values("status")
            .annotate(total=Count("id"))
        )
        counts = {status: 0 for status in LeaveStatus.values}
        counts.update({row["status"]: row["total"] for row in rows})
        return counts

    @staticmethod
    def upcoming_for_employee(user, day, limit=5):
        return (
            LeaveRequest.objects.filter(
                employee=user, status=LeaveStatus.APPROVED, end_date__gte=day
            )
            .select_related("leave_type")
            .order_by("start_date")[:limit]
        )

    # ---- usage --------------------------------------------------------

    @staticmethod
    def usage_by_leave_type(year):
        return list(
            LeaveBalance.objects.filter(year=year)
            .values(leave_type_name=Coalesce("leave_type__name", Value("")))
            .annotate(
                entitled=Coalesce(Sum("entitled_days"), ZERO),
                used=Coalesce(Sum("used_days"), ZERO),
            )
            .order_by("leave_type_name")
        )

    @staticmethod
    def usage_by_department(year):
        return list(
            LeaveRequest.objects.filter(status=LeaveStatus.APPROVED, start_date__year=year)
            .values(department_name=Coalesce("employee__department__name", Value("Unassigned")))
            .annotate(days=Coalesce(Sum("total_days"), ZERO), requests=Count("id"))
            .order_by("department_name")
        )

    @staticmethod
    def approved_days_by_month(year):
        rows = (
            LeaveRequest.objects.filter(status=LeaveStatus.APPROVED, start_date__year=year)
            .annotate(month=ExtractMonth("start_date"))
            .values("month")
            .annotate(days=Coalesce(Sum("total_days"), ZERO))
            .order_by("month")
        )
        return {row["month"]: row["days"] for row in rows}

    @staticmethod
    def export_rows(year=None, status=None):
        queryset = LeaveRequest.objects.select_related(
            "employee", "employee__department", "leave_type", "approver"
        ).order_by("-created_at")
        if year:
            queryset = queryset.filter(start_date__year=year)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

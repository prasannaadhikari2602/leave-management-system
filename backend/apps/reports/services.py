import csv
from decimal import Decimal

from apps.common.constants import Role
from apps.leaves.repositories import today
from apps.leaves.serializers import LeaveBalanceSerializer
from apps.leaves.services import LeaveBalanceService

from .repositories import ReportRepository

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


class ReportService:
    @staticmethod
    def admin_summary(year=None):
        year = year or today().year
        by_status = ReportRepository.requests_by_status(year)
        return {
            "year": year,
            "total_employees": ReportRepository.count_active_users(),
            "users_by_role": ReportRepository.count_users_by_role(),
            "total_departments": ReportRepository.count_departments(),
            "employees_by_department": ReportRepository.employees_by_department(),
            "requests_by_status": by_status,
            "pending_requests": by_status["pending"],
            "approved_requests": by_status["approved"],
            "rejected_requests": by_status["rejected"],
            "on_leave_today": ReportRepository.on_leave_on(today()).count(),
        }

    @staticmethod
    def leave_usage(year=None):
        year = year or today().year
        monthly = ReportRepository.approved_days_by_month(year)
        by_type = ReportRepository.usage_by_leave_type(year)
        for row in by_type:
            row["remaining"] = row["entitled"] - row["used"]
        return {
            "year": year,
            "by_leave_type": by_type,
            "by_department": ReportRepository.usage_by_department(year),
            "by_month": [
                {"month": MONTHS[i - 1], "days": monthly.get(i, Decimal("0"))} for i in range(1, 13)
            ],
        }

    @staticmethod
    def dashboard(user):
        """Role-aware overview used by the first page every user sees."""
        day = today()
        my_balances = LeaveBalanceService.list_my_balances(user, day.year)
        upcoming = ReportRepository.upcoming_for_employee(user, day)

        data = {
            "role": user.role,
            "year": day.year,
            "my_balances": LeaveBalanceSerializer(my_balances, many=True).data,
            "my_requests": ReportRepository.my_counts(user, day.year),
            "upcoming_leaves": [
                {
                    "id": lr.id,
                    "leave_type_name": lr.leave_type.name,
                    "start_date": lr.start_date,
                    "end_date": lr.end_date,
                    "total_days": lr.total_days,
                }
                for lr in upcoming
            ],
        }

        if user.role in (Role.MANAGER, Role.ADMIN):
            team_ids = list(user.subordinates.values_list("pk", flat=True))
            data["team_size"] = len(team_ids)
            data["pending_approvals"] = ReportRepository.pending_for_approver(user)
            data["team_on_leave_today"] = [
                {
                    "employee_name": lr.employee.full_name,
                    "leave_type_name": lr.leave_type.name,
                    "end_date": lr.end_date,
                }
                for lr in ReportRepository.on_leave_on(day, employee_ids=team_ids)
            ]
        if user.role == Role.ADMIN:
            data["summary"] = ReportService.admin_summary(day.year)
        return data

    @staticmethod
    def export_csv(response, year=None, status=None):
        writer = csv.writer(response)
        writer.writerow([
            "Request ID", "Employee", "Email", "Department", "Leave type", "Start date",
            "End date", "Days", "Status", "Approver", "Reason", "Decision comment", "Submitted at",
        ])
        for lr in ReportRepository.export_rows(year, status):
            writer.writerow([
                lr.id, lr.employee.full_name, lr.employee.email,
                lr.employee.department.name if lr.employee.department else "",
                lr.leave_type.name, lr.start_date, lr.end_date, lr.total_days, lr.status,
                lr.approver.full_name if lr.approver else "",
                lr.reason, lr.decision_comment, lr.created_at.strftime("%Y-%m-%d %H:%M"),
            ])
        return response

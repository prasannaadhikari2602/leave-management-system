"""Create demo data: python manage.py seed_demo

Creates an admin (HR manager), two managers, employees, departments,
leave types and policies. All demo users share the password below.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.common.constants import Role
from apps.departments.models import Department
from apps.leaves.models import LeavePolicy, LeaveType
from apps.leaves.services import LeaveBalanceService

PASSWORD = "Leave@12345"

DEPARTMENTS = ["Human Resources", "Development", "Finance", "Marketing", "Operations"]

LEAVE_TYPES = [
    # name, description, days/year, max consecutive, half day, approval required
    ("Annual Leave", "Paid yearly vacation.", 18, 15, True, True),
    ("Sick Leave", "Leave for illness or medical appointments.", 12, 10, True, True),
    ("Casual Leave", "Short personal leave.", 10, 3, True, True),
    ("Maternity Leave", "Leave for new mothers.", 60, 60, False, True),
    ("Unpaid Leave", "Leave without pay.", 30, 30, False, True),
]

# email, name, role, department, reports to (email)
USERS = [
    ("anita@company.test", "Anita Sharma", Role.ADMIN, "Human Resources", None),
    ("ram@company.test", "Ram Thapa", Role.MANAGER, "Development", "anita@company.test"),
    ("maya@company.test", "Maya Gurung", Role.MANAGER, "Finance", "anita@company.test"),
    ("hari@company.test", "Hari Karki", Role.EMPLOYEE, "Human Resources", "anita@company.test"),
    ("sita@company.test", "Sita Rai", Role.EMPLOYEE, "Development", "ram@company.test"),
    ("gita@company.test", "Gita Shrestha", Role.EMPLOYEE, "Development", "ram@company.test"),
    ("bikash@company.test", "Bikash Adhikari", Role.EMPLOYEE, "Finance", "maya@company.test"),
]


class Command(BaseCommand):
    help = "Seed demo departments, leave rules and users."

    @transaction.atomic
    def handle(self, *args, **options):
        departments = {
            name: Department.objects.get_or_create(name=name)[0] for name in DEPARTMENTS
        }

        for name, description, days, max_days, half, approval in LEAVE_TYPES:
            leave_type, _ = LeaveType.objects.get_or_create(
                name=name, defaults={"description": description}
            )
            LeavePolicy.objects.get_or_create(
                leave_type=leave_type,
                defaults={
                    "annual_entitlement": days,
                    "max_consecutive_days": max_days,
                    "half_day_allowed": half,
                    "approval_required": approval,
                },
            )

        by_email = {}
        for email, full_name, role, department, _ in USERS:
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(
                    email=email, password=PASSWORD, full_name=full_name, role=role,
                    department=departments[department], is_active=True, is_password_set=True,
                    is_superuser=(role == Role.ADMIN),
                )
            by_email[email] = user

        for email, _, _, _, manager_email in USERS:
            if manager_email:
                user = by_email[email]
                user.reporting_manager = by_email[manager_email]
                user.save(update_fields=["reporting_manager"])

        for user in by_email.values():
            LeaveBalanceService.create_balances_for_user(user)

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"Password for every demo user: {PASSWORD}")
        for email, full_name, role, *_ in USERS:
            self.stdout.write(f"  {role:<9} {email}  ({full_name})")

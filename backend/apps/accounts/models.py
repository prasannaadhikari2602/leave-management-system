from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.common.constants import Role
from apps.departments.models import Department

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)

    # Accounts start inactive and are activated once the user sets a password.
    is_active = models.BooleanField(default=False)
    is_password_set = models.BooleanField(default=False)

    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    # Who reviews this user's leave requests.
    reporting_manager = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="subordinates"
    )

    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_staff(self):
        # Only admins may use the Django admin site.
        return self.is_active and self.role == Role.ADMIN

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN

    @property
    def is_manager_role(self):
        return self.role == Role.MANAGER

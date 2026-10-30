from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.constants import LeaveStatus


class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class LeavePolicy(models.Model):
    """Rules for one leave type (one policy per type)."""

    leave_type = models.OneToOneField(LeaveType, on_delete=models.CASCADE, related_name="policy")
    annual_entitlement = models.DecimalField(max_digits=5, decimal_places=2)
    max_consecutive_days = models.PositiveIntegerField(default=30)
    half_day_allowed = models.BooleanField(default=False)
    approval_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_policies"
        verbose_name_plural = "leave policies"

    def __str__(self):
        return f"{self.leave_type.name}: {self.annual_entitlement} days/year"


class LeaveBalance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="leave_balances")
    year = models.PositiveIntegerField()
    entitled_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_balances"
        constraints = [
            models.UniqueConstraint(fields=["user", "leave_type", "year"], name="unique_balance_per_user_type_year")
        ]

    @property
    def remaining_days(self):
        return self.entitled_days - self.used_days


class LeaveRequest(models.Model):
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="leave_requests")
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="leave_requests_to_approve",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_half_day = models.BooleanField(default=False)
    total_days = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    decision_comment = models.TextField(blank=True, default="")
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employee", "status"]),
            models.Index(fields=["approver", "status"]),
            models.Index(fields=["start_date", "end_date"]),
        ]


class LeaveRequestHistory(models.Model):
    """Audit trail: who did what to a leave request, and when."""

    class Action(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        AUTO_APPROVED = "auto_approved", "Auto-approved"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        REASSIGNED = "reassigned", "Reassigned"

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name="history")
    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="leave_actions"
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    old_status = models.CharField(max_length=20, blank=True, default="")
    new_status = models.CharField(max_length=20)
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "leave_request_history"
        ordering = ["created_at", "id"]

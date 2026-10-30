from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        LEAVE_SUBMITTED = "leave_submitted", "Leave submitted"
        LEAVE_ASSIGNED = "leave_assigned", "Leave awaiting review"
        LEAVE_APPROVED = "leave_approved", "Leave approved"
        LEAVE_REJECTED = "leave_rejected", "Leave rejected"
        LEAVE_CANCELLED = "leave_cancelled", "Leave cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    leave_request = models.ForeignKey(
        "leaves.LeaveRequest", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=150)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self):
        return f"{self.user_id}: {self.title}"

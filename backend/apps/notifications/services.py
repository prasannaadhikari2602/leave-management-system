import logging

from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import NotFound

from apps.common.services import CompanySettingService

from .models import Notification
from .repositories import NotificationRepository

logger = logging.getLogger(__name__)
Type = Notification.NotificationType


class NotificationService:
    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    @staticmethod
    def _create(recipient, leave_request, notification_type, title, message):
        if recipient is None or not recipient.is_active:
            return None
        notification = NotificationRepository.create(
            user=recipient,
            leave_request=leave_request,
            notification_type=notification_type,
            title=title,
            message=message,
        )
        NotificationService._maybe_email(recipient, title, message)
        return notification

    @staticmethod
    def _maybe_email(recipient, title, message):
        """Also send an email when the admin enabled email notifications."""
        try:
            if not CompanySettingService.get_settings().email_notifications_enabled:
                return
            send_mail(
                subject=f"{title} - Leave Portal",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
        except Exception:
            logger.exception("Could not send notification email to %s", recipient.email)

    @staticmethod
    def _period(lr):
        if lr.start_date == lr.end_date:
            return f"{lr.start_date:%b %d, %Y}"
        return f"{lr.start_date:%b %d} - {lr.end_date:%b %d, %Y}"

    # ------------------------------------------------------------------
    # Leave events
    # ------------------------------------------------------------------

    @staticmethod
    def notify_leave_submitted(lr):
        """Tell the requester it went through and the approver it needs review."""
        period = NotificationService._period(lr)
        NotificationService._create(
            lr.employee, lr, Type.LEAVE_SUBMITTED, "Leave request submitted",
            f"Your {lr.leave_type.name} request for {period} was submitted.",
        )
        NotificationService.notify_leave_assigned(lr)

    @staticmethod
    def notify_leave_assigned(lr):
        if lr.approver_id is None:
            return None
        return NotificationService._create(
            lr.approver, lr, Type.LEAVE_ASSIGNED, "New leave request",
            f"{lr.employee.full_name} requested {lr.leave_type.name} for "
            f"{NotificationService._period(lr)} ({lr.total_days} days).",
        )

    @staticmethod
    def notify_auto_approved(lr):
        return NotificationService._create(
            lr.employee, lr, Type.LEAVE_APPROVED, "Leave approved",
            f"Your {lr.leave_type.name} request for {NotificationService._period(lr)} "
            "was approved automatically.",
        )

    @staticmethod
    def notify_leave_decision(lr):
        approved = lr.status == "approved"
        message = (
            f"Your {lr.leave_type.name} request for {NotificationService._period(lr)} "
            f"was {'approved' if approved else 'rejected'}."
        )
        if lr.decision_comment:
            message += f" Comment: {lr.decision_comment}"
        return NotificationService._create(
            lr.employee, lr,
            Type.LEAVE_APPROVED if approved else Type.LEAVE_REJECTED,
            "Leave request approved" if approved else "Leave request rejected",
            message,
        )

    @staticmethod
    def notify_leave_cancelled(lr):
        if lr.approver_id is None or lr.approver_id == lr.employee_id:
            return None
        return NotificationService._create(
            lr.approver, lr, Type.LEAVE_CANCELLED, "Leave request cancelled",
            f"{lr.employee.full_name} cancelled their {lr.leave_type.name} request for "
            f"{NotificationService._period(lr)}.",
        )

    # ------------------------------------------------------------------
    # Reading
    # ------------------------------------------------------------------

    @staticmethod
    def list_notifications(user, is_read=None):
        return NotificationRepository.list_for_user(user, is_read)

    @staticmethod
    def unread_count(user):
        return NotificationRepository.unread_count(user)

    @staticmethod
    def mark_read(user, notification_id):
        notification = NotificationRepository.get_for_user(user, notification_id)
        if notification is None:
            raise NotFound("Notification not found.")
        return NotificationRepository.mark_read(notification)

    @staticmethod
    def mark_all_read(user):
        return NotificationRepository.mark_all_read(user)

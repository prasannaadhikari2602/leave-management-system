from .models import Notification


class NotificationRepository:
    @staticmethod
    def create(**data):
        return Notification.objects.create(**data)

    @staticmethod
    def list_for_user(user, is_read=None):
        queryset = Notification.objects.filter(user=user)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read)
        return queryset

    @staticmethod
    def unread_count(user):
        return Notification.objects.filter(user=user, is_read=False).count()

    @staticmethod
    def get_for_user(user, notification_id):
        return Notification.objects.filter(user=user, pk=notification_id).first()

    @staticmethod
    def mark_read(notification):
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return notification

    @staticmethod
    def mark_all_read(user):
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True)

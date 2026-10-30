from rest_framework.views import APIView

from apps.common.responses import paginated_response, parse_bool, success_response

from .serializers import NotificationSerializer
from .services import NotificationService


class NotificationListView(APIView):
    def get(self, request):
        notifications = NotificationService.list_notifications(
            request.user, parse_bool(request.query_params.get("is_read"))
        )
        return paginated_response(request, notifications, NotificationSerializer)


class UnreadCountView(APIView):
    def get(self, request):
        return success_response({"unread_count": NotificationService.unread_count(request.user)})


class MarkNotificationReadView(APIView):
    def post(self, request, notification_id):
        notification = NotificationService.mark_read(request.user, notification_id)
        return success_response(NotificationSerializer(notification).data, "Marked as read.")


class MarkAllReadView(APIView):
    def post(self, request):
        updated = NotificationService.mark_all_read(request.user)
        return success_response({"updated": updated}, "All notifications marked as read.")

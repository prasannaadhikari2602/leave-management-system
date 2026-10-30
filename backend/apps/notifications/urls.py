from django.urls import path

from .views import MarkAllReadView, MarkNotificationReadView, NotificationListView, UnreadCountView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", MarkAllReadView.as_view(), name="notification-read-all"),
    path("<int:notification_id>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
]

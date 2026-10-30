from django.urls import path

from .views import MyTeamView, ResendInviteView, UserDetailView, UserListCreateView

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),
    path("my-team/", MyTeamView.as_view(), name="my-team"),
    path("<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path("<int:user_id>/resend-invite/", ResendInviteView.as_view(), name="user-resend-invite"),
]

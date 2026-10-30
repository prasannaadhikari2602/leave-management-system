from django.urls import path

from .views import (
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    SetPasswordView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("set-password/", SetPasswordView.as_view(), name="auth-set-password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]

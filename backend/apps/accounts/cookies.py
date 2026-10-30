from django.conf import settings
from rest_framework_simplejwt.settings import api_settings


def set_access_cookie(response, token):
    response.set_cookie(
        key=settings.AUTH_COOKIE_ACCESS,
        value=str(token),
        max_age=int(api_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )


def set_refresh_cookie(response, token):
    response.set_cookie(
        key=settings.AUTH_COOKIE_REFRESH,
        value=str(token),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_REFRESH_PATH,
    )


def clear_auth_cookies(response):
    response.delete_cookie(
        settings.AUTH_COOKIE_ACCESS,
        path="/",
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.AUTH_COOKIE_REFRESH,
        path=settings.AUTH_COOKIE_REFRESH_PATH,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
import os

from .base import *  # noqa: F401,F403
from .base import FRONTEND_URL

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

# HTTPS-only cookies and headers
AUTH_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30

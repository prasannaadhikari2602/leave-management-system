from .base import *  # noqa: F401,F403
from .base import INSTALLED_APPS, MIDDLEWARE, REST_FRAMEWORK

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

AUTH_COOKIE_SECURE = False  # plain HTTP is fine locally

# API docs (Swagger) at /api/docs/
INSTALLED_APPS += ["drf_spectacular"]
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Leave Portal API",
    "DESCRIPTION": "API documentation for the Leave Management System.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

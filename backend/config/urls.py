from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.auth_urls")),
    path("api/users/", include("apps.accounts.urls")),
    path("api/departments/", include("apps.departments.urls")),
    path("api/leaves/", include("apps.leaves.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/settings/", include("apps.common.urls")),
]

if settings.DEBUG:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

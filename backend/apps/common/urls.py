from django.urls import path

from .views import CompanySettingView

urlpatterns = [path("", CompanySettingView.as_view(), name="company-settings")]

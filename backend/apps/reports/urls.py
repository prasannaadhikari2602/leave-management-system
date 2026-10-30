from django.urls import path

from .views import DashboardView, ExportLeaveRequestsView, LeaveUsageReportView, SummaryReportView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="report-dashboard"),
    path("summary/", SummaryReportView.as_view(), name="report-summary"),
    path("leave-usage/", LeaveUsageReportView.as_view(), name="report-leave-usage"),
    path("export/", ExportLeaveRequestsView.as_view(), name="report-export"),
]

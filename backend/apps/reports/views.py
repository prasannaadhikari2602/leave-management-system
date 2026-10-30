from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole
from apps.common.responses import success_response

from .services import ReportService


def _year(request):
    try:
        return int(request.query_params.get("year")) if request.query_params.get("year") else None
    except ValueError:
        return None


class DashboardView(APIView):
    def get(self, request):
        return success_response(ReportService.dashboard(request.user))


class SummaryReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        return success_response(ReportService.admin_summary(_year(request)))


class LeaveUsageReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        return success_response(ReportService.leave_usage(_year(request)))


class ExportLeaveRequestsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="leave-requests.csv"'
        return ReportService.export_csv(
            response, year=_year(request), status=request.query_params.get("status") or None
        )

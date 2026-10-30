from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .permissions import IsAdminRole
from .responses import success_response
from .serializers import CompanySettingSerializer
from .services import CompanySettingService


class CompanySettingView(APIView):
    """GET: any signed-in user (company name is shown in the UI). PATCH: admin."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    def get(self, request):
        setting = CompanySettingService.get_settings()
        return success_response(CompanySettingSerializer(setting).data)

    def patch(self, request):
        serializer = CompanySettingSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        setting = CompanySettingService.update_settings(serializer.validated_data)
        return success_response(
            CompanySettingSerializer(setting).data, "Settings updated successfully."
        )

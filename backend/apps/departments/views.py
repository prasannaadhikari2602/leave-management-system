from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole
from apps.common.responses import paginated_response, parse_bool, success_response

from .serializers import DepartmentSerializer
from .services import DepartmentService


class AdminWriteMixin:
    """Anyone signed in can read; only admins can change."""

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]


class DepartmentListCreateView(AdminWriteMixin, APIView):
    def get(self, request):
        departments = DepartmentService.list_departments(
            search=request.query_params.get("search", "").strip(),
            is_active=parse_bool(request.query_params.get("is_active")),
            ordering=request.query_params.get("ordering", "name"),
        )
        return paginated_response(
            request, departments, DepartmentSerializer, "Departments retrieved successfully."
        )

    def post(self, request):
        serializer = DepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.create_department(serializer.validated_data)
        return success_response(
            DepartmentSerializer(department).data,
            "Department created successfully.",
            status_code=201,
        )


class DepartmentDetailView(AdminWriteMixin, APIView):
    def get(self, request, department_id):
        department = DepartmentService.get_department(department_id)
        return success_response(DepartmentSerializer(department).data)

    def _update(self, request, department_id, partial):
        department = DepartmentService.get_department(department_id)
        serializer = DepartmentSerializer(department, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = DepartmentService.update_department(department_id, serializer.validated_data)
        return success_response(DepartmentSerializer(updated).data, "Department updated successfully.")

    def put(self, request, department_id):
        return self._update(request, department_id, partial=False)

    def patch(self, request, department_id):
        return self._update(request, department_id, partial=True)

    def delete(self, request, department_id):
        DepartmentService.delete_department(department_id)
        return success_response(message="Department deleted successfully.")

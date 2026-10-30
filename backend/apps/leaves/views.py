from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.constants import LeaveStatus
from apps.common.permissions import IsAdminOrManager, IsAdminRole
from apps.common.responses import paginated_response, parse_bool, success_response

from .serializers import (
    AllocateYearSerializer,
    ApplyLeaveSerializer,
    CalendarEntrySerializer,
    CalendarQuerySerializer,
    LeaveBalanceSerializer,
    LeavePolicySerializer,
    LeaveRequestDetailSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
    ReviewSerializer,
    UpdateEntitlementSerializer,
)
from .services import (
    LeaveBalanceService,
    LeavePolicyService,
    LeaveRequestService,
    LeaveTypeService,
)


class AdminWriteMixin:
    """Anyone signed in can read; only admins can change."""

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]


def _int(value):
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def request_filters(params):
    """Query-string filters shared by every leave request list."""
    return {
        "status": params.get("status") or None,
        "leave_type_id": _int(params.get("leave_type")),
        "date_from": params.get("date_from") or None,
        "date_to": params.get("date_to") or None,
    }


# ---------------------------------------------------------------------------
# Leave types
# ---------------------------------------------------------------------------

class LeaveTypeListCreateView(AdminWriteMixin, APIView):
    def get(self, request):
        leave_types = LeaveTypeService.list_leave_types(
            search=request.query_params.get("search", "").strip(),
            is_active=parse_bool(request.query_params.get("is_active")),
        )
        return paginated_response(request, leave_types, LeaveTypeSerializer)

    def post(self, request):
        serializer = LeaveTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_type = LeaveTypeService.create_leave_type(serializer.validated_data)
        return success_response(
            LeaveTypeSerializer(leave_type).data, "Leave type created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class LeaveTypeDetailView(AdminWriteMixin, APIView):
    def get(self, request, leave_type_id):
        return success_response(LeaveTypeSerializer(LeaveTypeService.get_leave_type(leave_type_id)).data)

    def _update(self, request, leave_type_id, partial):
        leave_type = LeaveTypeService.get_leave_type(leave_type_id)
        serializer = LeaveTypeSerializer(leave_type, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = LeaveTypeService.update_leave_type(leave_type_id, serializer.validated_data)
        return success_response(LeaveTypeSerializer(updated).data, "Leave type updated successfully.")

    def put(self, request, leave_type_id):
        return self._update(request, leave_type_id, partial=False)

    def patch(self, request, leave_type_id):
        return self._update(request, leave_type_id, partial=True)

    def delete(self, request, leave_type_id):
        LeaveTypeService.delete_leave_type(leave_type_id)
        return success_response(message="Leave type deleted successfully.")


# ---------------------------------------------------------------------------
# Leave policies
# ---------------------------------------------------------------------------

class LeavePolicyListCreateView(AdminWriteMixin, APIView):
    def get(self, request):
        policies = LeavePolicyService.list_policies(parse_bool(request.query_params.get("is_active")))
        return paginated_response(request, policies, LeavePolicySerializer)

    def post(self, request):
        serializer = LeavePolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = LeavePolicyService.create_policy(serializer.validated_data)
        return success_response(
            LeavePolicySerializer(policy).data, "Leave policy created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class LeavePolicyDetailView(AdminWriteMixin, APIView):
    def get(self, request, policy_id):
        return success_response(LeavePolicySerializer(LeavePolicyService.get_policy(policy_id)).data)

    def _update(self, request, policy_id, partial):
        policy = LeavePolicyService.get_policy(policy_id)
        serializer = LeavePolicySerializer(policy, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = LeavePolicyService.update_policy(policy_id, serializer.validated_data)
        return success_response(LeavePolicySerializer(updated).data, "Leave policy updated successfully.")

    def put(self, request, policy_id):
        return self._update(request, policy_id, partial=False)

    def patch(self, request, policy_id):
        return self._update(request, policy_id, partial=True)

    def delete(self, request, policy_id):
        LeavePolicyService.delete_policy(policy_id)
        return success_response(message="Leave policy deleted successfully.")


# ---------------------------------------------------------------------------
# Leave balances
# ---------------------------------------------------------------------------

class MyLeaveBalanceView(APIView):
    def get(self, request):
        balances = LeaveBalanceService.list_my_balances(request.user, _int(request.query_params.get("year")))
        return success_response(LeaveBalanceSerializer(balances, many=True).data)


class AllLeaveBalanceView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        params = request.query_params
        balances = LeaveBalanceService.list_all_balances(
            year=_int(params.get("year")),
            user_id=_int(params.get("user")),
            leave_type_id=_int(params.get("leave_type")),
            department_id=_int(params.get("department")),
            search=params.get("search", "").strip(),
        )
        return paginated_response(request, balances, LeaveBalanceSerializer)


class LeaveBalanceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, balance_id):
        serializer = UpdateEntitlementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        balance = LeaveBalanceService.update_entitlement(
            balance_id, serializer.validated_data["entitled_days"]
        )
        return success_response(LeaveBalanceSerializer(balance).data, "Entitlement updated successfully.")


class AllocateBalancesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = AllocateYearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = LeaveBalanceService.allocate_year(serializer.validated_data["year"])
        return success_response({"created": created}, f"{created} balance record(s) created.")


# ---------------------------------------------------------------------------
# Leave requests
# ---------------------------------------------------------------------------

class MyLeaveRequestListCreateView(APIView):
    """GET: my requests. POST: apply for leave."""

    def get(self, request):
        queryset = LeaveRequestService.my_requests(request.user, **request_filters(request.query_params))
        return paginated_response(request, queryset, LeaveRequestSerializer)

    def post(self, request):
        serializer = ApplyLeaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = LeaveRequestService.apply(request.user, serializer.validated_data)
        return success_response(
            LeaveRequestSerializer(leave_request).data,
            "Leave request submitted successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class ReviewQueueView(APIView):
    """Requests assigned to the signed-in manager/admin."""

    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def get(self, request):
        queryset = LeaveRequestService.review_queue(
            request.user,
            search=request.query_params.get("search", "").strip(),
            **request_filters(request.query_params),
        )
        return paginated_response(request, queryset, LeaveRequestSerializer)


class AllLeaveRequestListView(APIView):
    """Company-wide, read-only view for admins."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        params = request.query_params
        queryset = LeaveRequestService.all_requests(
            search=params.get("search", "").strip(),
            department_id=_int(params.get("department")),
            employee_id=_int(params.get("employee")),
            **request_filters(params),
        )
        return paginated_response(request, queryset, LeaveRequestSerializer)


class LeaveRequestDetailView(APIView):
    def get(self, request, request_id):
        leave_request = LeaveRequestService.get_request(request.user, request_id)
        return success_response(LeaveRequestDetailSerializer(leave_request).data)


class CancelLeaveRequestView(APIView):
    def post(self, request, request_id):
        leave_request = LeaveRequestService.cancel(request.user, request_id)
        return success_response(LeaveRequestSerializer(leave_request).data, "Leave request cancelled.")


class _ReviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrManager]
    decision = None
    message = ""

    def post(self, request, request_id):
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = LeaveRequestService.review(
            request.user, request_id, self.decision, serializer.validated_data["comment"]
        )
        return success_response(LeaveRequestSerializer(leave_request).data, self.message)


class ApproveLeaveRequestView(_ReviewView):
    decision = LeaveStatus.APPROVED
    message = "Leave request approved."


class RejectLeaveRequestView(_ReviewView):
    decision = LeaveStatus.REJECTED
    message = "Leave request rejected."


class LeaveCalendarView(APIView):
    def get(self, request):
        query = CalendarQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        entries = LeaveRequestService.calendar(
            request.user, data["start"], data["end"], data.get("department")
        )
        return success_response(CalendarEntrySerializer(entries, many=True).data)

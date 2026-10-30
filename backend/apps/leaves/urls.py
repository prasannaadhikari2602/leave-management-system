from django.urls import path

from . import views

urlpatterns = [
    # Leave types & policies (admin write, everyone read)
    path("leave-types/", views.LeaveTypeListCreateView.as_view(), name="leave-type-list-create"),
    path("leave-types/<int:leave_type_id>/", views.LeaveTypeDetailView.as_view(), name="leave-type-detail"),
    path("leave-policies/", views.LeavePolicyListCreateView.as_view(), name="leave-policy-list-create"),
    path("leave-policies/<int:policy_id>/", views.LeavePolicyDetailView.as_view(), name="leave-policy-detail"),

    # Balances
    path("balances/", views.MyLeaveBalanceView.as_view(), name="my-balances"),
    path("balances/all/", views.AllLeaveBalanceView.as_view(), name="all-balances"),
    path("balances/allocate/", views.AllocateBalancesView.as_view(), name="allocate-balances"),
    path("balances/<int:balance_id>/", views.LeaveBalanceDetailView.as_view(), name="balance-detail"),

    # Requests
    path("requests/", views.MyLeaveRequestListCreateView.as_view(), name="my-requests"),
    path("requests/review/", views.ReviewQueueView.as_view(), name="review-queue"),
    path("requests/all/", views.AllLeaveRequestListView.as_view(), name="all-requests"),
    path("requests/<int:request_id>/", views.LeaveRequestDetailView.as_view(), name="request-detail"),
    path("requests/<int:request_id>/cancel/", views.CancelLeaveRequestView.as_view(), name="request-cancel"),
    path("requests/<int:request_id>/approve/", views.ApproveLeaveRequestView.as_view(), name="request-approve"),
    path("requests/<int:request_id>/reject/", views.RejectLeaveRequestView.as_view(), name="request-reject"),

    # Calendar
    path("calendar/", views.LeaveCalendarView.as_view(), name="leave-calendar"),
]

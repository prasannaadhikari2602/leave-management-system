import type {
  CalendarEntry, LeaveBalance, LeavePolicy, LeaveRequest, LeaveStatus, LeaveType,
  ListParams, Paginated,
} from "../types";
import { baseApi, cleanParams, unwrap, unwrapPage, type ApiEnvelope, type PagedEnvelope } from "./baseApi";

export interface LeaveTypeBody { name: string; description: string; is_active: boolean }
export interface LeavePolicyBody {
  leave_type: number;
  annual_entitlement: number;
  max_consecutive_days: number;
  half_day_allowed: boolean;
  approval_required: boolean;
  is_active: boolean;
}
export interface ApplyLeaveBody {
  leave_type: number;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
}
export interface RequestListParams extends ListParams {
  status?: LeaveStatus | "";
  leave_type?: number;
  department?: number;
  employee?: number;
  date_from?: string;
  date_to?: string;
}
export interface BalanceListParams extends ListParams {
  year?: number;
  user?: number;
  leave_type?: number;
  department?: number;
}

// Anything that changes a request also changes balances, notifications and dashboards.
const REQUEST_TAGS = ["Request", "Balance", "Notification", "Dashboard", "Calendar", "Report"] as const;

export const leavesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ---- leave types ---------------------------------------------------
    listLeaveTypes: build.query<Paginated<LeaveType>, (ListParams & { is_active?: boolean }) | void>({
      query: (params) => ({ url: "/leaves/leave-types/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeaveType>) => unwrapPage(r),
      providesTags: ["LeaveType"],
    }),
    createLeaveType: build.mutation<LeaveType, LeaveTypeBody>({
      query: (body) => ({ url: "/leaves/leave-types/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<LeaveType>) => unwrap(r),
      invalidatesTags: ["LeaveType"],
    }),
    updateLeaveType: build.mutation<LeaveType, { id: number; body: Partial<LeaveTypeBody> }>({
      query: ({ id, body }) => ({ url: `/leaves/leave-types/${id}/`, method: "PATCH", body }),
      transformResponse: (r: ApiEnvelope<LeaveType>) => unwrap(r),
      invalidatesTags: ["LeaveType", "LeavePolicy"],
    }),
    deleteLeaveType: build.mutation<void, number>({
      query: (id) => ({ url: `/leaves/leave-types/${id}/`, method: "DELETE" }),
      transformResponse: () => undefined,
      invalidatesTags: ["LeaveType", "LeavePolicy", "Balance"],
    }),

    // ---- leave policies ------------------------------------------------
    listLeavePolicies: build.query<Paginated<LeavePolicy>, ListParams | void>({
      query: (params) => ({ url: "/leaves/leave-policies/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeavePolicy>) => unwrapPage(r),
      providesTags: ["LeavePolicy"],
    }),
    createLeavePolicy: build.mutation<LeavePolicy, LeavePolicyBody>({
      query: (body) => ({ url: "/leaves/leave-policies/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<LeavePolicy>) => unwrap(r),
      invalidatesTags: ["LeavePolicy", "LeaveType", "Balance"],
    }),
    updateLeavePolicy: build.mutation<LeavePolicy, { id: number; body: Partial<LeavePolicyBody> }>({
      query: ({ id, body }) => ({ url: `/leaves/leave-policies/${id}/`, method: "PATCH", body }),
      transformResponse: (r: ApiEnvelope<LeavePolicy>) => unwrap(r),
      invalidatesTags: ["LeavePolicy", "LeaveType", "Balance", "Dashboard"],
    }),
    deleteLeavePolicy: build.mutation<void, number>({
      query: (id) => ({ url: `/leaves/leave-policies/${id}/`, method: "DELETE" }),
      transformResponse: () => undefined,
      invalidatesTags: ["LeavePolicy", "LeaveType"],
    }),

    // ---- balances ------------------------------------------------------
    getMyBalances: build.query<LeaveBalance[], { year?: number } | void>({
      query: (params) => ({ url: "/leaves/balances/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: ApiEnvelope<LeaveBalance[]>) => unwrap(r),
      providesTags: ["Balance"],
    }),
    listAllBalances: build.query<Paginated<LeaveBalance>, BalanceListParams | void>({
      query: (params) => ({ url: "/leaves/balances/all/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeaveBalance>) => unwrapPage(r),
      providesTags: ["Balance"],
    }),
    updateEntitlement: build.mutation<LeaveBalance, { id: number; entitled_days: number }>({
      query: ({ id, entitled_days }) => ({ url: `/leaves/balances/${id}/`, method: "PATCH", body: { entitled_days } }),
      transformResponse: (r: ApiEnvelope<LeaveBalance>) => unwrap(r),
      invalidatesTags: ["Balance", "Dashboard"],
    }),
    allocateBalances: build.mutation<{ created: number; message: string }, { year: number }>({
      query: (body) => ({ url: "/leaves/balances/allocate/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<{ created: number }>) => ({ ...r.data, message: r.message }),
      invalidatesTags: ["Balance"],
    }),

    // ---- requests ------------------------------------------------------
    listMyRequests: build.query<Paginated<LeaveRequest>, RequestListParams | void>({
      query: (params) => ({ url: "/leaves/requests/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeaveRequest>) => unwrapPage(r),
      providesTags: ["Request"],
    }),
    listReviewQueue: build.query<Paginated<LeaveRequest>, RequestListParams | void>({
      query: (params) => ({ url: "/leaves/requests/review/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeaveRequest>) => unwrapPage(r),
      providesTags: ["Request"],
    }),
    listAllRequests: build.query<Paginated<LeaveRequest>, RequestListParams | void>({
      query: (params) => ({ url: "/leaves/requests/all/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<LeaveRequest>) => unwrapPage(r),
      providesTags: ["Request"],
    }),
    getRequest: build.query<LeaveRequest, number>({
      query: (id) => `/leaves/requests/${id}/`,
      transformResponse: (r: ApiEnvelope<LeaveRequest>) => unwrap(r),
      providesTags: (_r, _e, id) => [{ type: "Request", id }, "Request"],
    }),
    applyLeave: build.mutation<LeaveRequest, ApplyLeaveBody>({
      query: (body) => ({ url: "/leaves/requests/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<LeaveRequest>) => unwrap(r),
      invalidatesTags: [...REQUEST_TAGS],
    }),
    cancelRequest: build.mutation<LeaveRequest, number>({
      query: (id) => ({ url: `/leaves/requests/${id}/cancel/`, method: "POST" }),
      transformResponse: (r: ApiEnvelope<LeaveRequest>) => unwrap(r),
      invalidatesTags: [...REQUEST_TAGS],
    }),
    approveRequest: build.mutation<LeaveRequest, { id: number; comment?: string }>({
      query: ({ id, comment }) => ({ url: `/leaves/requests/${id}/approve/`, method: "POST", body: { comment: comment ?? "" } }),
      transformResponse: (r: ApiEnvelope<LeaveRequest>) => unwrap(r),
      invalidatesTags: [...REQUEST_TAGS],
    }),
    rejectRequest: build.mutation<LeaveRequest, { id: number; comment?: string }>({
      query: ({ id, comment }) => ({ url: `/leaves/requests/${id}/reject/`, method: "POST", body: { comment: comment ?? "" } }),
      transformResponse: (r: ApiEnvelope<LeaveRequest>) => unwrap(r),
      invalidatesTags: [...REQUEST_TAGS],
    }),

    // ---- calendar ------------------------------------------------------
    getCalendar: build.query<CalendarEntry[], { start: string; end: string; department?: number }>({
      query: (params) => ({ url: "/leaves/calendar/", params: cleanParams(params) }),
      transformResponse: (r: ApiEnvelope<CalendarEntry[]>) => unwrap(r),
      providesTags: ["Calendar"],
    }),
  }),
});

export const {
  useListLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useListLeavePoliciesQuery,
  useCreateLeavePolicyMutation,
  useUpdateLeavePolicyMutation,
  useDeleteLeavePolicyMutation,
  useGetMyBalancesQuery,
  useListAllBalancesQuery,
  useUpdateEntitlementMutation,
  useAllocateBalancesMutation,
  useListMyRequestsQuery,
  useListReviewQueueQuery,
  useListAllRequestsQuery,
  useGetRequestQuery,
  useApplyLeaveMutation,
  useCancelRequestMutation,
  useApproveRequestMutation,
  useRejectRequestMutation,
  useGetCalendarQuery,
} = leavesApi;

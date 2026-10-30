import type { AdminSummary, CompanySettings, Dashboard, LeaveUsageReport } from "../types";
import { baseApi, cleanParams, unwrap, type ApiEnvelope } from "./baseApi";

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboard: build.query<Dashboard, void>({
      query: () => "/reports/dashboard/",
      transformResponse: (r: ApiEnvelope<Dashboard>) => unwrap(r),
      providesTags: ["Dashboard"],
    }),
    getSummary: build.query<AdminSummary, { year?: number } | void>({
      query: (params) => ({ url: "/reports/summary/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: ApiEnvelope<AdminSummary>) => unwrap(r),
      providesTags: ["Report"],
    }),
    getLeaveUsage: build.query<LeaveUsageReport, { year?: number } | void>({
      query: (params) => ({ url: "/reports/leave-usage/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: ApiEnvelope<LeaveUsageReport>) => unwrap(r),
      providesTags: ["Report"],
    }),
    getSettings: build.query<CompanySettings, void>({
      query: () => "/settings/",
      transformResponse: (r: ApiEnvelope<CompanySettings>) => unwrap(r),
      providesTags: ["Settings"],
    }),
    updateSettings: build.mutation<CompanySettings, Partial<Omit<CompanySettings, "updated_at">>>({
      query: (body) => ({ url: "/settings/", method: "PATCH", body }),
      transformResponse: (r: ApiEnvelope<CompanySettings>) => unwrap(r),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetSummaryQuery,
  useGetLeaveUsageQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = reportsApi;

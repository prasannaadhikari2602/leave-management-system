import type { AppNotification, ListParams, Paginated } from "../types";
import { baseApi, cleanParams, unwrap, unwrapPage, type ApiEnvelope, type PagedEnvelope } from "./baseApi";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<Paginated<AppNotification>, (ListParams & { is_read?: boolean }) | void>({
      query: (params) => ({ url: "/notifications/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<AppNotification>) => unwrapPage(r),
      providesTags: ["Notification"],
    }),
    getUnreadCount: build.query<number, void>({
      query: () => "/notifications/unread-count/",
      transformResponse: (r: ApiEnvelope<{ unread_count: number }>) => unwrap(r).unread_count,
      providesTags: ["Notification"],
    }),
    markNotificationRead: build.mutation<AppNotification, number>({
      query: (id) => ({ url: `/notifications/${id}/read/`, method: "POST" }),
      transformResponse: (r: ApiEnvelope<AppNotification>) => unwrap(r),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: "/notifications/read-all/", method: "POST" }),
      transformResponse: () => undefined,
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;

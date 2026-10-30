import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { sessionExpired } from "../features/sessionActions";
import type { ApiError } from "../lib/errors";
import type { Paginated, Pagination } from "../types";

/** Every backend response is wrapped as { success, message, data }. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedEnvelope<T> extends ApiEnvelope<T[]> {
  pagination: Pagination;
}

export const unwrap = <T>(response: ApiEnvelope<T>): T => response.data;

export const unwrapPage = <T>(response: PagedEnvelope<T>): Paginated<T> => ({
  data: response.data,
  pagination: response.pagination,
});

/** Drop empty filters so they are not sent as `?search=`. */
export function cleanParams(params?: object): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include", // send the HttpOnly auth cookies
});

// Endpoints where a 401 means "wrong credentials", not "session expired".
const SKIP_REAUTH = [
  "/auth/login/",
  "/auth/refresh/",
  "/auth/logout/",
  "/auth/set-password/",
  "/auth/forgot-password/",
];

function normalizeError(error: FetchBaseQueryError): ApiError {
  if (error.status === "FETCH_ERROR") {
    return { status: error.status, message: "Cannot reach the server. Check your connection and try again." };
  }
  if (error.status === "PARSING_ERROR" || error.status === "TIMEOUT_ERROR" || error.status === "CUSTOM_ERROR") {
    return { status: error.status, message: "The server returned an unexpected response." };
  }
  const data = error.data as { message?: string; errors?: ApiError["errors"] } | undefined;
  return {
    status: error.status,
    message: data?.message ?? "Request failed.",
    errors: data?.errors,
  };
}

// One refresh at a time, even if several requests fail together.
let refreshInFlight: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (args, api, extra) => {
  const url = typeof args === "string" ? args : args.url;
  let result = await rawBaseQuery(args, api, extra);

  if (result.error?.status === 401 && !SKIP_REAUTH.includes(url)) {
    refreshInFlight ??= (async () => {
      const refresh = await rawBaseQuery({ url: "/auth/refresh/", method: "POST" }, api, extra);
      return !refresh.error;
    })().finally(() => {
      refreshInFlight = null;
    });

    if (await refreshInFlight) {
      result = await rawBaseQuery(args, api, extra); // retry once with the new cookie
    } else {
      api.dispatch(sessionExpired());
    }
  }

  return result.error ? { error: normalizeError(result.error) } : { data: result.data };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Me", "User", "Team", "Department", "LeaveType", "LeavePolicy", "Balance",
    "Request", "Calendar", "Notification", "Dashboard", "Report", "Settings",
  ],
  endpoints: () => ({}),
});

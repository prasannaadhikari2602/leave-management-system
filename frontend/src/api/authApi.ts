import type { User } from "../types";
import { baseApi, unwrap, type ApiEnvelope } from "./baseApi";

export interface LoginBody { email: string; password: string }
export interface SetPasswordBody { uid: string; token: string; password: string; confirm_password: string }
export interface ChangePasswordBody { current_password: string; new_password: string; confirm_password: string }

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<{ user: User }, LoginBody>({
      query: (body) => ({ url: "/auth/login/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<{ user: User }>) => unwrap(r),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout/", method: "POST" }),
      transformResponse: () => undefined,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Throw away every cached response so the next user starts clean.
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    getMe: build.query<User, void>({
      query: () => "/auth/me/",
      transformResponse: (r: ApiEnvelope<User>) => unwrap(r),
      providesTags: ["Me"],
    }),
    setPassword: build.mutation<string, SetPasswordBody>({
      query: (body) => ({ url: "/auth/set-password/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<null>) => r.message,
    }),
    forgotPassword: build.mutation<string, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<null>) => r.message,
    }),
    changePassword: build.mutation<string, ChangePasswordBody>({
      query: (body) => ({ url: "/auth/change-password/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<null>) => r.message,
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useSetPasswordMutation,
  useForgotPasswordMutation,
  useChangePasswordMutation,
} = authApi;

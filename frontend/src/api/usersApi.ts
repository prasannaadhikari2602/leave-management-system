import type { ListParams, Paginated, Role, User } from "../types";
import { baseApi, cleanParams, unwrap, unwrapPage, type ApiEnvelope, type PagedEnvelope } from "./baseApi";

export interface UserListParams extends ListParams {
  role?: string; // "manager" or "manager,admin"
  department?: number;
  is_active?: boolean;
  reporting_manager?: number;
}

export interface CreateUserBody {
  full_name: string;
  email: string;
  role: Exclude<Role, "admin">;
  department: number;
  reporting_manager: number | null;
}

export interface UpdateUserBody {
  full_name?: string;
  role?: Exclude<Role, "admin">;
  department?: number;
  reporting_manager?: number | null;
  is_active?: boolean;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<Paginated<User>, UserListParams | void>({
      query: (params) => ({ url: "/users/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<User>) => unwrapPage(r),
      providesTags: ["User"],
    }),
    myTeam: build.query<Paginated<User>, ListParams | void>({
      query: (params) => ({ url: "/users/my-team/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<User>) => unwrapPage(r),
      providesTags: ["Team", "User"],
    }),
    createUser: build.mutation<{ user: User; invite_sent: boolean; message: string }, CreateUserBody>({
      query: (body) => ({ url: "/users/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<{ user: User; invite_sent: boolean }>) => ({ ...r.data, message: r.message }),
      invalidatesTags: ["User", "Team", "Department", "Balance", "Report", "Dashboard"],
    }),
    updateUser: build.mutation<User, { id: number; body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: `/users/${id}/`, method: "PATCH", body }),
      transformResponse: (r: ApiEnvelope<User>) => unwrap(r),
      invalidatesTags: ["User", "Team", "Department", "Request", "Report", "Dashboard"],
    }),
    deleteUser: build.mutation<void, number>({
      query: (id) => ({ url: `/users/${id}/`, method: "DELETE" }),
      transformResponse: () => undefined,
      invalidatesTags: ["User", "Team", "Department", "Balance", "Report", "Dashboard"],
    }),
    resendInvite: build.mutation<string, number>({
      query: (id) => ({ url: `/users/${id}/resend-invite/`, method: "POST" }),
      transformResponse: (r: ApiEnvelope<null>) => r.message,
    }),
  }),
});

export const {
  useListUsersQuery,
  useMyTeamQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useResendInviteMutation,
} = usersApi;

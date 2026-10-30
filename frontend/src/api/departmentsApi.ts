import type { Department, ListParams, Paginated } from "../types";
import { baseApi, cleanParams, unwrap, unwrapPage, type ApiEnvelope, type PagedEnvelope } from "./baseApi";

export interface DepartmentBody {
  name: string;
  description: string;
  is_active: boolean;
}

export const departmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listDepartments: build.query<Paginated<Department>, (ListParams & { is_active?: boolean }) | void>({
      query: (params) => ({ url: "/departments/", params: cleanParams(params ?? undefined) }),
      transformResponse: (r: PagedEnvelope<Department>) => unwrapPage(r),
      providesTags: ["Department"],
    }),
    createDepartment: build.mutation<Department, DepartmentBody>({
      query: (body) => ({ url: "/departments/", method: "POST", body }),
      transformResponse: (r: ApiEnvelope<Department>) => unwrap(r),
      invalidatesTags: ["Department", "Report"],
    }),
    updateDepartment: build.mutation<Department, { id: number; body: Partial<DepartmentBody> }>({
      query: ({ id, body }) => ({ url: `/departments/${id}/`, method: "PATCH", body }),
      transformResponse: (r: ApiEnvelope<Department>) => unwrap(r),
      invalidatesTags: ["Department", "User", "Report"],
    }),
    deleteDepartment: build.mutation<void, number>({
      query: (id) => ({ url: `/departments/${id}/`, method: "DELETE" }),
      transformResponse: () => undefined,
      invalidatesTags: ["Department", "Report"],
    }),
  }),
});

export const {
  useListDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} = departmentsApi;

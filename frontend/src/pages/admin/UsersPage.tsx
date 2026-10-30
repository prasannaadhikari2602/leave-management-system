import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiEdit2, FiMail, FiPlus, FiPower, FiTrash2 } from "react-icons/fi";
import { useListDepartmentsQuery } from "../../api/departmentsApi";
import {
  useCreateUserMutation, useDeleteUserMutation, useListUsersQuery, useResendInviteMutation, useUpdateUserMutation,
} from "../../api/usersApi";
import {
  ActiveBadge, Button, Card, Checkbox, ConfirmDialog, DataTable, Modal, PageHeader, Pagination, SearchInput, SelectInput, TextInput,
} from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/format";
import { userSchema, type UserForm } from "../../schemas/organization";
import type { User } from "../../types";

type ManagedRole = "manager" | "employee";

function UserModal({ user, role, open, onClose }: { user: User | null; role: ManagedRole; open: boolean; onClose: () => void }) {
  const [create, createState] = useCreateUserMutation();
  const [update, updateState] = useUpdateUserMutation();
  const { data: departments } = useListDepartmentsQuery({ page_size: 100, is_active: true });
  const { data: approvers } = useListUsersQuery({ role: "manager,admin", is_active: true, page_size: 100 });

  const { register, handleSubmit, reset, watch, setError, setValue, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { full_name: "", email: "", role, department: "", reporting_manager: "", is_active: true },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      user
        ? {
            full_name: user.full_name, email: user.email, role: user.role as ManagedRole,
            department: user.department ? String(user.department) : "",
            reporting_manager: user.reporting_manager ? String(user.reporting_manager) : "",
            is_active: user.is_active,
          }
        : { full_name: "", email: "", role, department: "", reporting_manager: "", is_active: true },
    );
  }, [open, user, role, reset]);

  const selectedRole = watch("role");
  // Managers report to an admin; employees report to a manager or an admin.
  const managerOptions = (approvers?.data ?? []).filter(
    (u) => u.id !== user?.id && (selectedRole === "manager" ? u.role === "admin" : true),
  );

  useEffect(() => {
    const current = watch("reporting_manager");
    if (current && !managerOptions.some((m) => String(m.id) === current)) setValue("reporting_manager", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, approvers]);

  const onSubmit = async (values: UserForm) => {
    const body = {
      full_name: values.full_name,
      role: values.role,
      department: Number(values.department),
      reporting_manager: values.reporting_manager ? Number(values.reporting_manager) : null,
    };
    try {
      if (user) {
        await update({ id: user.id, body: { ...body, is_active: values.is_active } }).unwrap();
        toast.success("User updated");
      } else {
        const result = await create({ ...body, email: values.email }).unwrap();
        result.invite_sent ? toast.success(result.message) : toast(result.message, { icon: "⚠️" });
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["full_name", "email", "role", "department", "reporting_manager", "is_active"])) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.full_name}` : `New ${role}`}
      description={user ? undefined : "They will receive an email to set their own password."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={createState.isLoading || updateState.isLoading} onClick={handleSubmit(onSubmit)}>{user ? "Save changes" : "Create & invite"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <TextInput wrapperClassName="sm:col-span-2" label="Full name" required error={errors.full_name?.message} {...register("full_name")} />
        <TextInput wrapperClassName="sm:col-span-2" label="Email" type="email" required disabled={!!user} error={errors.email?.message} {...register("email")} />
        <SelectInput label="Role" required error={errors.role?.message} {...register("role")}>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </SelectInput>
        <SelectInput label="Department" required error={errors.department?.message} {...register("department")}>
          <option value="">Select…</option>
          {departments?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </SelectInput>
        <SelectInput
          wrapperClassName="sm:col-span-2"
          label="Reporting manager"
          required={selectedRole === "employee"}
          hint="This person reviews the user's leave requests. HR staff report to the HR admin."
          error={errors.reporting_manager?.message}
          {...register("reporting_manager")}
        >
          <option value="">{selectedRole === "manager" ? "None (an admin approves)" : "Select…"}</option>
          {managerOptions.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>)}
        </SelectInput>
        {user && <Checkbox className="sm:col-span-2" label="Account active" description="Inactive users cannot sign in." {...register("is_active")} />}
      </form>
    </Modal>
  );
}

export default function UsersPage({ role }: { role: ManagedRole }) {
  const label = role === "manager" ? "Managers" : "Employees";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toggling, setToggling] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const { data: departments } = useListDepartmentsQuery({ page_size: 100 });
  const { data, isFetching, error, refetch } = useListUsersQuery({
    role, page, search, department: department ? Number(department) : undefined,
    is_active: active === "" ? undefined : active === "true",
  });
  const [update, updateState] = useUpdateUserMutation();
  const [remove, removeState] = useDeleteUserMutation();
  const [resend] = useResendInviteMutation();

  // Reset to page 1 and close dialogs when switching between Managers and Employees.
  useEffect(() => { setPage(1); setSearch(""); setDepartment(""); setActive(""); }, [role]);

  const openModal = (u: User | null) => { setEditing(u); setModalOpen(true); };

  const confirmToggle = async () => {
    if (!toggling) return;
    try {
      await update({ id: toggling.id, body: { is_active: !toggling.is_active } }).unwrap();
      toast.success(toggling.is_active ? "User deactivated" : "User activated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id).unwrap();
      toast.success("User deleted");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  const sendInvite = async (u: User) => {
    try {
      toast.success(await resend(u.id).unwrap());
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title={label}
        description={role === "manager" ? "Department managers approve leave for their own team." : "Employees apply for leave and report to a manager."}
        actions={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New {role}</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name or email…" />
        <select aria-label="Department" className="input-base sm:w-48" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
          <option value="">All departments</option>
          {departments?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select aria-label="Status" className="input-base sm:w-40" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(u) => u.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle={`No ${label.toLowerCase()} found`}
          emptyAction={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New {role}</Button>}
          columns={[
            { header: "Name", cell: (u) => <div><p className="font-medium">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
            { header: "Department", cell: (u) => u.department_name ?? "—" },
            { header: "Reports to", cell: (u) => u.reporting_manager_name ?? "—" },
            { header: "Status", cell: (u) => <ActiveBadge active={u.is_active} pendingInvite={!u.is_password_set} /> },
            { header: "Joined", cell: (u) => formatDate(u.date_joined) },
            {
              header: "", className: "text-right",
              cell: (u) => (
                <div className="flex justify-end gap-1">
                  {!u.is_password_set && <Button size="sm" variant="ghost" icon={<FiMail />} title="Resend invitation" aria-label="Resend invitation" onClick={() => sendInvite(u)} />}
                  <Button size="sm" variant="ghost" icon={<FiEdit2 />} title="Edit" aria-label={`Edit ${u.full_name}`} onClick={() => openModal(u)} />
                  {u.is_password_set && <Button size="sm" variant="ghost" icon={<FiPower />} title={u.is_active ? "Deactivate" : "Activate"} aria-label={u.is_active ? "Deactivate" : "Activate"} onClick={() => setToggling(u)} />}
                  <Button size="sm" variant="ghost" className="text-red-600" icon={<FiTrash2 />} title="Delete" aria-label={`Delete ${u.full_name}`} onClick={() => setDeleting(u)} />
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>

      <UserModal open={modalOpen} user={editing} role={role} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!toggling}
        danger={!!toggling?.is_active}
        title={toggling?.is_active ? "Deactivate account?" : "Activate account?"}
        message={toggling?.is_active ? `${toggling?.full_name} will no longer be able to sign in.` : `${toggling?.full_name} will be able to sign in again.`}
        confirmLabel={toggling?.is_active ? "Deactivate" : "Activate"}
        loading={updateState.isLoading}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete user?"
        message={`${deleting?.full_name} will be permanently removed. Users with leave history can only be deactivated.`}
        confirmLabel="Delete"
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

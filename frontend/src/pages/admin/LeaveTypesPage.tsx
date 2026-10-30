import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  useCreateLeaveTypeMutation, useDeleteLeaveTypeMutation, useListLeaveTypesQuery, useUpdateLeaveTypeMutation,
} from "../../api/leavesApi";
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, Modal, PageHeader, Pagination, TextArea, TextInput,
} from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDays } from "../../lib/format";
import { leaveTypeSchema, type LeaveTypeForm } from "../../schemas/leave";
import type { LeaveType } from "../../types";

function LeaveTypeModal({ leaveType, open, onClose }: { leaveType: LeaveType | null; open: boolean; onClose: () => void }) {
  const [create, createState] = useCreateLeaveTypeMutation();
  const [update, updateState] = useUpdateLeaveTypeMutation();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<LeaveTypeForm>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset(leaveType ? { name: leaveType.name, description: leaveType.description, is_active: leaveType.is_active } : { name: "", description: "", is_active: true });
  }, [open, leaveType, reset]);

  const onSubmit = async (values: LeaveTypeForm) => {
    try {
      if (leaveType) await update({ id: leaveType.id, body: values }).unwrap();
      else await create(values).unwrap();
      toast.success(leaveType ? "Leave type updated" : "Leave type created. Now add its rules.");
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["name", "description"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={leaveType ? "Edit leave type" : "New leave type"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={createState.isLoading || updateState.isLoading} onClick={handleSubmit(onSubmit)}>Save</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput label="Name" required placeholder="e.g. Annual Leave" error={errors.name?.message} {...register("name")} />
        <TextArea label="Description" error={errors.description?.message} {...register("description")} />
        <Checkbox label="Active" description="Inactive types cannot be requested." {...register("is_active")} />
      </form>
    </Modal>
  );
}

export default function LeaveTypesPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);
  const { data, isFetching, error, refetch } = useListLeaveTypesQuery({ page });
  const [remove, removeState] = useDeleteLeaveTypeMutation();

  const openModal = (t: LeaveType | null) => { setEditing(t); setModalOpen(true); };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id).unwrap();
      toast.success("Leave type deleted");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Leave types"
        description="The categories of leave your company offers. Set yearly days under Leave Rules."
        actions={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New leave type</Button>}
      />
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(t) => t.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle="No leave types yet"
          emptyAction={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New leave type</Button>}
          columns={[
            { header: "Name", cell: (t) => <div><p className="font-medium">{t.name}</p>{t.description && <p className="max-w-md truncate text-xs text-slate-500">{t.description}</p>}</div> },
            { header: "Days / year", cell: (t) => (t.annual_entitlement ? formatDays(t.annual_entitlement) : <span className="text-amber-700">No rule yet</span>) },
            { header: "Status", cell: (t) => <Badge tone={t.is_active ? "green" : "gray"}>{t.is_active ? "Active" : "Inactive"}</Badge> },
            {
              header: "", className: "text-right",
              cell: (t) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={<FiEdit2 />} aria-label={`Edit ${t.name}`} onClick={() => openModal(t)} />
                  <Button size="sm" variant="ghost" className="text-red-600" icon={<FiTrash2 />} aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)} />
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <LeaveTypeModal open={modalOpen} leaveType={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete leave type?"
        message={`"${deleting?.name}" and its rules will be removed. Types that already have leave requests can only be deactivated.`}
        confirmLabel="Delete"
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

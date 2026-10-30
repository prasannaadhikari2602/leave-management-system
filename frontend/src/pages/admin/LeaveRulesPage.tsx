import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import {
  useCreateLeavePolicyMutation, useDeleteLeavePolicyMutation, useListLeavePoliciesQuery,
  useListLeaveTypesQuery, useUpdateLeavePolicyMutation,
} from "../../api/leavesApi";
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, Modal, PageHeader, Pagination, SelectInput, TextInput,
} from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDays } from "../../lib/format";
import { leavePolicySchema, type LeavePolicyForm } from "../../schemas/leave";
import type { LeavePolicy } from "../../types";

const EMPTY: LeavePolicyForm = {
  leave_type: "", annual_entitlement: 0, max_consecutive_days: 5,
  half_day_allowed: false, approval_required: true, is_active: true,
};

function PolicyModal({ policy, open, onClose }: { policy: LeavePolicy | null; open: boolean; onClose: () => void }) {
  const { data: types } = useListLeaveTypesQuery({ page_size: 100 });
  const [create, createState] = useCreateLeavePolicyMutation();
  const [update, updateState] = useUpdateLeavePolicyMutation();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<LeavePolicyForm>({
    resolver: zodResolver(leavePolicySchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      policy
        ? {
            leave_type: String(policy.leave_type),
            annual_entitlement: Number(policy.annual_entitlement),
            max_consecutive_days: policy.max_consecutive_days,
            half_day_allowed: policy.half_day_allowed,
            approval_required: policy.approval_required,
            is_active: policy.is_active,
          }
        : EMPTY,
    );
  }, [open, policy, reset]);

  const availableTypes = (types?.data ?? []).filter((t) => !t.policy_id || t.id === policy?.leave_type);

  const onSubmit = async (values: LeavePolicyForm) => {
    const body = { ...values, leave_type: Number(values.leave_type) };
    try {
      if (policy) await update({ id: policy.id, body }).unwrap();
      else await create(body).unwrap();
      toast.success(policy ? "Rule updated" : "Rule created");
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["leave_type", "annual_entitlement", "max_consecutive_days"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={policy ? "Edit leave rule" : "New leave rule"}
      description="Changing the yearly days adjusts this year's balances for everyone."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={createState.isLoading || updateState.isLoading} onClick={handleSubmit(onSubmit)}>Save</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <SelectInput wrapperClassName="sm:col-span-2" label="Leave type" required disabled={!!policy} error={errors.leave_type?.message} {...register("leave_type")}>
          <option value="">{availableTypes.length ? "Select…" : "Create a leave type first"}</option>
          {availableTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectInput>
        <TextInput label="Days per year" type="number" step="0.5" min={0} required error={errors.annual_entitlement?.message} {...register("annual_entitlement", { valueAsNumber: true })} />
        <TextInput label="Max consecutive days" type="number" min={1} required error={errors.max_consecutive_days?.message} {...register("max_consecutive_days", { valueAsNumber: true })} />
        <Checkbox className="sm:col-span-2" label="Allow half days" {...register("half_day_allowed")} />
        <Checkbox className="sm:col-span-2" label="Requires approval" description="If off, requests are approved automatically." {...register("approval_required")} />
        <Checkbox className="sm:col-span-2" label="Rule active" {...register("is_active")} />
      </form>
    </Modal>
  );
}

const Yes = ({ on }: { on: boolean }) => (on ? <FiCheck className="text-emerald-600" aria-label="Yes" /> : <FiX className="text-slate-400" aria-label="No" />);

export default function LeaveRulesPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<LeavePolicy | null>(null);
  const { data, isFetching, error, refetch } = useListLeavePoliciesQuery({ page });
  const [remove, removeState] = useDeleteLeavePolicyMutation();

  const openModal = (p: LeavePolicy | null) => { setEditing(p); setModalOpen(true); };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id).unwrap();
      toast.success("Rule deleted");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Leave rules"
        description="Yearly entitlement and limits for each leave type."
        actions={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New rule</Button>}
      />
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(p) => p.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle="No leave rules yet"
          emptyMessage="Add a rule so employees receive a balance for each leave type."
          columns={[
            { header: "Leave type", cell: (p) => <span className="font-medium">{p.leave_type_name}</span> },
            { header: "Days / year", cell: (p) => formatDays(p.annual_entitlement) },
            { header: "Max consecutive", cell: (p) => `${p.max_consecutive_days} days` },
            { header: "Half day", cell: (p) => <Yes on={p.half_day_allowed} /> },
            { header: "Approval", cell: (p) => <Yes on={p.approval_required} /> },
            { header: "Status", cell: (p) => <Badge tone={p.is_active ? "green" : "gray"}>{p.is_active ? "Active" : "Inactive"}</Badge> },
            {
              header: "", className: "text-right",
              cell: (p) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={<FiEdit2 />} aria-label={`Edit ${p.leave_type_name} rule`} onClick={() => openModal(p)} />
                  <Button size="sm" variant="ghost" className="text-red-600" icon={<FiTrash2 />} aria-label={`Delete ${p.leave_type_name} rule`} onClick={() => setDeleting(p)} />
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <PolicyModal open={modalOpen} policy={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete leave rule?"
        message={`Employees will no longer be able to request ${deleting?.leave_type_name}. Existing balances are kept.`}
        confirmLabel="Delete"
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

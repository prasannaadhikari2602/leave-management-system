import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiEdit2, FiRefreshCw } from "react-icons/fi";
import { useListDepartmentsQuery } from "../../api/departmentsApi";
import { useAllocateBalancesMutation, useListAllBalancesQuery, useUpdateEntitlementMutation } from "../../api/leavesApi";
import { Button, Card, DataTable, Modal, PageHeader, Pagination, SearchInput, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDays } from "../../lib/format";
import { allocateSchema, entitlementSchema, type AllocateForm, type EntitlementForm } from "../../schemas/leave";
import type { LeaveBalance } from "../../types";

function EntitlementModal({ balance, onClose }: { balance: LeaveBalance | null; onClose: () => void }) {
  const [update, { isLoading }] = useUpdateEntitlementMutation();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<EntitlementForm>({ resolver: zodResolver(entitlementSchema) });
  useEffect(() => { if (balance) reset({ entitled_days: Number(balance.entitled_days) }); }, [balance, reset]);

  const onSubmit = async (values: EntitlementForm) => {
    if (!balance) return;
    try {
      await update({ id: balance.id, entitled_days: values.entitled_days }).unwrap();
      toast.success("Entitlement updated");
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["entitled_days"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={!!balance}
      onClose={onClose}
      size="sm"
      title="Adjust entitlement"
      description={balance ? `${balance.user_name} · ${balance.leave_type_name} · ${balance.year}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit(onSubmit)}>Save</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput label="Entitled days" type="number" step="0.5" min={0} hint={balance ? `${formatDays(balance.used_days)} days already used.` : undefined} error={errors.entitled_days?.message} {...register("entitled_days", { valueAsNumber: true })} />
      </form>
    </Modal>
  );
}

function AllocateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [allocate, { isLoading }] = useAllocateBalancesMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AllocateForm>({ resolver: zodResolver(allocateSchema), defaultValues: { year: new Date().getFullYear() } });
  useEffect(() => { if (open) reset({ year: new Date().getFullYear() }); }, [open, reset]);

  const onSubmit = async (values: AllocateForm) => {
    try {
      const result = await allocate(values).unwrap();
      toast.success(result.message);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Allocate yearly balances"
      description="Creates missing balances for all active users using the current leave rules. Existing balances are untouched."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit(onSubmit)}>Allocate</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput label="Year" type="number" error={errors.year?.message} {...register("year", { valueAsNumber: true })} />
      </form>
    </Modal>
  );
}

export default function BalancesPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LeaveBalance | null>(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const { data: departments } = useListDepartmentsQuery({ page_size: 100 });
  const { data, isFetching, error, refetch } = useListAllBalancesQuery({ year, search, page, department: department ? Number(department) : undefined });

  return (
    <>
      <PageHeader
        title="Leave balances"
        description="Entitlement and usage for every employee."
        actions={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => setAllocateOpen(true)}>Allocate year</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search employee…" />
        <select aria-label="Department" className="input-base sm:w-48" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
          <option value="">All departments</option>
          {departments?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select aria-label="Year" className="input-base sm:w-28" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
          {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(b) => b.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle="No balances for this year"
          emptyMessage="Use “Allocate year” to create them from your leave rules."
          columns={[
            { header: "Employee", cell: (b) => <span className="font-medium">{b.user_name}</span> },
            { header: "Leave type", cell: (b) => b.leave_type_name },
            { header: "Entitled", cell: (b) => formatDays(b.entitled_days) },
            { header: "Used", cell: (b) => formatDays(b.used_days) },
            { header: "Pending", cell: (b) => formatDays(b.pending_days) },
            { header: "Remaining", cell: (b) => <span className="font-semibold text-navy-800">{formatDays(b.remaining_days)}</span> },
            { header: "", className: "text-right", cell: (b) => <Button size="sm" variant="ghost" icon={<FiEdit2 />} aria-label={`Adjust ${b.user_name} ${b.leave_type_name}`} onClick={() => setEditing(b)} /> },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <EntitlementModal balance={editing} onClose={() => setEditing(null)} />
      <AllocateModal open={allocateOpen} onClose={() => setAllocateOpen(false)} />
    </>
  );
}

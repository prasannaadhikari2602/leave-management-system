import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiInfo } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  useApplyLeaveMutation, useGetMyBalancesQuery, useListLeavePoliciesQuery, useListLeaveTypesQuery,
} from "../../api/leavesApi";
import { useAppSelector } from "../../app/hooks";
import { Button, Card, Checkbox, PageHeader, SelectInput, Spinner, TextArea, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { daysBetween, formatDays, todayISO } from "../../lib/format";
import { applyLeaveSchema, type ApplyLeaveForm } from "../../schemas/leave";

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user);
  const { data: types, isLoading: typesLoading } = useListLeaveTypesQuery({ is_active: true, page_size: 100 });
  const { data: policies } = useListLeavePoliciesQuery({ page_size: 100 });
  const { data: balances } = useGetMyBalancesQuery();
  const [apply, { isLoading }] = useApplyLeaveMutation();

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<ApplyLeaveForm>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: { leave_type: "", start_date: "", end_date: "", is_half_day: false, reason: "" },
  });

  const [typeId, start, end, half] = watch(["leave_type", "start_date", "end_date", "is_half_day"]);
  const policy = policies?.data.find((p) => String(p.leave_type) === typeId && p.is_active);
  const balance = balances?.find((b) => String(b.leave_type) === typeId);
  const days = start && end && end >= start ? (half ? 0.5 : daysBetween(start, end)) : null;
  const available = balance ? Number(balance.remaining_days) - Number(balance.pending_days) : null;

  // Keep a half-day on a single date and the end date from falling behind the start.
  useEffect(() => {
    if (half && start) setValue("end_date", start, { shouldValidate: true });
  }, [half, start, setValue]);
  useEffect(() => {
    if (policy && !policy.half_day_allowed && half) setValue("is_half_day", false);
  }, [policy, half, setValue]);

  const onSubmit = async (values: ApplyLeaveForm) => {
    try {
      await apply({ ...values, leave_type: Number(values.leave_type) }).unwrap();
      toast.success("Leave request submitted");
      navigate("/my-leaves");
    } catch (error) {
      if (!applyServerErrors(error, setError, ["leave_type", "start_date", "end_date", "is_half_day", "reason"])) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  if (typesLoading) return <Spinner />;

  return (
    <>
      <PageHeader title="Apply for leave" description="Your request goes to your reporting manager for approval." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <SelectInput label="Leave type" required error={errors.leave_type?.message} {...register("leave_type")}>
              <option value="">Select a leave type</option>
              {types?.data.filter((t) => t.policy_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectInput>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="From" type="date" required min={todayISO()} error={errors.start_date?.message} {...register("start_date")} />
              <TextInput label="To" type="date" required min={start || todayISO()} disabled={half} error={errors.end_date?.message} {...register("end_date")} />
            </div>

            {policy?.half_day_allowed && (
              <Checkbox label="Half day" description="Counts as 0.5 day on a single date." error={errors.is_half_day?.message} {...register("is_half_day")} />
            )}

            <TextArea label="Reason" required rows={4} placeholder="Briefly explain the reason for your leave" error={errors.reason?.message} {...register("reason")} />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={isLoading}>Submit request</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-sm font-semibold text-black">Request summary</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd className="font-medium">{days !== null ? `${formatDays(days)} day(s)` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Available</dt><dd className="font-medium">{available !== null ? `${formatDays(available)} day(s)` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Approver</dt><dd className="font-medium">{me?.reporting_manager_name ?? "Assigned by HR"}</dd></div>
            </dl>
            {days !== null && available !== null && days > available && (
              <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">This is more than your available balance.</p>
            )}
          </Card>
          {policy && (
            <Card className="bg-navy-50/50">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900"><FiInfo /> {policy.leave_type_name} rules</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                <li>{formatDays(policy.annual_entitlement)} days per year</li>
                <li>Up to {policy.max_consecutive_days} consecutive days</li>
                <li>Half days {policy.half_day_allowed ? "allowed" : "not allowed"}</li>
                <li>{policy.approval_required ? "Needs manager approval" : "Approved automatically"}</li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { FiBriefcase, FiCheckCircle, FiClock, FiDownload, FiUsers, FiXCircle } from "react-icons/fi";
import { useGetLeaveUsageQuery, useGetSummaryQuery } from "../../api/reportsApi";
import { Button, Card, CardHeader, ErrorState, PageHeader, Spinner, StatCard } from "../../components/ui";
import { formatDays } from "../../lib/format";

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-black">{label}</span><span className="font-medium">{value}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-navy-800" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
    </div>
  );
}

export default function ReportsPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const summary = useGetSummaryQuery({ year });
  const usage = useGetLeaveUsageQuery({ year });

  if (summary.isLoading || usage.isLoading) return <Spinner />;
  if (summary.error || usage.error || !summary.data || !usage.data) {
    return <ErrorState error={summary.error ?? usage.error} onRetry={() => { summary.refetch(); usage.refetch(); }} />;
  }
  const s = summary.data;
  const u = usage.data;
  const maxMonth = Math.max(1, ...u.by_month.map((m) => Number(m.days)));
  const maxDept = Math.max(1, ...s.employees_by_department.map((d) => d.total));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Company-wide leave statistics."
        actions={
          <>
            <select aria-label="Year" className="input-base w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <a href={`/api/reports/export/?year=${year}`}><Button variant="secondary" icon={<FiDownload />}>Export CSV</Button></a>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total employees" value={s.total_employees} icon={<FiUsers />} />
        <StatCard label="Departments" value={s.total_departments} icon={<FiBriefcase />} tone="black" />
        <StatCard label="Pending" value={s.pending_requests} icon={<FiClock />} tone="amber" />
        <StatCard label="Approved" value={s.approved_requests} icon={<FiCheckCircle />} tone="green" />
        <StatCard label="Rejected" value={s.rejected_requests} icon={<FiXCircle />} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Employees by department" />
          <div className="space-y-4">
            {s.employees_by_department.map((d) => <Bar key={d.id} label={d.name} value={d.total} max={maxDept} />)}
            {!s.employees_by_department.length && <p className="text-sm text-slate-500">No departments yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title={`Approved leave days by month (${u.year})`} />
          <div className="flex h-44 items-end gap-2" role="img" aria-label="Approved leave days per month">
            {u.by_month.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-slate-500">{Number(m.days) ? formatDays(m.days) : ""}</span>
                <div className="w-full rounded-t bg-navy-800" style={{ height: `${(Number(m.days) / maxMonth) * 100}%`, minHeight: Number(m.days) ? 4 : 0 }} />
                <span className="text-[10px] text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0"><CardHeader title="Leave usage by type" /></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-navy-50/60 text-left text-xs uppercase text-navy-900"><th className="px-5 py-2">Type</th><th className="px-3 py-2">Entitled</th><th className="px-3 py-2">Used</th><th className="px-3 py-2">Remaining</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {u.by_leave_type.map((r) => (
                  <tr key={r.leave_type_name}><td className="px-5 py-2.5 font-medium">{r.leave_type_name}</td><td className="px-3">{formatDays(r.entitled)}</td><td className="px-3">{formatDays(r.used)}</td><td className="px-3">{formatDays(r.remaining)}</td></tr>
                ))}
                {!u.by_leave_type.length && <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-500">No data.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0"><CardHeader title="Approved leave by department" /></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-navy-50/60 text-left text-xs uppercase text-navy-900"><th className="px-5 py-2">Department</th><th className="px-3 py-2">Requests</th><th className="px-3 py-2">Days</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {u.by_department.map((r) => (
                  <tr key={r.department_name}><td className="px-5 py-2.5 font-medium">{r.department_name}</td><td className="px-3">{r.requests}</td><td className="px-3">{formatDays(r.days)}</td></tr>
                ))}
                {!u.by_department.length && <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-500">No approved leave yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

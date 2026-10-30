import { useState } from "react";
import { useGetMyBalancesQuery } from "../../api/leavesApi";
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from "../../components/ui";
import { formatDays } from "../../lib/format";

export default function MyBalancePage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, isLoading, error, refetch } = useGetMyBalancesQuery({ year });

  return (
    <>
      <PageHeader
        title="Leave balance"
        description="Days are deducted when a request is approved."
        actions={
          <select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base w-28">
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />
      {isLoading ? <Spinner /> : error ? <ErrorState error={error} onRetry={refetch} /> : !data?.length ? (
        <Card><EmptyState title="No balances for this year" message="Ask HR to configure leave rules for your account." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => {
            const entitled = Number(b.entitled_days) || 1;
            const usedPct = Math.min(100, (Number(b.used_days) / entitled) * 100);
            const pendingPct = Math.min(100 - usedPct, (Number(b.pending_days) / entitled) * 100);
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-black">{b.leave_type_name}</p>
                  <p className="text-right"><span className="text-3xl font-bold text-navy-800">{formatDays(b.remaining_days)}</span><span className="block text-xs text-slate-500">days left</span></p>
                </div>
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${formatDays(b.used_days)} used of ${formatDays(b.entitled_days)}`}>
                  <div className="bg-navy-800" style={{ width: `${usedPct}%` }} />
                  <div className="bg-amber-400" style={{ width: `${pendingPct}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-3 text-center text-xs">
                  <div><dt className="text-slate-500">Entitled</dt><dd className="text-sm font-semibold">{formatDays(b.entitled_days)}</dd></div>
                  <div><dt className="text-slate-500">Used</dt><dd className="text-sm font-semibold">{formatDays(b.used_days)}</dd></div>
                  <div><dt className="text-slate-500">Pending</dt><dd className="text-sm font-semibold">{formatDays(b.pending_days)}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

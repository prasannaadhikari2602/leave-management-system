import { useState } from "react";
import { useListReviewQueueQuery } from "../../api/leavesApi";
import { useAppSelector } from "../../app/hooks";
import { RequestDetailModal } from "../../components/leave/RequestDetailModal";
import { RequestsTable, STATUS_TABS } from "../../components/leave/RequestsTable";
import { Card, PageHeader, Pagination, SearchInput, Tabs } from "../../components/ui";
import type { LeaveStatus } from "../../types";

/** Requests routed to the signed-in manager (or to the HR admin for HR staff). */
export default function ReviewRequestsPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const [status, setStatus] = useState<LeaveStatus | "">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const { data, isFetching, error, refetch } = useListReviewQueueQuery({ status, search, page });

  return (
    <>
      <PageHeader
        title={role === "admin" ? "HR approvals" : "Team leave requests"}
        description={role === "admin" ? "Leave requests from HR employees and managers who report to you." : "Review leave requests from the people who report to you."}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={STATUS_TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search employee…" />
      </div>
      <Card padded={false}>
        <RequestsTable rows={data?.data} loading={isFetching} error={error} onRetry={refetch} showEmployee onView={setSelected} emptyTitle={status === "pending" ? "No pending requests" : "No requests found"} emptyMessage="You're all caught up." />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <RequestDetailModal requestId={selected} onClose={() => setSelected(null)} />
    </>
  );
}

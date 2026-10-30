import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useListMyRequestsQuery } from "../../api/leavesApi";
import { RequestDetailModal } from "../../components/leave/RequestDetailModal";
import { RequestsTable, STATUS_TABS } from "../../components/leave/RequestsTable";
import { Button, Card, PageHeader, Pagination, Tabs } from "../../components/ui";
import type { LeaveStatus } from "../../types";

export default function MyLeavesPage() {
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const { data, isFetching, error, refetch } = useListMyRequestsQuery({ status, page });

  return (
    <>
      <PageHeader
        title="My leave requests"
        description="Track the status of your requests and cancel eligible leave."
        actions={<Link to="/apply-leave"><Button icon={<FiPlus />}>Apply leave</Button></Link>}
      />
      <div className="mb-4">
        <Tabs tabs={STATUS_TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      </div>
      <Card padded={false}>
        <RequestsTable rows={data?.data} loading={isFetching} error={error} onRetry={refetch} showApprover onView={setSelected} emptyTitle="No leave requests yet" emptyMessage="When you apply for leave it will show up here." />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <RequestDetailModal requestId={selected} onClose={() => setSelected(null)} />
    </>
  );
}

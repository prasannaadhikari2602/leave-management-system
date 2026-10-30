import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { useListDepartmentsQuery } from "../../api/departmentsApi";
import { useListAllRequestsQuery } from "../../api/leavesApi";
import { RequestDetailModal } from "../../components/leave/RequestDetailModal";
import { RequestsTable, STATUS_TABS } from "../../components/leave/RequestsTable";
import { Button, Card, PageHeader, Pagination, SearchInput, Tabs } from "../../components/ui";
import type { LeaveStatus } from "../../types";

/** Company-wide, read-only list. Approvals happen under "HR Approvals". */
export default function AllRequestsPage() {
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const { data: departments } = useListDepartmentsQuery({ page_size: 100 });
  const { data, isFetching, error, refetch } = useListAllRequestsQuery({
    status, search, page, department: department ? Number(department) : undefined,
  });

  return (
    <>
      <PageHeader
        title="All leave requests"
        description="Every request in the company. Each is approved by the employee's own reporting manager."
        actions={<a href={`/api/reports/export/${status ? `?status=${status}` : ""}`}><Button variant="secondary" icon={<FiDownload />}>Export CSV</Button></a>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs tabs={STATUS_TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select aria-label="Department" className="input-base sm:w-44" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {departments?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search employee…" />
        </div>
      </div>
      <Card padded={false}>
        <RequestsTable rows={data?.data} loading={isFetching} error={error} onRetry={refetch} showEmployee showApprover onView={setSelected} />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <RequestDetailModal requestId={selected} onClose={() => setSelected(null)} />
    </>
  );
}

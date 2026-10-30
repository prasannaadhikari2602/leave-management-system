import { useState } from "react";
import { useMyTeamQuery } from "../../api/usersApi";
import { ActiveBadge, Card, DataTable, PageHeader, Pagination, SearchInput } from "../../components/ui";
import { formatDate } from "../../lib/format";

export default function MyTeamPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isFetching, error, refetch } = useMyTeamQuery({ page, search });

  return (
    <>
      <PageHeader title="My team" description="People who report to you." actions={<SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search team…" />} />
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(u) => u.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle="No team members"
          emptyMessage="Nobody reports to you yet. HR assigns reporting managers."
          columns={[
            { header: "Name", cell: (u) => <div><p className="font-medium">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
            { header: "Department", cell: (u) => u.department_name ?? "—" },
            { header: "Status", cell: (u) => <ActiveBadge active={u.is_active} pendingInvite={!u.is_password_set} /> },
            { header: "Joined", cell: (u) => formatDate(u.date_joined) },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}

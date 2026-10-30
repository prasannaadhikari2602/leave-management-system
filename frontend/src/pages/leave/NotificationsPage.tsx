import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import {
  useListNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation,
} from "../../api/notificationsApi";
import { Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, Tabs } from "../../components/ui";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useListNotificationsQuery({ page, ...(filter === "unread" ? { is_read: false } : {}) });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: marking }] = useMarkAllNotificationsReadMutation();

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={<Button variant="secondary" icon={<FiCheck />} loading={marking} onClick={() => markAll()}>Mark all as read</Button>}
      />
      <div className="mb-4">
        <Tabs tabs={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }]} value={filter} onChange={(v) => { setFilter(v); setPage(1); }} />
      </div>
      <Card padded={false}>
        {isLoading ? <Spinner /> : error ? <ErrorState error={error} onRetry={refetch} /> : !data?.data.length ? (
          <EmptyState title="No notifications" message="Updates about your leave requests will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-4 px-5 py-4", !n.is_read && "bg-navy-50/50")}>
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.is_read ? "bg-slate-300" : "bg-navy-700")} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-black">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
              </li>
            ))}
          </ul>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}

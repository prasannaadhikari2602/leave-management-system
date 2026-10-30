import { FiEye } from "react-icons/fi";
import type { LeaveRequest } from "../../types";
import { formatDate, formatDays, formatRange } from "../../lib/format";
import { Button, DataTable, StatusBadge, type Column } from "../ui";

interface Props {
  rows?: LeaveRequest[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  showEmployee?: boolean;
  showApprover?: boolean;
  onView: (id: number) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function RequestsTable({ rows, loading, error, onRetry, showEmployee, showApprover, onView, emptyTitle, emptyMessage }: Props) {
  const columns: Column<LeaveRequest>[] = [
    ...(showEmployee
      ? [{
          header: "Employee",
          cell: (r: LeaveRequest) => (
            <div>
              <p className="font-medium">{r.employee_name}</p>
              <p className="text-xs text-slate-500">{r.department_name ?? "—"}</p>
            </div>
          ),
        }]
      : []),
    { header: "Leave type", cell: (r) => r.leave_type_name },
    { header: "Dates", cell: (r) => <span className="whitespace-nowrap">{formatRange(r.start_date, r.end_date)}</span> },
    { header: "Days", cell: (r) => formatDays(r.total_days) },
    ...(showApprover ? [{ header: "Approver", cell: (r: LeaveRequest) => r.approver_name ?? "—" }] : []),
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { header: "Submitted", cell: (r) => <span className="whitespace-nowrap text-slate-600">{formatDate(r.created_at)}</span> },
    {
      header: "",
      className: "text-right",
      cell: (r) => <Button size="sm" variant="ghost" icon={<FiEye />} onClick={() => onView(r.id)}>View</Button>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle={emptyTitle ?? "No leave requests"}
      emptyMessage={emptyMessage}
    />
  );
}

export const STATUS_TABS = [
  { value: "" as const, label: "All" },
  { value: "pending" as const, label: "Pending" },
  { value: "approved" as const, label: "Approved" },
  { value: "rejected" as const, label: "Rejected" },
  { value: "cancelled" as const, label: "Cancelled" },
];

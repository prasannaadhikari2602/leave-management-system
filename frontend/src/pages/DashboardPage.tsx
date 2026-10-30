
import {
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiSend,
  FiUserCheck,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import { Link } from "react-router-dom";
import { useGetDashboardQuery } from "../api/reportsApi";
import { useAppSelector } from "../app/hooks";

import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui";

import { formatDays, formatRange } from "../lib/format";

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);

  const { data, isLoading, error, refetch } =
    useGetDashboardQuery();

  if (isLoading) return <Spinner />;

  if (error || !data) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const { summary } = data;

  const isAdmin = data.role === "admin";
  const isReviewer = data.role !== "employee";

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title={`Hello, ${user?.full_name.split(" ")[0]}`}
        description={
          isAdmin
            ? "Company-wide overview."
            : data.role === "manager"
              ? "Your team at a glance."
              : "Your leave at a glance."
        }
        actions={
          !isAdmin && (
            <Link to="/apply-leave">
              <Button icon={<FiSend />}>
                Apply leave
              </Button>
            </Link>
          )
        }
      />

      {/* Company Statistics */}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total employees"
            value={summary.total_employees}
            icon={<FiUsers />}
            hint={`${summary.on_leave_today} on leave today`}
          />

          <StatCard
            label="Departments"
            value={summary.total_departments}
            icon={<FiBriefcase />}
            tone="black"
          />

          <StatCard
            label="Pending requests"
            value={summary.pending_requests}
            icon={<FiClock />}
            tone="amber"
            hint={`${summary.year}`}
          />

          <StatCard
            label="Approved / Rejected"
            value={`${summary.approved_requests} / ${summary.rejected_requests}`}
            icon={<FiCheckCircle />}
            tone="green"
            hint={`${summary.year}`}
          />
        </div>
      )}

      {/* Reviewer Statistics */}
      {isReviewer && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Link to="/leave-requests">
            <StatCard
              label="Awaiting your approval"
              value={data.pending_approvals ?? 0}
              icon={<FiClock />}
              tone="amber"
              hint="Click to review"
            />
          </Link>

          <StatCard
            label="Direct reports"
            value={data.team_size ?? 0}
            icon={<FiUserCheck />}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* My Leave Balance - Hidden for Admin */}
        {!isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader
              title={`My leave balance (${data.year})`}
              action={
                <Link
                  to="/my-balance"
                  className="text-sm font-medium text-navy-700 hover:underline"
                >
                  Details
                </Link>
              }
            />

            {/* Leave Balances */}
            {data.my_balances.length === 0 ? (
              <EmptyState
                title="No balances yet"
                message="HR has not configured leave rules for you."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {data.my_balances.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="truncate text-sm text-slate-600">
                      {b.leave_type_name}
                    </p>

                    <p className="mt-1 text-2xl font-bold text-navy-800">
                      {formatDays(b.remaining_days)}

                      <span className="ml-1 text-xs font-normal text-slate-500">
                        / {formatDays(b.entitled_days)} days
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* My Leave Request Statistics */}
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center text-sm">
              <div>
                <p className="flex items-center justify-center gap-1 text-slate-500">
                  <FiClock /> Pending
                </p>
                <p className="text-lg font-bold">
                  {data.my_requests.pending}
                </p>
              </div>

              <div>
                <p className="flex items-center justify-center gap-1 text-slate-500">
                  <FiCheckCircle /> Approved
                </p>
                <p className="text-lg font-bold">
                  {data.my_requests.approved}
                </p>
              </div>

              <div>
                <p className="flex items-center justify-center gap-1 text-slate-500">
                  <FiXCircle /> Rejected
                </p>
                <p className="text-lg font-bold">
                  {data.my_requests.rejected}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Right Sidebar */}
        <div className={`space-y-6 ${isAdmin ? "lg:col-span-3" : ""}`}>

          {/* Upcoming Leave */}
          <Card>
            <CardHeader title="Upcoming leave" />

            {data.upcoming_leaves.length === 0 ? (
              <p className="text-sm text-slate-500">
                No upcoming approved leave.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.upcoming_leaves.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-black">
                        {l.leave_type_name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatRange(l.start_date, l.end_date)}
                      </p>
                    </div>

                    <span className="text-slate-600">
                      {formatDays(l.total_days)}d
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Team on Leave Today */}
          {isReviewer && (
            <Card>
              <CardHeader title="Team on leave today" />

              {!data.team_on_leave_today?.length ? (
                <p className="text-sm text-slate-500">
                  Everyone is in today.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.team_on_leave_today.map((t, i) => (
                    <li
                      key={i}
                      className="flex justify-between"
                    >
                      <span className="font-medium">
                        {t.employee_name}
                      </span>

                      <span className="text-slate-500">
                        {t.leave_type_name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

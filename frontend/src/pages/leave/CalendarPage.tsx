import { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useListDepartmentsQuery } from "../../api/departmentsApi";
import { useGetCalendarQuery } from "../../api/leavesApi";
import { useAppSelector } from "../../app/hooks";
import { Button, Card, ErrorState, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { formatRange, toISODate } from "../../lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [department, setDepartment] = useState("");
  const { data: departments } = useListDepartmentsQuery({ page_size: 100 }, { skip: role !== "admin" });

  // Six full weeks, starting on the Sunday on/before the 1st.
  const days = useMemo(() => {
    const first = new Date(cursor);
    first.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [cursor]);

  const start = toISODate(days[0]);
  const end = toISODate(days[41]);
  const { data: entries = [], isFetching, error, refetch } = useGetCalendarQuery({
    start, end, department: department ? Number(department) : undefined,
  });

  const title = role === "admin" ? "Company leave calendar" : role === "manager" ? "Team leave calendar" : "Leave calendar";
  const today = toISODate(new Date());
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <>
      <PageHeader
        title={title}
        description="Approved leave is solid; pending requests are outlined."
        actions={
          role === "admin" ? (
            <select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="input-base w-48">
              <option value="">All departments</option>
              {departments?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : undefined
        }
      />
      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-black">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</Button>
            <Button size="sm" variant="secondary" aria-label="Previous month" onClick={() => shift(-1)}><FiChevronLeft /></Button>
            <Button size="sm" variant="secondary" aria-label="Next month" onClick={() => shift(1)}><FiChevronRight /></Button>
          </div>
        </div>

        {error ? <ErrorState error={error} onRetry={refetch} /> : (
          <div className={cn("overflow-x-auto", isFetching && "opacity-70")}>
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-navy-50/60 text-center text-xs font-semibold uppercase text-navy-900">
                {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const iso = toISODate(day);
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const dayEntries = entries.filter((e) => e.start_date <= iso && e.end_date >= iso);
                  return (
                    <div key={iso} className={cn("min-h-[104px] border-b border-r border-slate-100 p-1.5", !inMonth && "bg-slate-50/70")}>
                      <span className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        iso === today ? "bg-navy-800 font-bold text-white" : inMonth ? "text-black" : "text-slate-400",
                      )}>{day.getDate()}</span>
                      <div className="space-y-1">
                        {dayEntries.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            title={`${e.employee_name} — ${e.leave_type_name} (${formatRange(e.start_date, e.end_date)}, ${e.status})`}
                            className={cn(
                              "truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                              e.status === "approved" ? "bg-navy-800 text-white" : "border border-navy-700 bg-white text-navy-800",
                            )}
                          >
                            {e.employee_name.split(" ")[0]}{e.is_half_day && " ½"}
                          </div>
                        ))}
                        {dayEntries.length > 3 && <p className="px-1 text-[11px] text-slate-500">+{dayEntries.length - 3} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

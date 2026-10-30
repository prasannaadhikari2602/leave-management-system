import { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  useGetUnreadCountQuery,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../api/notificationsApi";
import { cn } from "../../lib/cn";
import { timeAgo } from "../../lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Poll so new notifications appear without a page refresh.
  const { data: unread = 0 } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });
  const { data } = useListNotificationsQuery({ page_size: 6 }, { skip: !open });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <FiBell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-black">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markAll()} className="text-xs font-medium text-navy-700 hover:underline">Mark all read</button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {data?.data.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</li>}
            {data?.data.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={cn("w-full px-4 py-3 text-left hover:bg-slate-50", !n.is_read && "bg-navy-50/60")}
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-black">
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-navy-700" />} {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-slate-50">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

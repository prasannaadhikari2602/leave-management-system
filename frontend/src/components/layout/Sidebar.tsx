
import { NavLink } from "react-router-dom";
import { FiCalendar, FiX } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { closeSidebar } from "../../features/uiSlice";
import { useGetSettingsQuery } from "../../api/reportsApi";
import { cn } from "../../lib/cn";
import { NAV } from "./nav";

export function Sidebar() {
  const dispatch = useAppDispatch();

  const role = useAppSelector((s) => s.auth.user?.role);
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  const { data: settings } = useGetSettingsQuery();

  if (!role) return null;

  // Get navigation groups for the current role
  const navGroups = NAV[role];

  // Hide My Leave section for Admin
  const filteredGroups =
    role === "admin"
      ? navGroups.filter(
          (group) => group.title !== "My Leave"
        )
      : navGroups;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => dispatch(closeSidebar())}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-950 text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-navy-900">
              <FiCalendar size={18} />
            </span>

            <div className="leading-tight">
              <p className="text-sm font-bold">
                Leave Portal
              </p>

              <p className="max-w-[9.5rem] truncate text-[11px] text-navy-200">
                {settings?.company_name ?? ""}
              </p>
            </div>
          </div>

          <button
            className="rounded p-1 text-navy-200 hover:bg-white/10 lg:hidden"
            onClick={() => dispatch(closeSidebar())}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
          aria-label="Main"
        >
          {filteredGroups.map((group, i) => (
            <div key={group.title ?? i}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
                  {group.title}
                </p>
              )}

              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => dispatch(closeSidebar())}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-white text-navy-900"
                            : "text-navy-100 hover:bg-white/10 hover:text-white",
                        )
                      }
                    >
                      <Icon size={17} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

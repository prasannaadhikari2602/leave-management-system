import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLogOut, FiMenu, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useLogoutMutation } from "../../api/authApi";
import { openSidebar } from "../../features/uiSlice";
import { RoleBadge } from "../ui";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initials = user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const onLogout = async () => {
    await logout().unwrap().catch(() => undefined);
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => dispatch(openSidebar())} aria-label="Open menu">
        <FiMenu size={20} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{initials}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-black">{user.full_name}</span>
              <span className="block text-[11px] capitalize text-slate-500">{user.role}</span>
            </span>
            <FiChevronDown className="text-slate-500" />
          </button>
          {open && (
            <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-black">{user.full_name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <div className="mt-2"><RoleBadge role={user.role} /></div>
              </div>
              <hr className="my-1 border-slate-100" />
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-black hover:bg-slate-100" role="menuitem">
                <FiUser /> My profile
              </Link>
              <button onClick={onLogout} disabled={isLoading} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                <FiLogOut /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

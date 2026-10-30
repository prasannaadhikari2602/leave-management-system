import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { capitalize } from "../../lib/format";
import type { LeaveStatus, Role } from "../../types";

const tones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-navy-50 text-navy-800 ring-navy-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  black: "bg-black text-white ring-black",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

const statusTone: Record<LeaveStatus, keyof typeof tones> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge tone={statusTone[status]}>{capitalize(status)}</Badge>;
}

const roleTone: Record<Role, keyof typeof tones> = { admin: "black", manager: "blue", employee: "gray" };

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={roleTone[role]}>{role === "admin" ? "Admin / HR" : capitalize(role)}</Badge>;
}

export function ActiveBadge({ active, pendingInvite }: { active: boolean; pendingInvite?: boolean }) {
  if (pendingInvite) return <Badge tone="amber">Invited</Badge>;
  return <Badge tone={active ? "green" : "gray"}>{active ? "Active" : "Inactive"}</Badge>;
}

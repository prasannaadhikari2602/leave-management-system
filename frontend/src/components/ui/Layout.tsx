import type { ReactNode } from "react";
import { FiAlertCircle, FiInbox, FiLoader } from "react-icons/fi";
import { cn } from "../../lib/cn";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "./Button";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-card", padded && "p-5", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-black">{title}</h2>
      {action}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  tone?: "navy" | "black" | "green" | "amber" | "red";
}

const statTones = {
  navy: "bg-navy-800 text-white",
  black: "bg-black text-white",
  green: "bg-emerald-600 text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-red-600 text-white",
};

export function StatCard({ label, value, icon, hint, tone = "navy" }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl", statTones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-black">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <FiLoader className="animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <FiInbox size={22} />
      </div>
      <p className="font-semibold text-black">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <FiAlertCircle size={22} />
      </div>
      <p className="font-semibold text-black">Could not load data</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{getErrorMessage(error)}</p>
      {onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            value === tab.value ? "bg-navy-800 text-white shadow-sm" : "text-slate-700 hover:bg-white",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

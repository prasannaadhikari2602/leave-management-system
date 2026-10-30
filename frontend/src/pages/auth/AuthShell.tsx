import type { ReactNode } from "react";
import { FiCalendar, FiCheckCircle } from "react-icons/fi";

const points = [
  "Apply for leave in seconds",
  "Requests reach the right manager automatically",
  "Track balances, approvals and your team calendar",
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <div className="hidden w-1/2 flex-col justify-between bg-navy-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy-900"><FiCalendar size={20} /></span>
          <span className="text-xl font-bold">Leave Portal</span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Leave management that stays out of your way.</h2>
          <ul className="mt-8 space-y-3 text-navy-100">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3"><FiCheckCircle className="shrink-0 text-navy-300" /> {p}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-navy-300">© {new Date().getFullYear()} Leave Portal</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white"><FiCalendar /></span>
            <span className="text-lg font-bold text-black">Leave Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-black">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

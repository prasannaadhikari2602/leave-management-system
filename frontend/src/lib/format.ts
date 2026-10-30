const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
});

/** Parse a "YYYY-MM-DD" string as a local date (avoids timezone shifts). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(value?: string | null): string {
  return value ? dateFmt.format(parseISODate(value.slice(0, 10))) : "—";
}

export function formatDateTime(value?: string | null): string {
  return value ? dateTimeFmt.format(new Date(value)) : "—";
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const s = parseISODate(start);
  const e = parseISODate(end);
  return s.getFullYear() === e.getFullYear()
    ? `${shortFmt.format(s)} – ${dateFmt.format(e)}`
    : `${dateFmt.format(s)} – ${dateFmt.format(e)}`;
}

/** "12.00" -> "12", "0.50" -> "0.5" */
export function formatDays(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

export function timeAgo(value: string): string {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  const units: [number, string][] = [[86400, "d"], [3600, "h"], [60, "m"]];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
}

export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

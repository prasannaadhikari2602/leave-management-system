import { useEffect, useState, type ReactNode } from "react";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { cn } from "../../lib/cn";
import { useDebounce } from "../../lib/hooks";
import type { Pagination as PaginationInfo } from "../../types";
import { Button } from "./Button";
import { EmptyState, ErrorState, Spinner } from "./Layout";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, emptyTitle = "Nothing here yet", emptyMessage, emptyAction, onRowClick,
}: DataTableProps<T>) {
  if (loading && !rows) return <Spinner />;
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;

  return (
    <div className={cn("overflow-x-auto", loading && "opacity-60 transition-opacity")}>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-navy-50/60 text-xs uppercase tracking-wide text-navy-900">
            {columns.map((col) => (
              <th key={col.header} className={cn("whitespace-nowrap px-4 py-3 font-semibold", col.className)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("align-middle", onRowClick && "cursor-pointer hover:bg-navy-50/40")}
            >
              {columns.map((col) => (
                <td key={col.header} className={cn("px-4 py-3 text-black", col.className)}>{col.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ pagination, onPage }: { pagination?: PaginationInfo; onPage: (page: number) => void }) {
  if (!pagination || pagination.count === 0) return null;
  const { page, page_size, total_pages, count } = pagination;
  const from = (page - 1) * page_size + 1;
  const to = Math.min(page * page_size, count);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row">
      <span>Showing {from}–{to} of {count}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" icon={<FiChevronLeft />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
        <span className="px-1">Page {page} of {total_pages}</span>
        <Button size="sm" variant="secondary" disabled={page >= total_pages} onClick={() => onPage(page + 1)}>
          Next <FiChevronRight />
        </Button>
      </div>
    </div>
  );
}

/** Search box that reports its value after the user stops typing. */
export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full sm:w-72">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-base pl-9"
      />
    </div>
  );
}

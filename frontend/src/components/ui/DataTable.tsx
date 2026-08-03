import type { ReactNode } from "react";
import { useState, useMemo } from "react";
import { EmptyState, Spinner } from "./Basics";
import { Pagination, type PaginationInfo } from "./Pagination";
import clsx from "clsx";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: keyof T;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyLabel = "No records yet.",
  emptyDescription,
  onRowClick,
  actions,
  pagination,
  onPageChange,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
}) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (sortCol === null) return rows;
    const col = columns[sortCol];
    if (!col?.sortKey) return rows;
    const key = col.sortKey;
    return [...rows].sort((a, b) => {
      const av = String(a[key] ?? "");
      const bv = String(b[key] ?? "");
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir, columns]);

  function toggleSort(idx: number) {
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
        <Spinner className="w-6 h-6" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState label={emptyLabel} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container">
                {columns.map((c, idx) => (
                  <th
                    key={c.header}
                    onClick={c.sortable ? () => toggleSort(idx) : undefined}
                    className={clsx(
                      "px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider",
                      c.sortable && "cursor-pointer select-none hover:text-on-surface",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {c.sortable && sortCol === idx && (
                        <span className="material-symbols-outlined text-sm">{sortDir === "asc" ? "arrow_upward" : "arrow_downward"}</span>
                      )}
                    </span>
                  </th>
                ))}
                {actions && <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    "transition-colors",
                    idx % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container",
                    onRowClick ? "cursor-pointer hover:bg-primary/5" : "hover:bg-surface-container",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.header} className={clsx("px-4 py-3 text-on-surface", c.className ?? "")}>
                      {c.cell(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pagination && onPageChange && (
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}

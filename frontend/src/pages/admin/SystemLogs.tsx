import { useEffect, useState } from "react";
import { PageHeader, Card, Spinner } from "../../components/ui/Basics";
import Dropdown from "../../components/ui/Dropdown";
import { api } from "../../lib/api";
import clsx from "clsx";

interface AuditLog {
  id: string;
  action: string;
  category: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  performedByName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface CategorySummary {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  leave_note: "Leave Notes",
  invoice: "Invoices",
  payment: "Payments",
  student: "Students",
  user: "Users",
  setting: "Settings",
  attendance: "Attendance",
  report_card: "Report Cards",
  fee_structure: "Fee Structures",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  leave_note: "bg-violet-100 text-violet-700",
  invoice: "bg-blue-100 text-blue-700",
  payment: "bg-emerald-100 text-emerald-700",
  student: "bg-amber-100 text-amber-700",
  user: "bg-cyan-100 text-cyan-700",
  setting: "bg-surface-100 text-surface-700",
  attendance: "bg-orange-100 text-orange-700",
  report_card: "bg-pink-100 text-pink-700",
  fee_structure: "bg-indigo-100 text-indigo-700",
  other: "bg-surface-100 text-surface-500",
};

export default function SystemLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  function load() {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (category) params.category = category;
    api.get<AuditLog[]>("/audit-logs", params).then((res: any) => {
      setLogs(res.data || res);
      if (res.summary) setSummary(res.summary);
      if (res.pagination) setTotal(res.pagination.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, [category, page]);

  const totalPages = Math.ceil(total / limit);
  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...summary.map((s) => ({ value: s.category, label: `${CATEGORY_LABELS[s.category] || s.category} (${s.count})` })),
  ];

  return (
    <div className="animate-fade-in max-w-6xl">
      <PageHeader title="System Logs" description="Audit trail of all system actions, filterable by category." />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Dropdown
            value={category}
            options={categoryOptions}
            onChange={(v) => { setCategory(v); setPage(1); }}
            placeholder="All Categories"
            size="sm"
          />
          <span className="text-xs text-surface-400">{total} total entries</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded hover:bg-surface-100 disabled:opacity-30">&larr;</button>
            <span className="px-2 text-surface-500">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded hover:bg-surface-100 disabled:opacity-30">&rarr;</button>
          </div>
        )}
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.map((s) => (
            <button
              key={s.category}
              onClick={() => { setCategory(category === s.category ? "" : s.category); setPage(1); }}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                category === s.category
                  ? "ring-2 ring-brand-500/30 shadow-sm"
                  : "",
                CATEGORY_COLORS[s.category] || "bg-surface-100 text-surface-600",
              )}
            >
              {CATEGORY_LABELS[s.category] || s.category} <span className="opacity-60">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
      ) : logs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-surface-400">No audit logs found.</Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-surface-100">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-surface-50 transition-colors">
              <div className={clsx("mt-0.5 w-2 h-2 rounded-full shrink-0", CATEGORY_COLORS[log.category]?.split(" ")[0] || "bg-surface-300")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", CATEGORY_COLORS[log.category] || "bg-surface-100 text-surface-600")}>
                    {CATEGORY_LABELS[log.category] || log.category}
                  </span>
                  <span className="font-medium text-surface-900 capitalize">{log.action}</span>
                  <span className="text-surface-500">{log.description}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-surface-400">
                  {log.performedByName && <span>{log.performedByName}</span>}
                  <span>{new Date(log.createdAt).toLocaleString("en-KE")}</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

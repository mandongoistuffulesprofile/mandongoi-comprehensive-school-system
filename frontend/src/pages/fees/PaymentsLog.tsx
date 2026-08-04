import { useEffect, useState, useMemo } from "react";
import { paymentsApi } from "../../api/fees";
import type { PaymentRecord } from "../../types";
import { Money, PageHeader, Card, EnumBadge } from "../../components/ui/Basics";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import clsx from "clsx";

export default function PaymentsLog() {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    paymentsApi.list({ type: typeFilter || undefined, matchStatus: statusFilter || undefined })
      .then(setPayments)
      .catch(() => toast.add("error", "Failed to load payments"))
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter((p) =>
      p.transactionId.toLowerCase().includes(q) ||
      p.phoneNumber.includes(q) ||
      p.accountReference.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const totalAmount = useMemo(() =>
    filtered.reduce((s, p) => s + Number(p.amount), 0)
  , [filtered]);

  return (
    <div>
      <PageHeader title="Payments Log" description="All payments (M-Pesa + manual) recorded in the system." />

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID, phone, or reference..."
            className="flex-1 min-w-[200px] rounded-lg border border-outline px-3.5 py-2 text-sm"
          />
          <Dropdown
            value={typeFilter}
            options={[
              { value: "", label: "All Types" },
              { value: "mpesa", label: "M-Pesa" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={setTypeFilter}
            placeholder="All Types"
          />
          <Dropdown
            value={statusFilter}
            options={[
              { value: "", label: "All Statuses" },
              { value: "auto-matched", label: "Auto Matched" },
              { value: "manually-matched", label: "Manually Matched" },
              { value: "unmatched", label: "Unmatched" },
              { value: "manual", label: "Manual Entry" },
            ]}
            onChange={setStatusFilter}
            placeholder="All Statuses"
          />
          <div className="text-sm font-semibold text-on-surface ml-auto">
            Total: <Money value={totalAmount} className="text-primary" />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-on-surface-variant">No payments found.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Transaction ID</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium">Reference</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        p.type === "mpesa" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {p.type === "mpesa" ? "M-Pesa" : "Manual"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{p.transactionId || "—"}</td>
                    <td className="py-3 px-4 font-semibold text-on-surface"><Money value={p.amount} /></td>
                    <td className="py-3 px-4 text-on-surface-variant">{p.phoneNumber || "—"}</td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">{p.accountReference || "—"}</td>
                    <td className="py-3 px-4"><EnumBadge value={p.matchStatus} /></td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">
                      {new Date(p.transactionDate).toLocaleDateString("en-KE", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

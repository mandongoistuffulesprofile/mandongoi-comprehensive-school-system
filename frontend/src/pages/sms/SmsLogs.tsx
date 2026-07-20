import { useEffect, useState } from "react";
import { smsLogsApi } from "../../api/sms";
import type { SmsLog, SmsLogStatus } from "../../types";
import { DataTable } from "../../components/ui/DataTable";
import { EnumBadge, Money, PageHeader } from "../../components/ui/Basics";
import clsx from "clsx";

export default function SmsLogs() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SmsLogStatus | "">("");

  useEffect(() => {
    setLoading(true);
    smsLogsApi.list(status ? { status } : undefined).then(setLogs).finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <PageHeader title="SMS Logs" description="Delivery status per recipient message." />

      <div className="flex gap-2 mb-4">
        {(["", "queued", "sent", "delivered", "failed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              status === s
                ? "bg-brand-600 text-white border-brand-600"
                : "border-surface-300 text-surface-500 hover:bg-surface-50 hover:text-surface-700",
            )}
          >
            {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { header: "Recipient", cell: (l) => <span className="font-mono">{l.phoneNumber}</span> },
          { header: "Type", cell: (l) => l.recipientType },
          { header: "Message", cell: (l) => <span className="truncate max-w-xs inline-block text-surface-500">{l.message}</span> },
          { header: "Status", cell: (l) => <EnumBadge value={l.status} /> },
          { header: "Cost", cell: (l) => (l.cost ? <Money value={l.cost} /> : "—") },
        ]}
        rows={logs}
        loading={loading}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { ledgerApi } from "../../api/ledger";
import type { TrialBalanceRow } from "../../types";
import { EnumBadge, Money, Card, PageHeader, Spinner } from "../../components/ui/Basics";

export default function TrialBalance() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ledgerApi.trialBalance().then(setRows).finally(() => setLoading(false));
  }, []);

  const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit || 0), 0);

  return (
    <div>
      <PageHeader title="Account Balances" description="Shows every account with its total money out and money in. The totals must always match — this confirms all transactions are recorded correctly." />

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Money Out</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Money In</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.accountId} className="border-t border-surface-100 hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{r.code}</td>
                    <td className="px-4 py-3 font-medium text-on-surface">{r.name}</td>
                    <td className="px-4 py-3"><EnumBadge value={r.type} /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.debit} /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.credit} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant bg-surface-container-low font-semibold">
                  <td className="px-4 py-3 text-on-surface" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right"><Money value={totalDebit} className="text-on-surface" /></td>
                  <td className="px-4 py-3 text-right"><Money value={totalCredit} className="text-on-surface" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

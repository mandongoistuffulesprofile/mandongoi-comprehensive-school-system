import { useEffect, useState } from "react";
import { paymentsApi } from "../../api/fees";
import { studentsApi } from "../../api/students";
import { invoicesApi } from "../../api/fees";
import type { PaymentRecord, Student, FeeInvoice } from "../../types";
import { Button, EnumBadge, Money, Card } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import { Modal } from "../../components/ui/Modal";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";

export default function Reconciliation() {
  const [transactions, setTransactions] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState<PaymentRecord | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentInvoices, setStudentInvoices] = useState<FeeInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([paymentsApi.unmatched(), studentsApi.list()])
      .then(([txns, studs]) => { setTransactions(txns); setStudents(studs); })
      .catch(() => toast.add("error", "Failed to load data"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function selectStudent(studentId: string) {
    setSelectedStudent(studentId);
    if (!studentId) { setStudentInvoices([]); return; }
    setLoadingInvoices(true);
    try {
      const invs = await invoicesApi.list({ studentId });
      setStudentInvoices(invs);
    } catch { setStudentInvoices([]); }
    finally { setLoadingInvoices(false); }
  }

  async function handleMatch(txnId: string, invoiceId: string) {
    try {
      await paymentsApi.matchTransaction(txnId, invoiceId);
      toast.add("success", "Transaction matched");
      setMatching(null);
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to match");
    }
  }

  return (
    <div>
      <PageNavigation title="Payment Reconciliation" description="Manually match unmatched M-Pesa transactions to student invoices."
        quickSwitchers={[{ label: "Fee Payments", to: "/fees/invoices" }, { label: "Payments Log", to: "/fees/payments" }]}
        activeQuickSwitcher="/fees/reconciliation"/>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <Card className="p-8 text-center text-on-surface-variant">No unmatched transactions.</Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => (
            <Card key={txn.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-on-surface-variant">{txn.transactionId}</span>
                  <EnumBadge value={txn.matchStatus} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-on-surface"><Money value={txn.amount} /></span>
                  <span className="text-on-surface-variant">{txn.phoneNumber}</span>
                  <span className="text-on-surface-variant text-xs">Ref: {txn.accountReference}</span>
                </div>
                <div className="text-xs text-on-surface-variant">
                  {new Date(txn.transactionDate).toLocaleString("en-KE")}
                </div>
              </div>
              <Button size="sm" onClick={() => setMatching(txn)}>Match to Invoice</Button>
            </Card>
          ))}
        </div>
      )}

      {matching && (
        <Modal title="Match to Invoice" onClose={() => setMatching(null)}>
          <div className="space-y-4 min-w-[460px]">
            <div className="text-sm bg-amber-50 rounded-lg p-3 space-y-1 border border-amber-200">
              <p className="font-medium">{matching.transactionId}</p>
              <p>Amount: <Money value={matching.amount} /> · Phone: {matching.phoneNumber}</p>
              <p className="text-xs text-on-surface-variant">Ref: {matching.accountReference}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Select Student</label>
              <Dropdown
                value={selectedStudent}
                options={students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${s.grade}` }))}
                onChange={selectStudent}
                placeholder="-- Choose student --"
              />
            </div>

            {loadingInvoices && <p className="text-xs text-on-surface-variant">Loading invoices...</p>}

            {studentInvoices.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Invoices</p>
                {studentInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleMatch(matching.id, inv.id)}
                    className="w-full text-left p-3 rounded-lg border border-outline-variant hover:bg-primary-container transition-colors"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Term {inv.term} · {inv.academicYear}</span>
                      <span className="text-on-surface-variant">Balance: <Money value={inv.balance} /></span>
                    </div>
                    <div className="flex justify-between text-xs text-on-surface-variant mt-0.5">
                      <span>Total: <Money value={inv.totalAmount} /> · Paid: <Money value={inv.amountPaid} /></span>
                      <EnumBadge value={inv.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedStudent && !loadingInvoices && studentInvoices.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-4">No invoices found for this student.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

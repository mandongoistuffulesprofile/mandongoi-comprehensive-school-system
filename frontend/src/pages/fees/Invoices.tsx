import { useEffect, useState } from "react";
import { invoicesApi, feeStructuresApi } from "../../api/fees";
import { studentsApi } from "../../api/students";
import { paybillsApi } from "../../api/paybills";
import type { FeeInvoice, FeeStructure, PaymentMethod, Paybill, Receipt, Student } from "../../types";
import { Button, EnumBadge, Money } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import clsx from "clsx";

export default function Invoices() {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceFilter, setBalanceFilter] = useState<"" | "pending" | "paid" | "overdue">("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<FeeInvoice | null>(null);
  const [viewingReceipts, setViewingReceipts] = useState<FeeInvoice | null>(null);
  const toast = useToast();

  function load() {
    setLoading(true);
    invoicesApi.list(balanceFilter ? { balance: balanceFilter } : undefined)
      .then(setInvoices).catch((e) => toast.add("error", e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [balanceFilter]);

  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balance), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <PageNavigation title="Invoices" description="Fee invoices, payments, and M-Pesa reconciliation."
        quickSwitchers={[{ label: "Set Term Fees", to: "/fees/structures" }, { label: "Reconciliation", to: "/fees/reconciliation" }, { label: "Payments Log", to: "/fees/payments" }]}
        activeQuickSwitcher="/fees/invoices"        actions={<div className="flex gap-2"><Button variant="secondary" onClick={() => setShowBulkGenerate(true)}>Generate for All</Button><Button onClick={() => setShowGenerate(true)}>+ Generate Invoice</Button></div>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">KES {totalOutstanding.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border border-emerald-200">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">KES {totalCollected.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border border-red-200">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Overdue Accounts</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{overdueCount}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["", "pending", "paid", "overdue"] as const).map((f) => (
          <button key={f} onClick={() => setBalanceFilter(f)}
            className={clsx("px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              balanceFilter === f ? "bg-primary text-white border-primary" : "border-outline text-on-surface-variant hover:bg-surface-container-low")}>
            {f === "" ? "All" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <DataTable columns={[
          { header: "Student", cell: (i) => <span className="font-medium">{i.student ? `${i.student.firstName} ${i.student.lastName}` : i.studentId}</span> },
          { header: "Grade", cell: (i) => i.student?.grade || "—" },
          { header: "Term", cell: (i) => `Term ${i.term} ${i.academicYear}` },
          { header: "Due", cell: (i) => i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-KE") : "—" },
          { header: "Total", cell: (i) => <Money value={i.totalAmount} className="font-semibold" /> },
          { header: "Paid", cell: (i) => <Money value={i.amountPaid} /> },
          { header: "Balance", cell: (i) => <Money value={i.balance} className={Number(i.balance) > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"} /> },
          { header: "Status", cell: (i) => <EnumBadge value={i.status} /> },
        ]} rows={invoices} loading={loading}
          actions={(inv) => (
            <div className="flex gap-1">
              <button className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded-md transition-colors" onClick={() => setPayingInvoice(inv)}>Record Payment</button>
              <button className="px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low rounded-md transition-colors" onClick={() => setViewingReceipts(inv)}>Receipts</button>
            </div>
          )}
        />
      </div>

      {showGenerate && <GenerateInvoiceModal onClose={() => setShowGenerate(false)} onDone={load} />}
      {showBulkGenerate && <BulkGenerateModal onClose={() => setShowBulkGenerate(false)} onDone={load} />}
      {payingInvoice && <PaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onDone={load} />}
      {viewingReceipts && <ReceiptsModal invoice={viewingReceipts} onClose={() => setViewingReceipts(null)} />}
    </div>
  );
}

function GenerateInvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { studentsApi.list().then(setStudents); feeStructuresApi.list().then(setStructures); }, []);

  const selectedStudent = students.find((s) => s.id === studentId);
  const selectedFS = structures.find((f) => f.id === feeStructureId);

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return !q || `${s.firstName} ${s.lastName} ${s.grade}`.toLowerCase().includes(q);
  });

  async function submit() {
    setSaving(true);
    try {
      await invoicesApi.generate({ studentId, feeStructureId, dueDate: dueDate || undefined });
      toast.add("success", "Invoice generated"); onDone(); onClose();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const breakdown = selectedFS ? [
    { label: "Tuition", amount: selectedFS.tuitionAmount },
    { label: "Activity", amount: selectedFS.activityAmount },
    { label: "Admin & ICT Levy", amount: selectedFS.adminLevyAmount },
    { label: "Boarding", amount: selectedFS.boardingAmount },
    { label: "Food", amount: selectedFS.foodAmount },
  ].filter((b) => Number(b.amount) > 0) : [];

  if (showConfirm && selectedStudent && selectedFS) {
    return (
      <Modal title="Confirm Invoice" onClose={onClose} width="max-w-lg">
        <div className="space-y-5">
          <p className="text-sm text-on-surface-variant">Review the invoice details below before generating.</p>
          <div className="rounded-2xl bg-surface-container-low p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Student</p>
                <p className="font-bold text-on-surface text-lg">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p className="text-xs text-on-surface-variant">{selectedStudent.grade} · {selectedStudent.studentType === 'boarding' ? 'Boarding' : 'Day Scholar'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Fee Structure</p>
                <p className="font-semibold text-on-surface">{selectedFS.grade} · Term {selectedFS.term} · {selectedFS.academicYear}</p>
                <p className="text-xs text-on-surface-variant">{selectedFS.studentType === 'boarding' ? 'Boarding' : 'Day'} rate</p>
              </div>
            </div>
            <div className="border-t border-outline-variant pt-3">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Fee Breakdown</p>
              <div className="space-y-1.5">
                {breakdown.length > 0 ? breakdown.map((b) => (
                  <div key={b.label} className="flex justify-between text-sm"><span className="text-on-surface-variant">{b.label}</span><span className="font-medium">KES {Number(b.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div>
                )) : <p className="text-sm text-on-surface-variant">No breakdown available</p>}
              </div>
              <div className="flex justify-between border-t border-outline mt-2 pt-2 font-bold text-on-surface">
                <span>Total</span>
                <span className="text-primary">KES {Number(selectedFS.totalAmount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            {dueDate && <div className="text-xs text-on-surface-variant">Due date: {new Date(dueDate).toLocaleDateString("en-KE")}</div>}
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t border-outline-variant">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>← Back to edit</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Generating..." : "✅ Confirm & Generate Invoice"}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Generate Invoice" onClose={onClose} width="max-w-lg">
      <div className="space-y-5">
        <div className="bg-primary-container rounded-xl p-4 border border-primary/20">
          <p className="text-sm font-medium text-primary">How it works</p>
          <p className="text-xs text-primary mt-1 leading-relaxed">
            Select a student and a fee structure. The system will create a new invoice for this student
            based on the fee structure's term, year, and amounts. You can optionally set a due date.
            Invoices with the same fee structure and term for the same student will be skipped.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Student <span className="text-red-500">*</span></label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setStudentId(""); }}
              placeholder="Search by name or grade..."
              className="w-full rounded-lg border border-outline pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          {studentSearch && filteredStudents.length > 0 && !studentId && (
            <div className="mt-1 border border-outline-variant rounded-lg max-h-48 overflow-y-auto divide-y divide-outline-variant">
              {filteredStudents.map((s) => (
                <button key={s.id} type="button" onClick={() => { setStudentId(s.id); setStudentSearch(`${s.firstName} ${s.lastName} · ${s.grade}`); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-container transition-colors">
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="text-on-surface-variant ml-2">{s.grade}{s.studentType === 'boarding' ? ' · Boarding' : ''}</span>
                </button>
              ))}
            </div>
          )}
          {studentId && selectedStudent && (
            <div className="mt-2 flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span>
              <span className="text-on-surface-variant">{selectedStudent.grade} · {selectedStudent.studentType === 'boarding' ? 'Boarding' : 'Day'}</span>
              <button onClick={() => { setStudentId(""); setStudentSearch(""); }} className="ml-auto text-xs text-red-500 hover:text-red-700">Change</button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Fee Structure <span className="text-red-500">*</span></label>
          {!studentId ? (
            <div className="rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-low text-on-surface-variant">
              Select a student first to see matching fee structures.
            </div>
          ) : (
            <div className="relative">
              <select value={feeStructureId} onChange={(e) => setFeeStructureId(e.target.value)}
                className="w-full rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none">
                <option value="">Select a fee structure...</option>
                {structures
                  .filter((f) => f.status === 'active' && f.grade === selectedStudent?.grade && (f.studentType === selectedStudent?.studentType || f.studentType === 'both'))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.studentType === 'boarding' ? '🏠 Boarding' : '📚 Day'} · Term {f.term} · {f.academicYear} · KES {Number(f.totalAmount).toLocaleString()}
                    </option>
                  ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}
          {selectedStudent && structures.filter((f) => f.status === 'active' && f.grade === selectedStudent.grade && (f.studentType === selectedStudent.studentType || f.studentType === 'both')).length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">No fee structures found for {selectedStudent.grade} {selectedStudent.studentType === 'boarding' ? 'Boarding' : 'Day'} students.</p>
          )}
        </div>

        <FormField spec={{ name: "dueDate", label: "Due Date (optional)", type: "date" }} value={dueDate} onChange={(v) => setDueDate(v as string)} />

        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => setShowConfirm(true)} disabled={!studentId || !feeStructureId}>Review & Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}

function BulkGenerateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [feeStructureId, setFeeStructureId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number; total: number } | null>(null);
  const toast = useToast();

  useEffect(() => { feeStructuresApi.list().then(setStructures); }, []);

  const selectedFS = structures.find((f) => f.id === feeStructureId);

  async function submit() {
    setSaving(true); setResult(null);
    try {
      const res = await invoicesApi.generateBulk(feeStructureId);
      setResult(res); toast.add("success", `Created ${res.created} invoice${res.created !== 1 ? "s" : ""}`); onDone();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={showConfirm ? "Confirm Bulk Generation" : "Generate Invoices for All Students"} onClose={onClose} width="max-w-lg">
      {!showConfirm ? (
        <div className="space-y-5">
          <p className="text-sm text-on-surface-variant">Select an <strong>active</strong> fee structure to generate invoices for all active students in the matching grade and type.</p>
          <FormField spec={{ name: "feeStructureId", label: "Fee Structure", type: "select", required: true, options: structures.filter((f) => f.status === 'active').map((f) => ({ value: f.id, label: `${f.grade} · ${f.studentType === 'boarding' ? 'Boarding' : 'Day'} · Term ${f.term} · KES ${Number(f.totalAmount).toLocaleString()}` })) }} value={feeStructureId} onChange={(v) => setFeeStructureId(v as string)} />
          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setShowConfirm(true)} disabled={!feeStructureId}>Review & Confirm</Button>
          </div>
        </div>
      ) : !result ? (
        <div className="space-y-5">
          {selectedFS && (
            <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-on-surface-variant uppercase">Grade</p><p className="font-bold">{selectedFS.grade}</p></div>
                <div><p className="text-xs text-on-surface-variant uppercase">Type</p><p className="font-semibold">{selectedFS.studentType === 'boarding' ? 'Boarding' : 'Day Scholar'}</p></div>
                <div><p className="text-xs text-on-surface-variant uppercase">Term</p><p className="font-semibold">Term {selectedFS.term}</p></div>
                <div><p className="text-xs text-on-surface-variant uppercase">Amount</p><p className="font-bold text-primary">KES {Number(selectedFS.totalAmount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
              </div>
              <div className="border-t border-outline-variant pt-2 text-xs text-on-surface-variant">
                <p>This will generate invoices for all active {selectedFS.studentType} students in {selectedFS.grade}. Students with an existing invoice for Term {selectedFS.term} using this structure will be skipped.</p>
              </div>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-2 border-t border-outline-variant">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>← Back</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-primary text-white">{saving ? "Generating..." : "✅ Confirm & Generate All"}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-surface-container-low p-5 text-center">
            <p className="text-lg font-bold text-on-surface mb-3">Generation Complete</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-100 text-emerald-700 rounded-xl p-4"><p className="text-2xl font-bold">{result.created}</p><p className="text-xs">Created</p></div>
              <div className="bg-surface-container text-on-surface-variant rounded-xl p-4"><p className="text-2xl font-bold">{result.skipped}</p><p className="text-xs">Skipped</p></div>
              <div className={`rounded-xl p-4 ${result.errors > 0 ? 'bg-red-100 text-red-700' : 'bg-surface-container text-on-surface-variant'}`}><p className="text-2xl font-bold">{result.errors}</p><p className="text-xs">Errors</p></div>
            </div>
            <p className="text-xs text-on-surface-variant mt-3">{result.total} student{result.total !== 1 ? "s" : ""} in grade</p>
          </div>
          <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Close</Button></div>
        </div>
      )}
    </Modal>
  );
}

function PaymentModal({ invoice, onClose, onDone }: { invoice: FeeInvoice; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);
  const [stkPhone, setStkPhone] = useState("");
  const [paybills, setPaybills] = useState<Paybill[]>([]);
  const [stkSending, setStkSending] = useState(false);
  const toast = useToast();

  useEffect(() => { paybillsApi.list().then(setPaybills); }, []);

  async function submit() {
    if (!amount) return;
    setSaving(true);
    try {
      await invoicesApi.recordPayment(invoice.id, { amount: Number(amount), paymentMethod: method });
      toast.add("success", "Payment recorded"); onDone(); onClose();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function sendStk() {
    if (!amount || !stkPhone) return;
    setStkSending(true);
    try {
      const accountRef = invoice.student
        ? `${invoice.student.firstName}${invoice.student.lastName}-Grade${invoice.student.grade.replace(/[^0-9]/g, "")}`
        : `INV${invoice.id.slice(0, 8)}`;
      await invoicesApi.stkPush({ phoneNumber: stkPhone, amount: Number(amount), accountReference: accountRef });
      toast.add("success", "STK Push sent to parent's phone"); onClose(); onDone();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "STK Push failed"); }
    finally { setStkSending(false); }
  }

  return (
    <Modal title="Record Payment" onClose={onClose} width="max-w-lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
          <div><p className="text-xs text-on-surface-variant">Invoice Balance</p><p className="text-lg font-bold text-on-surface">KES {Number(invoice.balance).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
          <div className="text-right"><p className="text-xs text-on-surface-variant">Total Amount</p><p className="font-semibold">KES {Number(invoice.totalAmount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
        </div>
        <FormField spec={{ name: "amount", label: "Payment Amount (KES)", type: "number", step: "0.01", required: true }} value={amount} onChange={(v) => setAmount(v as number)} />

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <h4 className="text-sm font-bold text-blue-900 mb-3">💳 M-Pesa STK Push</h4>
          <p className="text-xs text-blue-700 mb-3">Send a payment request to the parent's phone. They will enter M-Pesa PIN to complete.</p>
          <div className="space-y-3">
            <FormField spec={{ name: "stkPhone", label: "Parent Phone (2547XXXXXXXX)", placeholder: "2547XXXXXXXX" }} value={stkPhone} onChange={(v) => setStkPhone(v as string)} />
            {paybills.length > 0 && (
              <FormField spec={{ name: "paybill", label: "Paybill Account", type: "select", options: paybills.map((p) => ({ value: p.id, label: `${p.name} (${p.shortcode})` })) }} value={undefined} onChange={() => {}} />
            )}
            <Button onClick={sendStk} disabled={stkSending || !amount || !stkPhone} variant="secondary" className="w-full">
              {stkSending ? "Sending..." : "📱 Send STK Push to Parent"}
            </Button>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-4">
          <h4 className="text-sm font-bold text-on-surface mb-3">📝 Manual Payment Entry</h4>
          <p className="text-xs text-on-surface-variant mb-3">Use this for cash, bank transfers, or M-Pesa that arrived outside the system.</p>
          <FormField spec={{ name: "method", label: "Payment Method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank", label: "Bank Transfer" }, { value: "mpesa", label: "M-Pesa (manual)" }] }} value={method} onChange={(v) => setMethod(v as PaymentMethod)} />
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !amount}>{saving ? "Saving..." : "✅ Record Payment"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReceiptsModal({ invoice, onClose }: { invoice: FeeInvoice; onClose: () => void }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    invoicesApi.receipts(invoice.id).then(setReceipts).catch(() => toast.add("error", "Failed to load receipts")).finally(() => setLoading(false));
  }, [invoice.id]);

  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <Modal title="Payment Receipts" onClose={onClose} width="max-w-lg">
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" /></div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-10"><p className="text-on-surface-variant text-sm">No receipts issued yet.</p><p className="text-xs text-outline-variant mt-1">Receipts are generated when a payment is recorded against this invoice.</p></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
            <div><p className="text-xs text-on-surface-variant">Invoice Total</p><p className="font-bold text-on-surface">KES {Number(invoice.totalAmount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
            <div className="text-right"><p className="text-xs text-on-surface-variant">Total Paid</p><p className="font-bold text-emerald-600">KES {totalPaid.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
            <div className="text-right"><p className="text-xs text-on-surface-variant">Balance</p><p className="font-bold" style={{ color: Number(invoice.balance) > 0 ? '#dc2626' : '#059669' }}>KES {Number(invoice.balance).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p></div>
          </div>
          <div className="divide-y divide-outline-variant">
            {receipts.map((r, i) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Receipt #{r.receiptNumber}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(r.issuedAt).toLocaleString("en-KE")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-on-surface">KES {Number(r.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                  <EnumBadge value={r.paymentMethod} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

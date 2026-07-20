import { useEffect, useState } from "react";
import { feeStructuresApi } from "../../api/fees";
import { useAuth } from "../../lib/auth";
import { Button, PageHeader, Money, EnumBadge } from "../../components/ui/Basics";
import { FormField } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { DataTable } from "../../components/ui/DataTable";
import { useToast } from "../../lib/toast";
import type { FeeStructure } from "../../types";

interface FeeItem { name: string; amount: string; }

const STUDENT_TYPE_OPTIONS = [
  { value: "day", label: "Day Scholar" },
  { value: "boarding", label: "Boarding" },
  { value: "both", label: "Both (Day + Boarding)" },
];

const FEE_CATEGORIES = [
  { key: "tuitionAmount", label: "Tuition Fees", icon: "📚", desc: "Core academic instruction" },
  { key: "activityAmount", label: "Activity Fee", icon: "⚽", desc: "Co-curricular and sports" },
  { key: "adminLevyAmount", label: "Admin & ICT Levy", icon: "💻", desc: "Report cards, internet, SMS, systems" },
  { key: "boardingAmount", label: "Boarding & Accommodation", icon: "🏠", desc: "Dormitory and housing (boarding only)" },
  { key: "foodAmount", label: "Food Programme", icon: "🍲", desc: "Meal program (boarding only)" },
];

export default function FeeStructures() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const [rows, setRows] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [studentType, setStudentType] = useState<"boarding" | "day" | "both">("day");
  const [amounts, setAmounts] = useState<Record<string, string>>({
    tuitionAmount: "", activityAmount: "", adminLevyAmount: "", boardingAmount: "", foodAmount: "",
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function load() { setLoading(true); feeStructuresApi.list().then(setRows).finally(() => setLoading(false)); }
  useEffect(load, []);

  function openCreate() {
    setGrade(""); setTerm(1); setAcademicYear(new Date().getFullYear()); setStudentType("day");
    setAmounts({ tuitionAmount: "", activityAmount: "", adminLevyAmount: "", boardingAmount: "", foodAmount: "" });
    setShowConfirm(false); setIsCreating(true); setEditing(null); setDeleteTarget(null);
  }

  function openEdit(row: FeeStructure) {
    setGrade(row.grade); setTerm(row.term); setAcademicYear(row.academicYear); setStudentType(row.studentType);
    setAmounts({ tuitionAmount: row.tuitionAmount, activityAmount: row.activityAmount, adminLevyAmount: row.adminLevyAmount, boardingAmount: row.boardingAmount, foodAmount: row.foodAmount });
    setShowConfirm(false); setEditing(row); setIsCreating(false); setDeleteTarget(null);
  }

  function updateAmount(key: string, value: string) { setAmounts({ ...amounts, [key]: value }); }
  const totalAmount = FEE_CATEGORIES.reduce((sum, cat) => sum + (Number(amounts[cat.key]) || 0), 0);

  function handleSaveClick() {
    if (!grade || !amounts.tuitionAmount) { toast.add("error", "Grade and Tuition Fee are required"); return; }
    setShowConfirm(true);
  }

  async function saveWithStatus(status: "draft" | "active") {
    setShowConfirm(false); setSaving(true);
    try {
      const payload = { grade, term, academicYear, status, studentType, ...amounts, totalAmount: String(totalAmount) };
      if (isCreating) await feeStructuresApi.create(payload as any);
      else if (editing) await feeStructuresApi.update(editing.id, payload as any);
      toast.add("success", status === "draft" ? "Fee structure saved as draft" : "Fee structure published");
      setEditing(null); setIsCreating(false); load();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    feeStructuresApi.remove(deleteTarget.id).then(() => {
      toast.add("success", "Fee structure deleted"); setDeleteTarget(null); load();
    }).catch((e) => toast.add("error", e instanceof Error ? e.message : "Delete failed"))
    .finally(() => setSaving(false));
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Fee Structures"
        description="Set term fees by grade and student type — tuition, activity, admin levies, boarding, and food programme."
        actions={isAdmin && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-lg shadow-brand-200 rounded-xl px-5 py-2.5">
            + New Fee Structure
          </Button>
        )}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
        <DataTable
          columns={[
            { header: "Grade", cell: (f) => <span className="font-semibold text-surface-900">{f.grade}</span> },
            { header: "Type", cell: (f) => <EnumBadge value={f.studentType} /> },
            { header: "Status", cell: (f) => <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${f.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{f.status === 'active' ? 'Active' : 'Draft'}</span> },
            { header: "Term", cell: (f) => `Term ${f.term}` },
            { header: "Year", cell: (f) => f.academicYear },
            { header: "Breakdown", cell: (f) => (
              <div className="flex flex-wrap gap-1.5">
                {Number(f.tuitionAmount) > 0 && <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">Tuition <Money value={f.tuitionAmount} /></span>}
                {Number(f.activityAmount) > 0 && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">Activity <Money value={f.activityAmount} /></span>}
                {Number(f.adminLevyAmount) > 0 && <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">Admin <Money value={f.adminLevyAmount} /></span>}
                {Number(f.boardingAmount) > 0 && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">Boarding <Money value={f.boardingAmount} /></span>}
                {Number(f.foodAmount) > 0 && <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs px-2 py-0.5 rounded-full">Food <Money value={f.foodAmount} /></span>}
              </div>
            )},
            { header: "Total", cell: (f) => <Money value={f.totalAmount} className="font-bold text-brand-600" /> },
          ]}
          rows={rows} loading={loading}
          actions={isAdmin ? (row) => (
            <div className="flex gap-1">
              <button onClick={() => openEdit(row)} className="px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">Edit</button>
              <button onClick={() => setDeleteTarget(row)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
            </div>
          ) : undefined}
        />
      </div>

      {(editing || isCreating) && !showConfirm && (
        <Modal title={isCreating ? "New Fee Structure" : "Edit Fee Structure"} onClose={() => { setEditing(null); setIsCreating(false); }} width="max-w-4xl">
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              <FormField spec={{ name: "grade", label: "Grade", required: true, placeholder: "e.g. Grade 4" }} value={grade} onChange={(v) => setGrade(v as string)} />
              <FormField spec={{ name: "studentType", label: "Student Type", type: "select", required: true, options: STUDENT_TYPE_OPTIONS }} value={studentType} onChange={(v) => setStudentType(v as "boarding" | "day" | "both")} />
              <FormField spec={{ name: "term", label: "Term", type: "number", required: true }} value={term} onChange={(v) => setTerm(v as number)} />
              <FormField spec={{ name: "academicYear", label: "Year", type: "number", required: true }} value={academicYear} onChange={(v) => setAcademicYear(v as number)} />
            </div>
            <div className="border-t border-surface-200 pt-5">
              <h3 className="text-sm font-semibold text-surface-900 mb-4">Fee Categories</h3>
              <div className="grid gap-3">
                {FEE_CATEGORIES.map((cat) => {
                  const isBoardingOnly = cat.key === "boardingAmount" || cat.key === "foodAmount";
                  if (isBoardingOnly && studentType === "day") return null;
                  return (
                    <div key={cat.key} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors group">
                      <span className="text-lg flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-semibold text-surface-900">{cat.label}</label>
                        <p className="text-xs text-surface-400">{cat.desc}</p>
                      </div>
                      <div className="flex-shrink-0 w-40">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-medium">KES</span>
                          <input type="number" step="0.01" value={amounts[cat.key]} onChange={(e) => updateAmount(cat.key, e.target.value)} className="w-full rounded-lg border border-surface-300 pl-10 pr-3 py-2 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white" placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl px-5 py-4 shadow-inner">
              <div>
                <span className="text-sm text-white/80 font-medium">Total Fee Per Student</span>
                <p className="text-xs text-white/60 mt-0.5">{studentType === "boarding" ? "Includes boarding & food" : studentType === "day" ? "Day scholar rate" : "Applies to both"}</p>
              </div>
              <span className="text-2xl font-bold text-white">KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setEditing(null); setIsCreating(false); }} className="px-5">Cancel</Button>
              <Button onClick={handleSaveClick} className="px-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-200 rounded-xl">Review & Confirm</Button>
            </div>
          </div>
        </Modal>
      )}

      {showConfirm && (
        <Modal title="Confirm Fee Structure" onClose={() => setShowConfirm(false)} width="max-w-4xl">
          <div className="space-y-5">
            <div className="rounded-2xl bg-surface-50 p-5 space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Grade</p><p className="font-bold text-surface-900 text-lg">{grade}</p></div>
                <div><p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Type</p><p className="font-semibold text-surface-900">{studentType === "boarding" ? "Boarding" : studentType === "day" ? "Day Scholar" : "Both"}</p></div>
                <div><p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Term</p><p className="font-semibold text-surface-900">Term {term}</p></div>
                <div><p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Year</p><p className="font-semibold text-surface-900">{academicYear}</p></div>
              </div>
              <div className="border-t border-surface-200 pt-4">
                <p className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-3">Fee Breakdown</p>
                <div className="space-y-2">
                  {FEE_CATEGORIES.map((cat) => {
                    const val = Number(amounts[cat.key]) || 0;
                    if (val === 0) return null;
                    return (
                      <div key={cat.key} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2"><span className="text-base">{cat.icon}</span><span className="text-sm text-surface-700">{cat.label}</span></div>
                        <span className="font-semibold text-surface-900">KES {val.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t-2 border-surface-300 mt-3 pt-3">
                  <span className="font-bold text-surface-900">Total</span>
                  <span className="text-xl font-bold text-brand-600">KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-surface-200">
                <p className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-1">Effect</p>
                <p className="text-sm text-surface-700">
                  {studentType === "boarding" ? "Applies to active Boarding students. Bring-Your-Own food students have food amount deducted." :
                   studentType === "day" ? "Applies to active Day Scholar students (boarding and food fees excluded)." :
                   "Applies to all active students regardless of type."}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">Choose how to save:</span> Draft keeps it hidden from invoice generation until published.
            </div>
            <div className="flex flex-wrap justify-between gap-3 pt-2 border-t border-surface-200">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} className="px-5">← Back to Edit</Button>
              <div className="flex gap-3">
                <button onClick={() => saveWithStatus("draft")} disabled={saving} className="px-5 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors">
                  {saving ? "Saving..." : "💾 Save as Draft"}
                </button>
                <button onClick={() => saveWithStatus("active")} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 rounded-xl shadow-lg shadow-brand-200 transition-colors">
                  {saving ? "Saving..." : "✅ Publish & Activate"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Fee Structure" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Are you sure?</p>
              <p>This will permanently delete the fee structure for <strong>{deleteTarget.grade}</strong> — {deleteTarget.studentType === "boarding" ? "Boarding" : deleteTarget.studentType === "day" ? "Day Scholar" : "Both"} (Term {deleteTarget.term}, {deleteTarget.academicYear}).</p>
              <p className="mt-2 text-xs text-red-500">Existing invoices generated from this structure will not be affected.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-surface-200">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <button onClick={confirmDelete} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                {saving ? "Deleting..." : "🗑 Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

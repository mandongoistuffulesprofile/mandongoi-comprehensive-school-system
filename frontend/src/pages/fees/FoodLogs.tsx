import { useEffect, useState, useMemo, useRef } from "react";
import { foodLogsApi, type FoodLog } from "../../api/food-logs";
import { studentsApi } from "../../api/students";
import { useAuth } from "../../lib/auth";
import { Button, PageHeader, Money, Spinner } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../lib/toast";
import { api } from "../../lib/api";
import type { Student } from "../../types";
import clsx from "clsx";

interface FoodPreset { id: string; itemName: string; unitPrice: string; unit: string; isActive: boolean; }
const UNIT_OPTIONS = ["kg", "g", "l", "pcs"];

export default function FoodLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logType, setLogType] = useState<"consumption" | "contribution" | "purchase" | "wastage">("consumption");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("kg");
  const [term, setTerm] = useState(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [presets, setPresets] = useState<FoodPreset[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<FoodPreset[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemRef = useRef<HTMLInputElement>(null);

  function load() { setLoading(true); foodLogsApi.list().then(setLogs).finally(() => setLoading(false)); }
  useEffect(load, []);

  useEffect(() => {
    api.get<FoodPreset[]>("/food-presets").then(setPresets);
  }, []);

  useEffect(() => {
    const q = itemName.toLowerCase();
    if (!q || presets.length === 0) { setItemSuggestions([]); return; }
    setItemSuggestions(presets.filter((p) => p.itemName.toLowerCase().includes(q)).slice(0, 8));
  }, [itemName, presets]);

  useEffect(() => {
    if (showDropdown) studentsApi.list({ status: "active" }).then(setAllStudents);
  }, [showDropdown]);

  const boardingStudents = useMemo(() =>
    allStudents.filter((s) => s.studentType === "boarding"),
  [allStudents]);

  const filteredDropdown = useMemo(() => {
    const q = studentSearch.toLowerCase();
    if (!q) return boardingStudents.slice(0, 30);
    return boardingStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      (s.boardingHouse || "").toLowerCase().includes(q)
    );
  }, [boardingStudents, studentSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase();
    if (!q) return logs;
    return logs.filter((r) =>
      (r.studentName || "").toLowerCase().includes(q) ||
      r.itemName.toLowerCase().includes(q) ||
      (r.notes || "").toLowerCase().includes(q)
    );
  }, [logs, logSearch]);

  async function submitLog(studentId: string) {
    if (!itemName) { toast.add("error", "Enter a food item"); return; }
    setSaving(true);
    try {
      await foodLogsApi.create({ studentId, itemName, type: logType, quantity, unit, notes: undefined, term, academicYear });
      toast.add("success", `${itemName} logged (${logType})`);
      setItemName(""); setQuantity(1);
      if (!showBulk) { setSelectedStudent(null); setStudentSearch(""); }
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  function handleLog() {
    if (!itemName) { toast.add("error", "Enter a food item"); return; }
    if (showBulk) {
      if (bulkIds.size === 0) { toast.add("error", "Select at least one student"); return; }
      Promise.all([...bulkIds].map((id) => submitLog(id))).then(() => load());
    } else if (selectedStudent) {
      submitLog(selectedStudent.id).then(() => load());
    } else {
      toast.add("error", "Select a student first");
    }
  }

  function selectStudent(s: Student) {
    setSelectedStudent(s);
    setShowBulk(false);
    setBulkIds(new Set());
    setShowDropdown(false);
    setStudentSearch(`${s.firstName} ${s.lastName}`);
  }

  function toggleBulk(id: string) {
    const next = new Set(bulkIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBulkIds(next);
  }

  async function remove(id: string) {
    try { await foodLogsApi.remove(id); toast.add("success", "Entry removed"); load(); setShowDelete(null); }
    catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
  }

  const totalValue = filteredLogs.reduce((s, r) => s + Number(r.estimatedValue || 0), 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <PageHeader title="Food Programme Logs" description="Log food items brought in by Bring-Your-Own boarding students." />

      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl p-4 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Entries</p>
            <p className="text-2xl font-bold text-primary mt-1">{filteredLogs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Est. Value</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">KES {totalValue.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Students</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{new Set(filteredLogs.map((r) => r.studentId)).size}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Boarding</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{boardingStudents.length}</p>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden mb-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface">Log Food Item</h3>
            <button onClick={() => { setShowBulk(!showBulk); if (!showBulk) setSelectedStudent(null); }}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", showBulk ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-200")}>
              {showBulk ? "Single Mode" : "Bulk Log"}
            </button>
          </div>

          <div className="grid grid-cols-[1fr_120px_100px_120px] gap-3 items-end mb-3">
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Type *</label>
              <select value={logType} onChange={(e) => setLogType(e.target.value as any)}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="consumption">Consumption (student ate)</option>
                <option value="contribution">Contribution (parent brought)</option>
                <option value="purchase">Purchase (school bought)</option>
                <option value="wastage">Wastage (spoiled/lost)</option>
              </select>
            </div>
            <div className="relative">
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Food Item *</label>
              <input ref={itemRef} value={itemName} onChange={(e) => { setItemName(e.target.value); setShowItemDropdown(true); }}
                onFocus={() => setShowItemDropdown(true)}
                onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Maize flour, Rice" />
              {showItemDropdown && itemSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {itemSuggestions.map((p) => (
                    <button key={p.id} type="button" onMouseDown={() => { setItemName(p.itemName); setUnit(p.unit); setShowItemDropdown(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-container transition-colors border-b border-surface-100 last:border-0">
                      <span className="font-medium text-on-surface">{p.itemName}</span>
                      <span className="text-on-surface-variant ml-2">KES {Number(p.unitPrice).toLocaleString()}/{p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Quantity</label>
              <input type="number" step="0.5" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest">
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_100px_100px] gap-3 items-end mb-3">
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Term</label>
              <input type="number" value={term} onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Year</label>
              <input type="number" value={academicYear} onChange={(e) => setAcademicYear(Number(e.target.value))}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          {!showBulk && (
            <div className="relative" ref={searchRef}>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Student *</label>
              <input ref={searchRef} value={studentSearch} onFocus={() => setShowDropdown(true)} onChange={(e) => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Type student name, grade, or boarding house..." />
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                  {filteredDropdown.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-6">No boarding students found.</p>
                  ) : filteredDropdown.map((s) => (
                    <div key={s.id} onClick={() => selectStudent(s)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-container cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center">{s.firstName[0]}{s.lastName[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-on-surface-variant">{s.grade} · {s.boardingHouse || "No house"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div className="mt-2 flex items-center gap-2 bg-primary-container rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-on-primary-container">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  <span className="text-xs text-primary">· {selectedStudent.grade} · {selectedStudent.boardingHouse}</span>
                  <button onClick={() => { setSelectedStudent(null); setStudentSearch(""); }} className="ml-auto text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              )}
            </div>
          )}

          {showBulk && (
            <div>
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">Students</label>
              <button onClick={() => setShowBulk(true)}
                className="w-full rounded-lg border border-outline px-3 py-2.5 text-sm text-left text-on-surface-variant hover:text-on-surface-variant hover:border-surface-400 transition-colors">
                {bulkIds.size === 0 ? "Tap to select boarding students..." : `${bulkIds.size} student${bulkIds.size > 1 ? 's' : ''} selected`}
              </button>
              {bulkIds.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...bulkIds].map((id) => {
                    const s = boardingStudents.find((st) => st.id === id);
                    if (!s) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 bg-primary-container text-on-primary-container text-xs px-2 py-1 rounded-full">
                        {s.firstName} {s.lastName}
                        <button onClick={() => toggleBulk(id)} className="text-primary hover:text-red-500">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(null); setItemName(""); setQuantity(1); setNotes(""); setBulkIds(new Set()); setStudentSearch(""); }}>
              Clear
            </Button>
            <Button size="sm" onClick={handleLog} disabled={saving || !itemName || (showBulk ? bulkIds.size === 0 : !selectedStudent)}
              className="bg-gradient-to-r from-rose-600 to-rose-500 text-white">
              {saving ? "Logging..." : showBulk ? `Log for ${bulkIds.size} student${bulkIds.size > 1 ? 's' : ''}` : selectedStudent ? `Log for ${selectedStudent.firstName}` : "Select a student"}
            </Button>
          </div>
        </div>
      </div>

      {showBulk && (
        <Modal title="Select Boarding Students" onClose={() => setShowBulk(false)} width="max-w-xl">
          <div className="space-y-3">
            <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} autoFocus
              className="w-full rounded-xl border border-outline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Search students..." />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredDropdown.length === 0 ? (
                <p className="text-center text-sm text-on-surface-variant py-8">No students match.</p>
              ) : filteredDropdown.map((s) => (
                <div key={s.id} onClick={() => toggleBulk(s.id)}
                  className={clsx("flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors", bulkIds.has(s.id) ? "bg-primary-container border border-primary/20" : "hover:bg-surface-container-low border border-transparent")}>
                  <div className={clsx("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0", bulkIds.has(s.id) ? "bg-primary border-brand-600" : "border-outline")}>
                    {bulkIds.has(s.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center">{s.firstName[0]}{s.lastName[0]}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-on-surface">{s.firstName} {s.lastName}</p><p className="text-xs text-on-surface-variant">{s.grade} · {s.boardingHouse || "No house"}</p></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <Button onClick={() => setShowBulk(false)} disabled={bulkIds.size === 0}>Done ({bulkIds.size} selected)</Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-surface-100 flex items-center gap-3">
          <svg className="w-4 h-4 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search entries by student, item..."
            className="flex-1 text-sm outline-none" />
          <span className="text-xs text-on-surface-variant shrink-0">{filteredLogs.length} entries</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">{logSearch ? "No matches." : "No food logged yet. Select a student above."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-container-low text-left text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Item</th><th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Value</th><th className="px-4 py-3 font-medium">Notes</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-surface-100">
                {filteredLogs.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{new Date(r.loggedAt).toLocaleDateString("en-KE")}</td>
                    <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{r.studentName || "—"}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.studentGrade || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                        r.type === "consumption" && "bg-blue-50 text-blue-700",
                        r.type === "contribution" && "bg-emerald-50 text-emerald-700",
                        r.type === "purchase" && "bg-amber-50 text-amber-700",
                        r.type === "wastage" && "bg-red-50 text-red-700",
                      )}>{r.type}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface">{r.itemName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600"><Money value={r.estimatedValue || "0"} /></td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-[140px] truncate">{r.notes || "—"}</td>
                    {isAdmin && <td className="px-4 py-3 text-right"><button onClick={() => setShowDelete(r.id)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md">Delete</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDelete && (
        <Modal title="Delete Entry" onClose={() => setShowDelete(null)}>
          <p className="text-sm text-on-surface-variant">Remove this food log entry?</p>
          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-outline-variant">
            <Button variant="ghost" onClick={() => setShowDelete(null)}>Cancel</Button>
            <button onClick={() => remove(showDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

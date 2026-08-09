import { useEffect, useState, useMemo, useRef } from "react";
import { foodLogsApi, type FoodLog } from "../../api/food-logs";
import { studentsApi } from "../../api/students";
import { settingsApi } from "../../api/settings";
import { useAuth } from "../../lib/auth";
import { Button, Money, Spinner } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../lib/toast";
import { api } from "../../lib/api";
import type { Student, SchoolSettings } from "../../types";

interface FoodPreset { id: string; itemName: string; unitPrice: string; unit: string; isActive: boolean; }

function parseSettingsTerm(termStr: string | undefined): number {
  const match = termStr?.match(/term\s*(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function parseSettingsYear(yearStr: string | undefined): number {
  const n = Number(yearStr);
  return isNaN(n) ? new Date().getFullYear() : n;
}

export default function FoodLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [presets, setPresets] = useState<FoodPreset[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateStudentName, setDuplicateStudentName] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      foodLogsApi.list({ term, academicYear }),
      api.get<FoodPreset[]>("/food-presets"),
      settingsApi.get().catch(() => null),
    ])
      .then(([logs, prst, s]) => {
        setLogs(logs || []);
        setPresets((prst || []).filter((p) => p.isActive));
        setSettings(s);
        // Auto-fill term / year from settings on first load
        if (!settingsLoaded && s) {
          setSettingsLoaded(true);
          const parsedTerm = parseSettingsTerm(s.currentTerm);
          const parsedYear = parseSettingsYear(s.currentAcademicYear);
          if (parsedTerm !== term) setTerm(parsedTerm);
          if (parsedYear !== academicYear) setAcademicYear(parsedYear);
        }
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [term, academicYear]);

  useEffect(() => {
    if (showDropdown) studentsApi.list({ status: "active" }).then(setAllStudents);
  }, [showDropdown]);

  // Only contribution logs matter for per-student tracking
  const contributionLogs = useMemo(() => logs.filter((l) => l.type === "contribution"), [logs]);

  const filteredDropdown = useMemo(() => {
    const q = studentSearch.toLowerCase();
    const boarding = allStudents.filter((s) => s.studentType === "boarding" || s.studentType === undefined);
    if (!q) return boarding.slice(0, 30);
    return boarding.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      (s.boardingHouse || "").toLowerCase().includes(q)
    );
  }, [allStudents, studentSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase();
    if (!q) return contributionLogs;
    return contributionLogs.filter((r) =>
      (r.studentName || "").toLowerCase().includes(q) ||
      r.itemName.toLowerCase().includes(q) ||
      (r.notes || "").toLowerCase().includes(q)
    );
  }, [contributionLogs, logSearch]);

  function handleStudentSelect(s: Student) {
    const alreadyLogged = contributionLogs.some(
      (l) => l.studentId === s.id
    );
    if (alreadyLogged) {
      setDuplicateStudentName(`${s.firstName} ${s.lastName}`);
      setShowDuplicateWarning(true);
    }
    setSelectedStudent(s);
    setShowDropdown(false);
    setStudentSearch(`${s.firstName} ${s.lastName}`);
    setItemQuantities({});
  }

  function handleQuantityChange(presetId: string, value: string) {
    setItemQuantities((prev) => ({ ...prev, [presetId]: value }));
  }

  async function submitBatch() {
    if (!selectedStudent) { toast.add("error", "Select a student first"); return; }
    const entries = presets
      .filter((p) => Number(itemQuantities[p.id] || 0) > 0)
      .map((p) => ({
        studentId: selectedStudent.id,
        itemName: p.itemName,
        type: "contribution",
        quantity: itemQuantities[p.id],
        unit: p.unit,
        term,
        academicYear,
      }));

    if (entries.length === 0) {
      toast.add("error", "Enter at least one quantity");
      return;
    }

    setSaving(true);
    try {
      for (const entry of entries) {
        await foodLogsApi.create(entry);
      }
      toast.add("success", `${entries.length} food item${entries.length > 1 ? "s" : ""} logged for ${selectedStudent.firstName} ${selectedStudent.lastName}`);
      // Reset form
      setItemQuantities({});
      setSelectedStudent(null);
      setStudentSearch("");
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try { await foodLogsApi.remove(id); toast.add("success", "Entry removed"); load(); setShowDelete(null); }
    catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
  }

  const totalValue = filteredLogs.reduce((s, r) => s + Number(r.estimatedValue || 0), 0);
  const totalStudents = new Set(filteredLogs.map((r) => r.studentId)).size;
  const collectiveCost = Number(settings?.collectiveFoodCost || 9000);
  const displayTerm = settings?.currentTerm || `Term ${term}`;
  const displayYear = settings?.currentAcademicYear || String(academicYear);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <PageNavigation title="Food Programme — Parent Contributions" description="Record food items brought in by parents for their children. (Meal consumption is tracked collectively via the Meal Timetable.)"
          quickSwitchers={[{ label: "Meal Timetable", to: "/fees/meal-timetable" }, { label: "Food Dashboard", to: "/fees/food-dashboard" }, { label: "Food Items & Stock", to: "/fees/food-presets" }]}
          activeQuickSwitcher="/fees/food-logs"
        />
      </div>
      {/* Breadcrumbs — shows student name upon selection */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <span className="text-on-surface-variant hover:text-on-surface cursor-pointer">Food Programme</span>
        <span className="text-on-surface-variant">/</span>
        <span className="text-on-surface-variant">Parent Contributions</span>
        {selectedStudent && (
          <>
            <span className="text-on-surface-variant">/</span>
            <span className="font-medium text-on-surface">
              {selectedStudent.firstName} {selectedStudent.lastName}
              <span className="text-xs text-on-surface-variant font-normal"> ({selectedStudent.grade})</span>
            </span>
          </>
        )}
      </nav>

      {!loading && contributionLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6 w-full">
          <div className="bg-gradient-to-br from-primary-container to-primary-container rounded-2xl p-4 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Contributions</p>
            <p className="text-2xl font-bold text-primary mt-1">{filteredLogs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Students</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{totalStudents}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Collective Cost</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">KES {collectiveCost.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="mx-auto bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden mb-6 max-w-4xl">
        <div className="p-5">
          <h3 className="font-semibold text-on-surface mb-4">Record Contribution</h3>

          {/* Term / Year display bar — auto-filled from settings */}
          <div className="mt-2 flex items-center gap-2 bg-primary-fixed rounded-lg px-3 py-2 text-sm mb-4">
            <span className="font-medium text-on-primary-fixed">
              Term: {displayTerm}
            </span>
            <span className="text-xs text-on-primary-fixed-variant">· Year: {displayYear}</span>
          </div>

          {/* Student selection FIRST */}
          <div className="mb-4">
            <label className="text-xs text-on-surface-variant font-medium mb-1 block">Student *</label>
            <div className="relative">
              <input
                ref={searchRef}
                value={studentSearch}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Type student name, grade, or house..."
              />
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                  {filteredDropdown.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-6">No active boarding students found.</p>
                  ) : filteredDropdown.map((s) => (
                    <div
                      key={s.id}
                      onMouseDown={() => handleStudentSelect(s)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-container cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-on-surface-variant">{s.grade} · {s.boardingHouse || "No house"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedStudent && (
              <div className="mt-2 flex items-center gap-2 bg-primary-fixed rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-on-primary-fixed">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
                <span className="text-xs text-on-primary-fixed-variant">· {selectedStudent.grade} · {selectedStudent.boardingHouse || "No house"}</span>
                <button
                  onClick={() => { setSelectedStudent(null); setStudentSearch(""); setItemQuantities({}); }}
                  className="ml-auto text-xs text-on-primary-fixed-variant hover:text-error"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Food items template table — shown only after student selected */}
          {selectedStudent && (
            <div className="mb-6">
              <label className="text-xs text-on-surface-variant font-medium mb-1 block">
                Food Items &amp; Quantities
              </label>
              {presets.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4">No active food presets available. Add some in Food Presets.</p>
              ) : (
                <div className="border border-outline-variant rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-left text-xs text-on-surface-variant uppercase tracking-wider">
                        <th className="px-3 py-2 font-medium">Food Item</th>
                        <th className="px-3 py-2 font-medium">Unit</th>
                        <th className="px-3 py-2 font-medium text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {presets.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-medium text-on-surface">{p.itemName}</td>
                          <td className="px-3 py-2 text-on-surface-variant">{p.unit}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={itemQuantities[p.id] || ""}
                              onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                              className="w-24 rounded-lg border border-outline px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-on-surface-variant mt-1">
                Collective food cost: KES {collectiveCost.toLocaleString()} (all food items combined)
              </p>
            </div>
          )}

          {/* Clear / Submit — prominent button below the form */}
          <div className={selectedStudent ? "flex gap-3" : "flex justify-end"}>
            {selectedStudent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setItemQuantities({});
                  setSelectedStudent(null);
                  setStudentSearch("");
                }}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={submitBatch}
              disabled={saving || !selectedStudent}
              className="bg-gradient-to-r from-rose-600 to-rose-500 text-white flex-1 sm:flex-none"
            >
              {saving ? "Logging..." : selectedStudent ? `Record ${selectedStudent.firstName}` : "Select a student"}
            </Button>
          </div>
         </div>
       </div>

       {/* Duplicate student warning popup */}
       {showDuplicateWarning && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
           <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant p-6 max-w-sm mx-4">
             <h3 className="font-semibold text-on-surface text-lg mb-2">Student Already Recorded</h3>
             <p className="text-sm text-on-surface-variant mb-5">
               {duplicateStudentName} already has contribution entries for this term.
               You are now editing their records — new entries will be added alongside existing ones.
             </p>
             <div className="flex justify-end gap-2">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   setShowDuplicateWarning(false);
                   setSelectedStudent(null);
                   setStudentSearch("");
                   setItemQuantities({});
                 }}
               >
                 Cancel
               </Button>
               <Button
                 size="sm"
                 onClick={() => setShowDuplicateWarning(false)}
                 className="bg-gradient-to-r from-rose-600 to-rose-500 text-white"
               >
                 Continue Editing
               </Button>
             </div>
           </div>
         </div>
       )}

       {/* Entries table */}
       <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden mx-auto max-w-4xl">
        <div className="p-4 border-b border-outline-variant flex items-center gap-3">
          <svg
            className="w-4 h-4 text-on-surface-variant shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Search entries by student, item..."
            className="flex-1 text-sm outline-none"
          />
          <span className="text-xs text-on-surface-variant shrink-0">{filteredLogs.length} entries</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">
            {logSearch ? "No matches." : "No contributions logged yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  {isAdmin && <th className="px-4 py-3 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredLogs.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(r.loggedAt).toLocaleDateString("en-KE")}
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">
                      {r.studentName || "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.studentGrade || "—"}</td>
                    <td className="px-4 py-3 text-on-surface">{r.itemName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      <Money value={r.estimatedValue || "0"} />
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-[140px] truncate">
                      {r.notes || "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setShowDelete(r.id)}
                          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDelete && (
        <Modal title="Delete Entry" onClose={() => setShowDelete(null)}>
          <p className="text-sm text-on-surface-variant">Remove this contribution log entry?</p>
          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-outline-variant">
            <Button variant="ghost" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <button
              onClick={() => remove(showDelete)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
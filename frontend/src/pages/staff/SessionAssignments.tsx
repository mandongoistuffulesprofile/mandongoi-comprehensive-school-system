import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { staffApi } from "../../api/staff";
import { useAuth } from "../../lib/auth";
import { Button, Card, Spinner } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import type { SessionAssignment, Staff } from "../../types";
import clsx from "clsx";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SESSION_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "weekend", label: "Weekend" },
];
const SESSION_COLORS: Record<string, string> = {
  morning: "bg-amber-100 text-amber-700",
  evening: "bg-indigo-100 text-indigo-700",
  weekend: "bg-purple-100 text-purple-700",
};

export default function SessionAssignments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();

  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newStaffId, setNewStaffId] = useState("");
  const [newSessionType, setNewSessionType] = useState("morning");
  const [newDayOfWeek, setNewDayOfWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<SessionAssignment[]>("/session-assignments"),
      staffApi.list({ isActive: true }),
    ]).then(([a, s]) => {
      setAssignments(a);
      setStaffList(s);
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function createAssignment() {
    if (!newStaffId) return;
    setSaving(true);
    try {
      await api.post("/session-assignments", { staffId: newStaffId, sessionType: newSessionType, dayOfWeek: newDayOfWeek });
      toast.add("success", "Session assigned");
      setShowForm(false);
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(id: string) {
    try {
      await api.delete(`/session-assignments/${id}`);
      toast.add("success", "Assignment removed");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed");
    }
  }

  async function generatePayments() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    setGenerating(true);
    try {
      const res = await api.post<{ created: number; skipped: number }>("/session-assignments/generate-payments", { month, year });
      toast.add("success", `${res.created} payment records created (${res.skipped} already existed)`);
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageNavigation
        title="Session Assignments"
        description="Assign teachers to Morning, Evening, and Weekend sessions. These feed into payroll extra duty calculations."
        quickSwitchers={[{ label: "Class Teachers", to: "/staff/class-teachers" }, { label: "Salaries & Payroll", to: "/payroll" }]}
        activeQuickSwitcher="/staff/session-assignments"        actions={isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={generatePayments} disabled={generating}>
              {generating ? "Generating..." : "Generate for Payroll"}
            </Button>
            <Button onClick={() => { setShowForm(true); setNewStaffId(""); setNewSessionType("morning"); setNewDayOfWeek(1); }}>
              + Assign Session
            </Button>
          </div>
        )}
      />

      {showForm && (
        <Card className="p-5 mb-6 border-primary/20">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Teacher *</label>
              <Dropdown
                value={newStaffId}
                options={staffList.map((s) => ({ value: s.id, label: s.name }))}
                onChange={setNewStaffId}
                placeholder="Select teacher..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Session *</label>
              <Dropdown value={newSessionType} options={SESSION_OPTIONS} onChange={setNewSessionType} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Day *</label>
              <Dropdown
                value={String(newDayOfWeek)}
                options={DAYS.map((d, i) => ({ value: String(i), label: d }))}
                onChange={(v) => setNewDayOfWeek(Number(v))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createAssignment} disabled={saving || !newStaffId}>
                {saving ? "Saving..." : "Assign"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-on-surface-variant">No session assignments yet. Click "+ Assign Session" to add one.</Card>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-5 py-4 hover:border-outline transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-sm font-bold text-on-surface-variant">
                  {a.staffName?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{a.staffName}</p>
                  <p className="text-sm text-on-surface-variant">{DAYS[a.dayOfWeek]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", SESSION_COLORS[a.sessionType] || "bg-surface-container text-on-surface-variant")}>
                  {a.sessionType}
                </span>
                {isAdmin && (
                  <button onClick={() => removeAssignment(a.id)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg font-medium transition-colors">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-surface-container-low rounded-xl border border-outline-variant p-4 text-sm text-on-surface-variant">
        <p className="font-medium text-on-surface mb-1">How this works</p>
        <p>Assign teachers to session types on specific days. When ready, click <strong>"Generate for Payroll"</strong> to create extra duty payment records for the current month. These payments then appear in the <strong>Payroll Run Detail</strong> page under Extra Duty / Per Diem.</p>
      </div>
    </div>
  );
}

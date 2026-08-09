import { useEffect, useState } from "react";
import { staffApi, staffAttendanceApi } from "../../api/staff";
import type { Staff, StaffAttendance, StaffAttendanceStatus } from "../../types";
import { Button, EnumBadge, Card } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<StaffAttendanceStatus>("present");
  const [sessions, setSessions] = useState(0);
  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    staffApi.list().then(setStaff);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    staffAttendanceApi.listForStaff(selected).then(setRecords).finally(() => setLoading(false));
  }, [selected]);

  async function mark() {
    if (!selected) return;
    try {
      await staffAttendanceApi.mark({ staffId: selected, date, status, sessionsTaught: sessions });
      toast.add("success", "Attendance recorded");
      setLoading(true);
      staffAttendanceApi.listForStaff(selected).then(setRecords).finally(() => setLoading(false));
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to mark attendance");
    }
  }

  return (
    <div>
      <PageNavigation title="Staff Attendance" description="Feeds payroll entry generation for session-based staff."
        quickSwitchers={[{ label: "Staff Records", to: "/staff" }, { label: "Class Teachers", to: "/staff/class-teachers" }]}
        activeQuickSwitcher="/staff/attendance"/>

      <Card className="p-5 flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Staff Member</label>
          <Dropdown
            value={selected}
            options={staff.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSelected}
            placeholder="Select..."
            className="min-w-[200px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Status</label>
          <Dropdown
            value={status}
            options={[
              { value: "present", label: "Present" },
              { value: "absent", label: "Absent" },
              { value: "halfDay", label: "Half Day" },
              { value: "leave", label: "Leave" },
            ]}
            onChange={(v) => setStatus(v as StaffAttendanceStatus)}
            placeholder="Status"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Sessions</label>
          <input type="number" value={sessions} onChange={(e) => setSessions(Number(e.target.value))} className="rounded-lg border border-outline px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <Button onClick={mark} disabled={!selected}>Mark</Button>
      </Card>

      {selected && (
        loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" /></div>
        ) : records.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No attendance recorded for this staff member yet.</p>
        ) : (
          <div className="space-y-1">
            {records.map((r) => (
              <Card key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="font-mono">{new Date(r.date).toLocaleDateString()}</span>
                  <span className="font-mono text-on-surface-variant">{r.sessionsTaught} sessions</span>
                </div>
                <EnumBadge value={r.status} />
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

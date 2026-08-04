import { useEffect, useState, useRef } from "react";
import { studentsApi } from "../../api/students";
import { Button, Card, PageHeader, EnumBadge } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { DataTable } from "../../components/ui/DataTable";
import { useToast } from "../../lib/toast";
import { api } from "../../lib/api";
import type { Student } from "../../types";

interface LeaveNote {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  reason: string;
  leaveDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: "approved" | "pending" | "rejected";
  notedByName?: string;
  approvedAt?: string;
  printedAt?: string;
  createdAt: string;
}

export default function LeaveNotes() {
  const [notes, setNotes] = useState<LeaveNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPrint, setShowPrint] = useState<LeaveNote | null>(null);
  const toast = useToast();

  function load() {
    setLoading(true);
    api.get<LeaveNote[]>("/leave-notes").then(setNotes).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handlePrint(note: LeaveNote) {
    try {
      const updated = await api.patch<LeaveNote>(`/leave-notes/${note.id}/print`);
      setShowPrint(updated);
      load();
    } catch (e) {
      toast.add("error", "Failed to print note");
    }
  }

  async function approve(id: string) {
    try {
      await api.patch(`/leave-notes/${id}`, { status: "approved" });
      toast.add("success", "Leave approved — attendance marked as excused");
      load();
    } catch (e) {
      toast.add("error", "Failed to approve");
    }
  }

  async function markReturned(id: string) {
    try {
      await api.patch(`/leave-notes/${id}/return`);
      toast.add("success", "Student marked as returned — attendance set to present");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to mark return");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Leave Notes"
        description="Record and manage student leave requests. Print leave notes for parent signatures."
        actions={<Button onClick={() => setShowCreate(true)}>+ New Leave Note</Button>}
      />

      <DataTable
        columns={[
          { header: "Student", cell: (n) => <span className="font-medium">{n.studentName}</span> },
          { header: "Grade", cell: (n) => n.grade },
          { header: "Leave Date", cell: (n) => new Date(n.leaveDate).toLocaleDateString("en-KE") },
          { header: "Expected Return", cell: (n) => new Date(n.expectedReturnDate).toLocaleDateString("en-KE") },
          { header: "Actual Return", cell: (n) => n.actualReturnDate ? new Date(n.actualReturnDate).toLocaleDateString("en-KE") : <span className="text-outline-variant">\u2014</span> },
          { header: "Status", cell: (n) => <EnumBadge value={n.status} /> },
          { header: "Signed By", cell: (n) => n.notedByName ? <span className="text-xs text-on-surface-variant">{n.notedByName}</span> : <span className="text-outline-variant">\u2014</span> },
        ]}
        rows={notes}
        loading={loading}
        actions={(n) => (
          <div className="flex gap-1 items-center">
            {n.status === "pending" && (
              <button onClick={() => approve(n.id)} className="px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded">Approve</button>
            )}
            {n.status === "approved" && !n.actualReturnDate && (
              <button onClick={() => markReturned(n.id)} className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded">Mark Returned</button>
            )}
            <button onClick={() => handlePrint(n)} className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded">Print</button>
          </div>
        )}
      />

      {showCreate && <CreateLeaveModal onClose={() => setShowCreate(false)} onDone={load} />}
      {showPrint && <PrintLeaveModal note={showPrint} onClose={() => setShowPrint(null)} />}
    </div>
  );
}

function CreateLeaveModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [reason, setReason] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { studentsApi.list().then(setStudents); }, []);

  const filtered = students.filter((s) => {
    if (!query) return false;
    const q = query.toLowerCase();
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q);
  }).slice(0, 20);

  async function submit() {
    if (!selectedStudent || !reason || !leaveDate || !expectedReturnDate) return;
    setSaving(true);
    try {
      await api.post("/leave-notes", { studentId: selectedStudent.id, reason, leaveDate, expectedReturnDate });
      toast.add("success", "Leave note created");
      onDone();
      onClose();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Leave Note" onClose={onClose}>
      <div className="space-y-4 min-w-[400px]">
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Student *</label>
          <div className="relative">
            <input
              ref={inputRef}
              value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName} · ${selectedStudent.grade}` : query}
              onChange={(e) => { setQuery(e.target.value); setSelectedStudent(null); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Search student by name..."
              className="w-full rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {showDropdown && filtered.length > 0 && !selectedStudent && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => { setSelectedStudent(s); setQuery(""); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-container transition-colors border-b border-outline-variant last:border-0"
                  >
                    <span className="font-medium text-on-surface">{s.firstName} {s.lastName}</span>
                    <span className="text-on-surface-variant ml-2">{s.grade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <FormField spec={{ name: "reason", label: "Reason for Leave", type: "textarea", required: true }} value={reason} onChange={(v) => setReason(v as string)} />
        <div className="grid grid-cols-2 gap-3">
          <FormField spec={{ name: "leaveDate", label: "Leave Date", type: "date", required: true }} value={leaveDate} onChange={(v) => setLeaveDate(v as string)} />
          <FormField spec={{ name: "expectedReturnDate", label: "Expected Return", type: "date", required: true }} value={expectedReturnDate} onChange={(v) => setExpectedReturnDate(v as string)} />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !selectedStudent}>{saving ? "Saving..." : "Create Leave Note"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function PrintLeaveModal({ note, onClose }: { note: LeaveNote; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const formattedTime = now.toLocaleString("en-KE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Leave Note - ${note.studentName}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; color: #666; font-size: 13px; margin-bottom: 24px; }
        .line { border-top: 2px solid #000; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { font-weight: 600; color: #333; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
        .sig { display: flex; justify-content: space-between; margin-top: 48px; }
        .sig div { text-align: center; }
        .sig .line2 { border-top: 1px solid #000; width: 180px; margin-top: 32px; }
        .sig-section { margin-top: 48px; }
        .sig-row { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .sig-row div { text-align: center; }
        .sig-line { border-top: 1px solid #000; width: 200px; margin-top: 32px; display: inline-block; }
      </style></head>
      <body>
        <h1>STUDENT LEAVE NOTE</h1>
        <p class="sub">${note.studentName} · ${note.grade}</p>
        <div class="line"></div>
        <div class="row"><span class="label">Student</span><span>${note.studentName}</span></div>
        <div class="row"><span class="label">Grade</span><span>${note.grade}</span></div>
        <div class="row"><span class="label">Reason for Leave</span><span>${note.reason}</span></div>
        <div class="row"><span class="label">Leave Date</span><span>${new Date(note.leaveDate).toLocaleDateString("en-KE")}</span></div>
        <div class="row"><span class="label">Expected Return Date</span><span>${new Date(note.expectedReturnDate).toLocaleDateString("en-KE")}</span></div>
        <div class="row"><span class="label">Status</span><span>${note.status.toUpperCase()}</span></div>
        <div class="row"><span class="label">Teacher Approving</span><span>${note.notedByName || "—"}</span></div>
        <div class="row"><span class="label">Approved At</span><span>${note.approvedAt ? new Date(note.approvedAt).toLocaleString("en-KE") : formattedTime}</span></div>
        <div class="line"></div>
        <div class="sig-section">
          <div class="sig-row">
            <div><div class="sig-line"></div><p>Parent/Guardian Signature</p></div>
            <div><div class="sig-line"></div><p>Teacher/Admin Signature</p></div>
          </div>
          <div style="text-align:center;margin-top:16px;">
            <div class="sig-line" style="width:300px;"></div>
            <p>Witness / Head of Institution Signature</p>
          </div>
        </div>
        <p class="footer">Printed on ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString("en-KE")}</p>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <Modal title="Leave Note" onClose={onClose}>
      <div className="min-w-[400px]" ref={printRef}>
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-bold text-center">{note.studentName}</h2>
          <p className="text-xs text-center text-on-surface-variant">{note.grade}</p>
          <div className="border-t border-outline-variant my-3" />
          {[
            ["Reason", note.reason],
            ["Leave Date", new Date(note.leaveDate).toLocaleDateString("en-KE")],
            ["Expected Return", new Date(note.expectedReturnDate).toLocaleDateString("en-KE")],
            ["Status", note.status.toUpperCase()],
            ["Teacher Approving", note.notedByName || "—"],
            ["Approved At", note.approvedAt ? new Date(note.approvedAt).toLocaleString("en-KE") : formattedTime],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-sm py-1">
              <span className="font-medium text-on-surface-variant">{label as string}</span>
              <span>{value as string}</span>
            </div>
          ))}
        </Card>
        <div className="border-t border-outline-variant mt-4 pt-4">
          <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto text-center text-xs text-on-surface-variant">
            <div>
              <div className="border-t border-outline mt-8 mb-1" />
              <span>Parent/Guardian Signature</span>
            </div>
            <div>
              <div className="border-t border-outline mt-8 mb-1" />
              <span>Teacher/Admin Signature</span>
            </div>
          </div>
          <div className="text-center text-xs text-on-surface-variant mt-4">
            <div className="border-t border-outline w-48 mx-auto mt-6 mb-1" />
            <span>Witness / Head of Institution Signature</span>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={handlePrint}>🖨️ Print Leave Note</Button>
        </div>
      </div>
    </Modal>
  );
}

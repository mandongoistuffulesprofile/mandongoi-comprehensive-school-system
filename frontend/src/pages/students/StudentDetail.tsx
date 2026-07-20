import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { studentsApi } from "../../api/students";
import { guardiansApi } from "../../api/guardians";
import { invoicesApi } from "../../api/fees";
import { attendanceApi } from "../../api/attendance";
import { assessmentsApi, reportCardsApi, learningAreasApi } from "../../api/academic";
import { useAuth } from "../../lib/auth";
import type { Assessment, FeeInvoice, Guardian, ReportCard, Student, StudentAttendance, LearningArea } from "../../types";
import { EnumBadge, Money, CompetencyDots, PageHeader, Card, Button } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import Dropdown from "../../components/ui/Dropdown";
import { LoadingScreen } from "../../components/ui/Basics";
import { useToast } from "../../lib/toast";

import { printReportCard } from "../../utils/printReportCard";
import { settingsApi } from "../../api/settings";
import { foodLogsApi, type FoodLog } from "../../api/food-logs";
import clsx from "clsx";

type Tab = "overview" | "guardians" | "invoices" | "attendance" | "assessments" | "report-cards" | "food";

export default function StudentDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsApi.get(id).then(setStudent).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingScreen label="Loading student..." />;
  if (!student) return <p className="text-surface-500">Student not found.</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "guardians", label: "Guardians" },
    { key: "invoices", label: "Fees" },
    { key: "attendance", label: "Attendance" },
    { key: "assessments", label: "Marks" },
    { key: "report-cards", label: "Report Card" },
    { key: "food", label: "Food" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/students" className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to students
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">{student.firstName} {student.lastName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-surface-500">
                <span className="capitalize">{student.level?.replace("_", " ")}</span>
                <span>·</span>
                <span>{student.grade}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <EnumBadge value={student.status} />
                {student.gender && <span className="text-xs text-surface-400 capitalize">{student.gender}</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 border-b border-surface-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-brand-600 text-brand-600" : "border-transparent text-surface-500 hover:text-surface-700"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab studentId={id} />}
      {tab === "guardians" && <GuardiansTab studentId={id} canWrite={user?.role === "schoolAdmin"} />}
      {tab === "invoices" && <InvoicesTab studentId={id} />}
      {tab === "attendance" && <AttendanceTab studentId={id} canWrite={user?.role === "schoolAdmin" || user?.role === "teacher"} />}
      {tab === "assessments" && <AssessmentsTab studentId={id} />}
      {tab === "report-cards" && <ReportCardsTab studentId={id} canWrite={user?.role === "schoolAdmin" || user?.role === "teacher"} canPublish={user?.role === "schoolAdmin"} />}
      {tab === "food" && <FoodTab studentId={id} />}
    </div>
  );
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contribution: { label: 'Brought in', color: 'text-emerald-700 bg-emerald-50' },
  consumption: { label: 'Ate', color: 'text-blue-700 bg-blue-50' },
  purchase: { label: 'School bought', color: 'text-amber-700 bg-amber-50' },
  wastage: { label: 'Wastage', color: 'text-red-700 bg-red-50' },
  payment: { label: 'Paid', color: 'text-purple-700 bg-purple-50' },
};

function FoodTab({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    setLoading(true);
    foodLogsApi.list({ studentId }).then((data) => {
      setLogs(data);
      setTotalValue(data.reduce((s, r) => s + Number(r.estimatedValue || 0), 0));
    }).finally(() => setLoading(false));
  }, [studentId]);

  const contributions = logs.filter((l) => l.type === "contribution");
  const payments = logs.filter((l) => l.type === "payment");
  const consumption = logs.filter((l) => l.type === "consumption");

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      {contributions.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Food Items Brought In</h3>
          <div className="space-y-2">
            {contributions.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-100 last:border-0">
                <div>
                  <span className="font-medium text-surface-800">{l.quantity} {l.unit} {l.itemName}</span>
                  {l.notes && <span className="text-surface-400 ml-2 text-xs">{l.notes}</span>}
                </div>
                <span className="text-xs text-surface-400">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {payments.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Money Paid for Food</h3>
          <div className="space-y-2">
            {payments.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-100 last:border-0">
                <div>
                  <span className="font-medium text-surface-800">KES {Number(l.estimatedValue).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  {l.notes && <span className="text-surface-400 ml-2 text-xs">{l.notes}</span>}
                </div>
                <span className="text-xs text-surface-400">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {consumption.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Food Consumed</h3>
          <div className="space-y-2">
            {consumption.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-100 last:border-0">
                <div>
                  <span className="font-medium text-surface-800">{l.quantity} {l.unit} {l.itemName}</span>
                </div>
                <span className="text-xs text-surface-400">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {logs.length === 0 && (
        <Card className="p-5">
          <p className="text-sm text-surface-400 text-center py-6">No food activity recorded for this student yet.</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <p className="text-xs text-emerald-600 font-medium">Total Brought In</p>
          <p className="text-lg font-bold text-emerald-900">{contributions.length} entries</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Total Paid (KES)</p>
          <p className="text-lg font-bold text-purple-900">KES {payments.reduce((s, l) => s + Number(l.estimatedValue || 0), 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Total Consumed</p>
          <p className="text-lg font-bold text-blue-900">{consumption.length} entries</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ studentId }: { studentId: string }) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      guardiansApi.list(studentId).catch(() => [] as Guardian[]),
      invoicesApi.list({ studentId }).catch(() => [] as FeeInvoice[]),
      attendanceApi.listForStudent(studentId).catch(() => [] as StudentAttendance[]),
      assessmentsApi.listForStudent(studentId).catch(() => [] as Assessment[]),
    ]).then(([g, i, a, as]) => {
      setGuardians(g);
      setInvoices(i);
      setAttendance(a);
      setAssessments(as);
    }).finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <LoadingScreen />;

  const totalBalance = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
  const absences = attendance.filter((a) => a.status !== "present").length;
  const totalDays = attendance.length || 1;
  const attendanceRate = Math.round(((totalDays - absences) / totalDays) * 100);
  const avgScore = assessments.filter((a) => a.score).reduce((s, a) => s + Number(a.score || 0), 0) / (assessments.filter((a) => a.score).length || 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-5 col-span-2 space-y-4">
        <h3 className="font-semibold text-surface-900">Guardians</h3>
        {guardians.length === 0 ? <p className="text-sm text-surface-400">No guardians on file</p> : (
          guardians.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
              <div><p className="text-sm font-medium">{g.name} {g.isPrimary && <span className="text-xs text-brand-600">Primary</span>}</p>
              <p className="text-xs text-surface-400 font-mono">{g.phone}</p></div>
              {g.smsOptOut && <span className="text-xs text-red-500">SMS Opted Out</span>}
            </div>
          ))
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-5 space-y-2">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Fee Balance</p>
          <p className={clsx("text-2xl font-bold", totalBalance > 0 ? "text-red-600" : "text-emerald-600")}>
            {totalBalance > 0 ? <Money value={totalBalance} /> : "KES 0"}
          </p>
          <p className="text-xs text-surface-400">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-5 space-y-2">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Attendance Rate</p>
          <p className={clsx("text-2xl font-bold", attendanceRate >= 90 ? "text-emerald-600" : attendanceRate >= 75 ? "text-amber-600" : "text-red-600")}>{attendanceRate}%</p>
          <p className="text-xs text-surface-400">{absences} absent{absences !== 1 ? "s" : ""} out of {totalDays} day{totalDays !== 1 ? "s" : ""}</p>
        </Card>
        {assessments.length > 0 && (
          <Card className="p-5 space-y-2">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Avg Score</p>
            <p className={clsx("text-2xl font-bold", avgScore >= 80 ? "text-emerald-600" : avgScore >= 50 ? "text-amber-600" : "text-red-600")}>{Math.round(avgScore)}%</p>
            <p className="text-xs text-surface-400">{assessments.length} assessment{assessments.length !== 1 ? "s" : ""}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function GuardiansTab({ studentId, canWrite }: { studentId: string; canWrite: boolean }) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [bulkGuardians, setBulkGuardians] = useState<Record<string, unknown>[]>([{}]);
  const toast = useToast();

  function load() { setLoading(true); guardiansApi.list(studentId).then(setGuardians).finally(() => setLoading(false)); }
  useEffect(load, [studentId]);

  async function save() {
    try {
      await guardiansApi.create({ studentId, ...form } as Partial<Guardian>);
      toast.add("success", "Guardian added"); setShowForm(false); setForm({}); load();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed to add guardian"); }
  }

  async function saveBulk() {
    try {
      await guardiansApi.createBulk(studentId, bulkGuardians as any);
      toast.add("success", "Guardians added"); setShowBulk(false); setBulkGuardians([{}]); load();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed to add guardians"); }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      {canWrite && <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowForm(true)}>+ Add Guardian</Button>
        <Button variant="secondary" onClick={() => setShowBulk(true)}>+ Bulk Add</Button>
      </div>}
      <div className="space-y-2">
        {guardians.length === 0 && <p className="text-surface-500 text-sm">No guardians on file.</p>}
        {guardians.map((g) => (
          <Card key={g.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-surface-900">{g.name} {g.isPrimary && <span className="text-xs text-brand-600 ml-1 font-normal">Primary</span>}</p>
              <p className="text-xs text-surface-500 font-mono mt-0.5">{g.phone} · {g.relationship}</p>
            </div>
            {g.smsOptOut && <span className="text-xs text-red-500 font-medium">SMS opted out</span>}
          </Card>
        ))}
      </div>
      {showForm && (
        <Modal title="Add Guardian" onClose={() => setShowForm(false)}>
          <div className="space-y-5">
            <FormField spec={{ name: "name", label: "Name", required: true }} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <FormField spec={{ name: "phone", label: "Phone", required: true, placeholder: "2547XXXXXXXX" }} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <FormField spec={{ name: "relationship", label: "Relationship", required: true }} value={form.relationship} onChange={(v) => setForm({ ...form, relationship: v })} />
            <FormField spec={{ name: "preferredLanguage", label: "Language", type: "select", options: [{ value: "en", label: "English" }, { value: "sw", label: "Swahili" }] }} value={form.preferredLanguage} onChange={(v) => setForm({ ...form, preferredLanguage: v })} />
            <FormField spec={{ name: "isPrimary", label: "Primary guardian", type: "checkbox" }} value={form.isPrimary} onChange={(v) => setForm({ ...form, isPrimary: v })} />
            <FormField spec={{ name: "smsOptOut", label: "Opted out of SMS", type: "checkbox" }} value={form.smsOptOut} onChange={(v) => setForm({ ...form, smsOptOut: v })} />
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-200">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
      {showBulk && (
        <Modal title="Bulk Add Guardians" onClose={() => setShowBulk(false)}>
          <div className="space-y-4">
            {bulkGuardians.map((g, i) => (
              <div key={i} className="p-3 bg-surface-50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-surface-500">Guardian #{i + 1}</span>
                  {bulkGuardians.length > 1 && <button onClick={() => setBulkGuardians((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-500 hover:underline">Remove</button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField spec={{ name: "name", label: "Name", required: true }} value={g.name} onChange={(v) => setBulkGuardians((prev) => prev.map((pg, idx) => idx === i ? { ...pg, name: v } : pg))} />
                  <FormField spec={{ name: "phone", label: "Phone", required: true, placeholder: "2547XXXXXXXX" }} value={g.phone} onChange={(v) => setBulkGuardians((prev) => prev.map((pg, idx) => idx === i ? { ...pg, phone: v } : pg))} />
                </div>
                <FormField spec={{ name: "relationship", label: "Relationship" }} value={g.relationship} onChange={(v) => setBulkGuardians((prev) => prev.map((pg, idx) => idx === i ? { ...pg, relationship: v } : pg))} />
              </div>
            ))}
            <Button variant="ghost" onClick={() => setBulkGuardians((prev) => [...prev, {}])}>+ Add Another</Button>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-200">
              <Button variant="ghost" onClick={() => setShowBulk(false)}>Cancel</Button>
              <Button onClick={saveBulk}>Save All ({bulkGuardians.length})</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InvoicesTab({ studentId }: { studentId: string }) {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { invoicesApi.list({ studentId }).then(setInvoices).finally(() => setLoading(false)); }, [studentId]);
  if (loading) return <LoadingScreen />;
  if (invoices.length === 0) return <p className="text-surface-500 text-sm">No invoices for this student.</p>;
  return (<div className="space-y-2">{invoices.map((inv) => (
    <Card key={inv.id} className="px-5 py-4 flex items-center justify-between">
      <div><p className="text-sm font-medium text-surface-900">Term {inv.term} · {inv.academicYear}</p>
      <p className="text-xs text-surface-500 mt-0.5"><Money value={inv.totalAmount} /> total, <Money value={inv.balance} /> balance</p></div>
      <EnumBadge value={inv.status} />
    </Card>
  ))}</div>);
}

function AttendanceTab({ studentId, canWrite }: { studentId: string; canWrite: boolean }) {
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"absent" | "late" | "excused">("absent");
  const toast = useToast();
  function load() { setLoading(true); attendanceApi.listForStudent(studentId).then(setRecords).finally(() => setLoading(false)); }
  useEffect(load, [studentId]);
  async function mark() {
    try { await attendanceApi.mark({ studentId, date, status }); toast.add("success", "Marked"); load(); }
    catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div>
      {canWrite && (
        <Card className="p-5 flex flex-wrap items-end gap-3 mb-4">
          <div><label className="block text-xs font-medium text-surface-500 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" /></div>
          <div><label className="block text-xs font-medium text-surface-500 mb-1">Status</label>
            <Dropdown
              value={status}
              options={[
                { value: "absent", label: "Absent" },
                { value: "late", label: "Late" },
                { value: "excused", label: "Excused" },
              ]}
              onChange={(v) => setStatus(v as typeof status)}
              placeholder="Status"
            /></div>
          <Button onClick={mark}>Log Exception</Button>
        </Card>
      )}
      {loading ? <LoadingScreen /> : records.length === 0 ? <p className="text-surface-500 text-sm">No absences logged.</p> : (
        <div className="space-y-1">{records.map((r) => (
          <Card key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <span className="font-mono">{new Date(r.date).toLocaleDateString()}</span>
            <EnumBadge value={r.status} />
          </Card>
        ))}</div>
      )}
    </div>
  );
}

function AssessmentsTab({ studentId }: { studentId: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  function load() { setLoading(true); assessmentsApi.listForStudent(studentId).then(setAssessments).finally(() => setLoading(false)); }
  useEffect(load, [studentId]);
  if (loading) return <LoadingScreen />;
  return (
    <div className="space-y-2">
      {assessments.length === 0 && <p className="text-surface-500 text-sm">No assessments recorded.</p>}
      {assessments.map((a) => (
        <Card key={a.id} className="px-5 py-4 flex items-center justify-between">
          <div><p className="text-sm font-medium text-surface-900">Term {a.term} · {a.academicYear} · <span className="capitalize">{a.type}</span></p>
          {a.remarks && <p className="text-xs text-surface-500 mt-0.5">{a.remarks}</p>}</div>
          <CompetencyDots level={a.performanceLevel} />
        </Card>
      ))}
    </div>
  );
}

function ReportCardsTab({ studentId, canWrite, canPublish }: { studentId: string; canWrite: boolean; canPublish: boolean }) {
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([
      reportCardsApi.listForStudent(studentId).catch(() => []),
      learningAreasApi.list().catch(() => []),
      assessmentsApi.listForStudent(studentId).catch(() => []),
    ]).then(([c, la, as]) => { setCards(c); setLearningAreas(la); setAssessments(as); }).finally(() => setLoading(false));
  }
  useEffect(load, [studentId]);

  async function publish(id: string) { await reportCardsApi.publish(id); load(); toast.add("success", "Published"); }

  function printReportCard(card: ReportCard) {
    const studentName = document.querySelector("h1")?.textContent || "Student";
    const grade = document.querySelector("[class*='text-surface-500']")?.textContent || "";
    const win = window.open("", "_blank");
    if (!win) return;
    const termAssessments = assessments.filter((a) => a.term === card.term && a.academicYear === Number(card.academicYear));
    win.document.write(`
      <html><head><title>Report Card - ${studentName}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1510; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 2px; }
        .school { text-align: center; color: #7a654d; font-size: 14px; margin-bottom: 4px; }
        .sub { text-align: center; color: #9a8065; font-size: 12px; margin-bottom: 24px; }
        .line { border-top: 2px solid #1a1510; margin: 16px 0; }
        .info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f0ece7; text-align: left; padding: 8px 12px; border-bottom: 2px solid #ded6cc; }
        td { padding: 8px 12px; border-bottom: 1px solid #ded6cc; }
        .score { text-align: center; }
        .grade { text-align: center; font-weight: 600; }
        .footer { margin-top: 32px; }
        .comments { background: #faf8f6; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
        .sig { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-line { border-top: 1px solid #000; width: 200px; padding-top: 4px; font-size: 11px; text-align: center; color: #7a654d; }
      </style></head><body>
        <h1>SCHOOL REPORT CARD</h1>
        <p class="school">${grade}</p>
        <p class="sub">Term ${card.term} · ${card.academicYear}</p>
        <div class="line"></div>
        <div class="info">
          <span><strong>Student:</strong> ${studentName}</span>
          <span><strong>Term:</strong> ${card.term}</span>
          <span><strong>Year:</strong> ${card.academicYear}</span>
        </div>
        <table>
          <tr><th>Subject</th><th class="score">Score</th><th class="grade">Grade</th><th>Remarks</th></tr>
          ${termAssessments.map((a) => {
            const area = learningAreas.find((la) => la.id === a.learningAreaId);
            const perf = a.performanceLevel || 1;
            const gradeText = perf >= 4 ? "Exceeding" : perf >= 3 ? "Meeting" : perf >= 2 ? "Approaching" : "Below";
            return `<tr><td>${area?.name || "—"}</td><td class="score">${a.score || "—"}</td><td class="grade">${gradeText} (${perf}/4)</td><td>${a.remarks || "—"}</td></tr>`;
          }).join("")}
        </table>
        <p style="text-align:right;margin-top:8px;font-size:12px;color:#9a8065;">Total Subjects: ${termAssessments.length}</p>
        <div class="footer">
          <div class="comments"><strong>Teacher's Comments:</strong><br>${card.teacherComments || "No comments."}</div>
        </div>
        <div class="sig">
          <div class="sig-line">Class Teacher</div>
          <div class="sig-line">Head Teacher</div>
          <div class="sig-line">Parent/Guardian</div>
        </div>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  function printAll() {
    cards.filter((c) => c.publishedAt).forEach((c) => printReportCard(c));
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      {cards.length > 1 && <Button variant="secondary" onClick={printAll}>🖨️ Print All Published ({cards.filter((c) => c.publishedAt).length})</Button>}
      <div className="space-y-2">
        {cards.length === 0 && <p className="text-surface-500 text-sm">No report cards generated yet.</p>}
        {cards.map((c) => (
          <Card key={c.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-900">Term {c.term} · {c.academicYear}</p>
              <p className="text-xs text-surface-500 mt-0.5">{c.publishedAt ? `Published ${new Date(c.publishedAt).toLocaleDateString()}` : "Not yet published"}</p>
            </div>
            <div className="flex gap-2">
              {canPublish && !c.publishedAt && <Button variant="secondary" size="sm" onClick={() => publish(c.id)}>Publish</Button>}
              {c.publishedAt && <Button size="sm" onClick={() => printReportCard(c)}>🖨️ Print</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

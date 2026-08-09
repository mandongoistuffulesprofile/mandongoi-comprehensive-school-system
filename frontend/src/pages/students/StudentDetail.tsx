import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentsApi } from "../../api/students";
import { guardiansApi } from "../../api/guardians";
import { invoicesApi } from "../../api/fees";
import { attendanceApi } from "../../api/attendance";
import { assessmentsApi, reportCardsApi, learningAreasApi } from "../../api/academic";
import { useAuth } from "../../lib/auth";
import { useBreadcrumbOverride } from "../../contexts/BreadcrumbContext";
import type { Assessment, FeeInvoice, Guardian, ReportCard, SchoolSettings, Student, StudentAttendance, LearningArea } from "../../types";
import { EnumBadge, Money, CompetencyDots, Card, Button, LoadingScreen } from "../../components/ui/Basics";
import { PageNavigation } from "../../components/ui/PageNavigation";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import { printReportCard } from "../../utils/printReportCard";
import { settingsApi } from "../../api/settings";
import { foodLogsApi, type FoodLog } from "../../api/food-logs";

type Tab = "overview" | "guardians" | "invoices" | "attendance" | "assessments" | "report-cards" | "food";

const STUDENT_DETAIL_TABS = [
  { key: "overview" as Tab, label: "Overview" },
  { key: "guardians" as Tab, label: "Guardians" },
  { key: "invoices" as Tab, label: "Fees" },
  { key: "attendance" as Tab, label: "Attendance" },
  { key: "assessments" as Tab, label: "Marks" },
  { key: "report-cards" as Tab, label: "Report Card" },
  { key: "food" as Tab, label: "Food" },
];

const STUDENT_DETAIL_QUICK_SWITCHERS = [
  { label: "Students", to: "/students" },
  { label: "Marks Entry", to: "/academic/marks-entry" },
  { label: "Class Results", to: "/academic/results" },
  { label: "Attendance", to: "/attendance" },
];

export default function StudentDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const crumbs = useBreadcrumbOverride();

  useEffect(() => {
    studentsApi.get(id).then(setStudent).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (student) {
      crumbs.setOverride(id, {
        label: `${student.firstName} ${student.lastName}`,
        link: `/students/${id}`,
      });
      return () => crumbs.clearOverride(id);
    }
  }, [student, id, crumbs]);

  if (loading) return <LoadingScreen label="Loading student..." />;
  if (!student) return <p className="text-on-surface-variant">Student not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <PageNavigation
        backTo="/students"
        backLabel="Back to students"
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.level?.replace("_", " ")} · ${student.grade}`}
        quickSwitchers={STUDENT_DETAIL_QUICK_SWITCHERS}
        activeQuickSwitcher="/students"
      />

      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{student.firstName} {student.lastName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-on-surface-variant">
                <span className="capitalize">{student.level?.replace("_", " ")}</span>
                <span>·</span>
                <span>{student.grade}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <EnumBadge value={student.status} />
                {student.gender && <span className="text-xs text-on-surface-variant capitalize">{student.gender}</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <PageNavigation
        tabs={STUDENT_DETAIL_TABS.map(t => ({ key: t.key, label: t.label }))}
        activeTab={tab}
        onTabChange={(k) => setTab(k as Tab)}
      />

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
          <h3 className="text-sm font-semibold text-on-surface mb-3">Food Items Brought In</h3>
          <div className="space-y-2">
            {contributions.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-outline-variant last:border-0">
                <div>
                  <span className="font-medium text-on-surface">{l.quantity} {l.unit} {l.itemName}</span>
                  {l.notes && <span className="text-on-surface-variant ml-2 text-xs">{l.notes}</span>}
                </div>
                <span className="text-xs text-on-surface-variant">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {payments.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Money Paid for Food</h3>
          <div className="space-y-2">
            {payments.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-outline-variant last:border-0">
                <div>
                  <span className="font-medium text-on-surface">KES {Number(l.estimatedValue).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  {l.notes && <span className="text-on-surface-variant ml-2 text-xs">{l.notes}</span>}
                </div>
                <span className="text-xs text-on-surface-variant">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {consumption.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Food Consumed</h3>
          <div className="space-y-2">
            {consumption.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-2 border-b border-outline-variant last:border-0">
                <div>
                  <span className="font-medium text-on-surface">{l.quantity} {l.unit} {l.itemName}</span>
                </div>
                <span className="text-xs text-on-surface-variant">{new Date(l.loggedAt).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {logs.length === 0 && (
        <Card className="p-5">
          <p className="text-sm text-on-surface-variant text-center py-6">No food activity recorded for this student yet.</p>
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
        <h3 className="font-semibold text-on-surface">Guardians</h3>
        {guardians.length === 0 ? <p className="text-sm text-on-surface-variant">No guardians on file</p> : (
          guardians.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
              <div><p className="text-sm font-medium">{g.name} {g.isPrimary && <span className="text-xs text-primary">Primary</span>}</p>
              <p className="text-xs text-on-surface-variant font-mono">{g.phone}</p></div>
              {g.smsOptOut && <span className="text-xs text-red-500">SMS Opted Out</span>}
            </div>
          ))
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-5 space-y-2">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Fee Balance</p>
          <p className={clsx("text-2xl font-bold", totalBalance > 0 ? "text-red-600" : "text-emerald-600")}>
            {totalBalance > 0 ? <Money value={totalBalance} /> : "KES 0"}
          </p>
          <p className="text-xs text-on-surface-variant">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-5 space-y-2">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Attendance Rate</p>
          <p className={clsx("text-2xl font-bold", attendanceRate >= 90 ? "text-emerald-600" : attendanceRate >= 75 ? "text-amber-600" : "text-red-600")}>{attendanceRate}%</p>
          <p className="text-xs text-on-surface-variant">{absences} absent{absences !== 1 ? "s" : ""} out of {totalDays} day{totalDays !== 1 ? "s" : ""}</p>
        </Card>
        {assessments.length > 0 && (
          <Card className="p-5 space-y-2">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Avg Score</p>
            <p className={clsx("text-2xl font-bold", avgScore >= 80 ? "text-emerald-600" : avgScore >= 50 ? "text-amber-600" : "text-red-600")}>{Math.round(avgScore)}%</p>
            <p className="text-xs text-on-surface-variant">{assessments.length} assessment{assessments.length !== 1 ? "s" : ""}</p>
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
        {guardians.length === 0 && <p className="text-on-surface-variant text-sm">No guardians on file.</p>}
        {guardians.map((g) => (
          <Card key={g.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-on-surface">{g.name} {g.isPrimary && <span className="text-xs text-primary ml-1 font-normal">Primary</span>}</p>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">{g.phone} · {g.relationship}</p>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
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
              <div key={i} className="p-3 bg-surface-container-low rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface-variant">Guardian #{i + 1}</span>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
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
  if (invoices.length === 0) return <p className="text-on-surface-variant text-sm">No invoices for this student.</p>;
  return (<div className="space-y-2">{invoices.map((inv) => (
    <Card key={inv.id} className="px-5 py-4 flex items-center justify-between">
      <div><p className="text-sm font-medium text-on-surface">Term {inv.term} · {inv.academicYear}</p>
      <p className="text-xs text-on-surface-variant mt-0.5"><Money value={inv.totalAmount} /> total, <Money value={inv.balance} /> balance</p></div>
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
          <div><label className="block text-xs font-medium text-on-surface-variant mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
          <div><label className="block text-xs font-medium text-on-surface-variant mb-1">Status</label>
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
      {loading ? <LoadingScreen /> : records.length === 0 ? <p className="text-on-surface-variant text-sm">No absences logged.</p> : (
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
      {assessments.length === 0 && <p className="text-on-surface-variant text-sm">No assessments recorded.</p>}
      {assessments.map((a) => (
        <Card key={a.id} className="px-5 py-4 flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Term {a.term} · {a.academicYear} · <span className="capitalize">{a.type}</span></p>
          {a.remarks && <p className="text-xs text-on-surface-variant mt-0.5">{a.remarks}</p>}</div>
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
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([
      reportCardsApi.listForStudent(studentId).catch(() => []),
      learningAreasApi.list().catch(() => []),
      assessmentsApi.listForStudent(studentId).catch(() => []),
      settingsApi.get().catch(() => null),
      attendanceApi.listForStudent(studentId).catch(() => []),
    ]).then(([c, la, as, s, att]) => { setCards(c); setLearningAreas(la); setAssessments(as); setSettings(s); setAttendance(att); }).finally(() => setLoading(false));
  }
  useEffect(load, [studentId]);

  async function publish(id: string) { await reportCardsApi.publish(id); load(); toast.add("success", "Published"); }

  function printStudentReportCard(card: ReportCard) {
    const termAssessments = assessments.filter((a) => a.term === card.term && a.academicYear === Number(card.academicYear));
    const subjects = termAssessments.map((a) => {
      const area = learningAreas.find((la) => la.id === a.learningAreaId);
      const perf = a.performanceLevel || 1;
      const gradeText = perf >= 4 ? "Exceeding" : perf >= 3 ? "Meeting" : perf >= 2 ? "Approaching" : "Below";
      return {
        name: area?.name || "—",
        score: a.score || "—",
        level: perf,
        grade: gradeText,
        remarks: a.remarks || "—",
      };
    });

    const totalDays = attendance.length || 1;
    const presentDays = attendance.filter((a) => a.status === "present").length;
    const absentDays = attendance.filter((a) => a.status === "absent").length;
    const lateDays = attendance.filter((a) => a.status === "late").length;
    const excusedDays = attendance.filter((a) => a.status === "excused").length;

    printReportCard({
      schoolName: settings?.schoolName || "School",
      schoolMotto: settings?.schoolMotto || "",
      schoolPhone: settings?.schoolPhone || "",
      schoolEmail: settings?.schoolEmail || "",
      studentName: `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Student",
      admissionNumber: student?.nemisId || "",
      gender: student?.gender || "",
      grade: student?.grade || "",
      level: "Primary",
      term: card.term,
      academicYear: card.academicYear,
      subjects,
      attendance: { total: attendance.length, present: presentDays, absent: absentDays, late: lateDays, excused: excusedDays },
      teacherComments: card.teacherComments || "",
      headTeacherComments: card.headTeacherComments || "",
    });
  }

  function printAll() {
    cards.filter((c) => c.publishedAt).forEach((c) => printStudentReportCard(c));
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      {cards.length > 1 && <Button variant="secondary" onClick={printAll}>🖨️ Print All Published ({cards.filter((c) => c.publishedAt).length})</Button>}
      <div className="space-y-2">
        {cards.length === 0 && <p className="text-on-surface-variant text-sm">No report cards generated yet.</p>}
        {cards.map((c) => (
          <Card key={c.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-on-surface">Term {c.term} · {c.academicYear}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{c.publishedAt ? `Published ${new Date(c.publishedAt).toLocaleDateString()}` : "Not yet published"}</p>
            </div>
            <div className="flex gap-2">
              {canPublish && !c.publishedAt && <Button variant="secondary" size="sm" onClick={() => publish(c.id)}>Publish</Button>}
              {c.publishedAt && <Button size="sm" onClick={() => printStudentReportCard(c)}>🖨️ Print</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

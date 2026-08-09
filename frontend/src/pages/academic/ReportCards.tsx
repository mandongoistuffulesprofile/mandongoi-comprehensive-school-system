import { useState, useMemo } from "react";
import { studentsApi } from "../../api/students";
import { assessmentsApi, learningAreasApi, reportCardsApi } from "../../api/academic";
import { invoicesApi } from "../../api/fees";
import { settingsApi } from "../../api/settings";
import { api } from "../../lib/api";
import type { Student, LearningArea, Assessment, SchoolSettings } from "../../types";
import { Button, Card, Spinner } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import { FormField } from "../../components/ui/FormField";
import Dropdown from "../../components/ui/Dropdown";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../lib/toast";
import { LEVELS } from "../../types";
import clsx from "clsx";

const GRADE_LABELS = ["BE", "AE", "ME", "EE"];
const GRADE_FULL = ["Below Expectations", "Approaching Expectations", "Meeting Expectations", "Exceeding Expectations"];
const GRADE_COLORS = ["text-red-500", "text-amber-500", "text-emerald-500", "text-primary"];
const GRADE_BG_CLASSES = ["bg-red-100 text-red-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-primary-container text-on-primary-container"];

function scoreToGrade(score: number): { level: number; label: string; points: number } {
  if (score >= 80) return { level: 4, label: 'EE', points: 4 };
  if (score >= 60) return { level: 3, label: 'ME', points: 3 };
  if (score >= 40) return { level: 2, label: 'AE', points: 2 };
  return { level: 1, label: 'BE', points: 1 };
}

const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "mean", label: "Mean (high to low)" },
  { value: "mean-asc", label: "Mean (low to high)" },
  { value: "grade", label: "Grade (EE first)" },
  { value: "grade-asc", label: "Grade (BE first)" },
];

export default function ReportCards() {
  const [level, setLevel] = useState("primary");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState<Student[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [allAssessments, setAllAssessments] = useState<Record<string, Assessment[]>>({});
  const [feeData, setFeeData] = useState<Record<string, { total: number; paid: number; balance: number }>>({});
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [teacherComments, setTeacherComments] = useState<Record<string, string>>({});
  const [headComments, setHeadComments] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState("mean");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [chartStudent, setChartStudent] = useState<Student | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [classTeacherSig, setClassTeacherSig] = useState<string | null>(null);
  const toast = useToast();

  const selectedLevel = LEVELS.find((l) => l.value === level);
  const gradeOptions = selectedLevel?.grades ?? [];

  async function loadStudents() {
    if (!grade) return;
    setLoading(true);
    try {
      const [stuList, areas, set] = await Promise.all([
        studentsApi.list({ grade }),
        learningAreasApi.list(),
        settingsApi.get(),
      ]);
      setStudents(stuList);
      setLearningAreas(areas.filter((a) => a.gradeLevels.includes(grade)));
      setSettings(set);
      setSelectedIds(new Set());

      const assessmentMap: Record<string, Assessment[]> = {};
      const feeMap: Record<string, { total: number; paid: number; balance: number }> = {};
      for (const s of stuList) {
        try {
          const [asm, invs] = await Promise.all([
            assessmentsApi.listForStudent(s.id, { term, academicYear: year }),
            invoicesApi.list({ studentId: s.id }).catch(() => []),
          ]);
          assessmentMap[s.id] = asm;
          const total = invs.reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
          const paid = invs.reduce((sum: number, i: any) => sum + Number(i.amountPaid || 0), 0);
          feeMap[s.id] = { total, paid, balance: total - paid };
        } catch { assessmentMap[s.id] = []; feeMap[s.id] = { total: 0, paid: 0, balance: 0 }; }
      }
      setAllAssessments(assessmentMap);
      setFeeData(feeMap);
      try {
        const ct = await api.get<{ signatureUrl: string | null } | null>(`/class-teachers/by-grade`, { grade });
        setClassTeacherSig(ct?.signatureUrl ?? null);
      } catch { setClassTeacherSig(null); }
      setLoaded(true);
    } catch (e) {
      toast.add("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function getSubjectScore(studentId: string, subjectId: string): { score: string; level: number } | null {
    const asm = allAssessments[studentId] || [];
    const subj = asm.filter((a) => a.learningAreaId === subjectId && a.score);
    if (subj.length === 0) return null;
    const scores = subj.map((a) => Number(a.score)).filter((n) => !isNaN(n));
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const g = scoreToGrade(avg);
    return { score: avg.toFixed(1), level: g.level };
  }

  function getStudentAvg(studentId: string): number {
    const scores = learningAreas.map((la) => getSubjectScore(studentId, la.id)).filter(Boolean);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + Number(s!.score), 0) / scores.length;
  }

  function getCompLevel(studentId: string): number {
    const avg = getStudentAvg(studentId);
    return scoreToGrade(avg).level;
  }

  function getStudentSubjects(studentId: string) {
    return learningAreas.map((la) => {
      const result = getSubjectScore(studentId, la.id);
      const avg = result ? Number(result.score) : 0;
      const grade = avg > 0 ? scoreToGrade(avg) : null;
      return {
        name: la.name,
        short: la.name.split(' ')[0],
        marks: result ? result.score : '',
        outOf: '100',
        avgPercent: avg,
        grade,
        remark: grade ? GRADE_FULL[grade.level - 1] : '',
        sign: '',
      };
    });
  }

  const studentRows = useMemo(() => {
    const rows = students.map((s) => ({
      student: s,
      avg: getStudentAvg(s.id),
      comp: getCompLevel(s.id),
      subjects: getStudentSubjects(s.id),
    }));
    rows.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.student.firstName.localeCompare(b.student.firstName) || a.student.lastName.localeCompare(b.student.lastName);
        case "name-desc": return b.student.firstName.localeCompare(a.student.firstName) || b.student.lastName.localeCompare(a.student.lastName);
        case "mean-asc": return a.avg - b.avg;
        case "grade": return b.comp - a.comp;
        case "grade-asc": return a.comp - b.comp;
        default: return b.avg - a.avg;
      }
    });
    return rows;
  }, [students, sortBy, allAssessments, learningAreas]);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  async function printSingle(student: Student) {
    const win = window.open("", "_blank");
    if (!win) return;
    const subjects = getStudentSubjects(student.id);
    const valid = subjects.filter((s) => s.grade);
    const avgScore = valid.length > 0 ? valid.reduce((sum, s) => sum + s.avgPercent, 0) / valid.length : 0;
    const overallGrade = avgScore > 0 ? scoreToGrade(avgScore) : null;
    const totalMarks = valid.reduce((sum, s) => sum + s.avgPercent, 0);
    const totalPoints = valid.reduce((sum, s) => sum + (s.grade?.points || 0), 0);
    const meanPoints = valid.length > 0 ? (totalPoints / valid.length) : 0;
    const classStudents = students.length;
    const sorted = students.map((s) => ({ id: s.id, avg: getStudentAvg(s.id) })).sort((a, b) => b.avg - a.avg);
    const position = sorted.findIndex((s) => s.id === student.id) + 1;
    const fees = feeData[student.id] || { total: 0, paid: 0, balance: 0 };
    const tComments = teacherComments[student.id] || "A good learner. Keep it up.";
    const hComments = headComments[student.id] || "Progress is satisfactory.";
    const initials = settings?.schoolName ? settings.schoolName.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase() : 'SCH';
    const today = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
    const classSigUrl = classTeacherSig || settings?.classTeacherSignature;
    const classSig = classSigUrl ? `<img src="${classSigUrl}" style="height:28px;display:block;margin:0 auto 2px" />` : '<div style="height:28px"></div>';
    const headSig = settings?.headTeacherSignature ? `<img src="${settings.headTeacherSignature}" style="height:28px;display:block;margin:0 auto 2px" />` : '<div style="height:28px"></div>';

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Report Card - ${student.firstName} ${student.lastName}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 10.5px; line-height: 1.35; margin: 0; padding: 0; }
  .sheet { width: 100%; max-width: 190mm; margin: 0 auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0b3d2e; padding-bottom: 6px; margin-bottom: 8px; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo { width: 42px; height: 42px; border-radius: 50%; background: #0b3d2e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
  .school-name { font-size: 15px; font-weight: 700; color: #0b3d2e; margin: 0; }
  .school-meta { font-size: 8.5px; color: #555; margin: 1px 0 0 0; }
  .header-right { text-align: right; font-size: 9px; color: #333; }
  .header-right strong { color: #0b3d2e; }
  .report-title { text-align: center; background: #0b3d2e; color: #fff; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 3px; margin-bottom: 8px; letter-spacing: 0.4px; }
  .student-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 12px; border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; font-size: 9.5px; }
  .student-info div span { color: #666; } .student-info div strong { color: #111; }
  table.subjects { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5px; }
  table.subjects th { background: #0b3d2e; color: #fff; text-align: left; padding: 4px 6px; font-weight: 600; }
  table.subjects td { padding: 3.5px 6px; border-bottom: 1px solid #e2e2e2; }
  table.subjects tr:nth-child(even) td { background: #f7f9f8; }
  table.subjects td.center, table.subjects th.center { text-align: center; }
  .grade-EE { color: #0b7a4b; font-weight: 700; } .grade-ME { color: #1a6fb5; font-weight: 700; }
  .grade-AE { color: #b5871a; font-weight: 700; } .grade-BE { color: #b53a1a; font-weight: 700; }
  tfoot td { font-weight: 700; border-top: 2px solid #0b3d2e; background: #eef4f1 !important; }
  .summary-row { display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 8px; padding: 0 2px; }
  .comment-box { border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; font-size: 9.5px; }
  .comment-box .label { color: #0b3d2e; font-weight: 700; margin-right: 4px; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; font-size: 9px; margin-top: 10px; }
  .sign-line { border-top: 1px solid #999; padding-top: 2px; margin-top: 16px; color: #555; }
  .fees-row { display: flex; justify-content: space-between; border: 1px solid #ccc; border-radius: 4px; padding: 5px 10px; margin-bottom: 8px; font-size: 9.5px; }
  .chart-section { border: 1px solid #ccc; border-radius: 6px; padding: 8px 12px 6px; margin-bottom: 8px; background: #fafcfa; }
  .chart-title { font-size: 9px; font-weight: 700; color: #0b3d2e; margin-bottom: 6px; text-align: center; letter-spacing: 0.3px; }
  .chart-bars { display: flex; align-items: flex-end; height: 50px; gap: 5px; padding: 0 2px; position: relative; }
  .chart-bars::before { content: ''; position: absolute; bottom: 12px; left: 0; right: 0; border-top: 1px dashed #ddd; }
  .bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; position: relative; }
  .bar { width: 65%; min-height: 3px; border-radius: 3px 3px 0 0; transition: height 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
  .bar.shine { position: relative; overflow: hidden; }
  .bar.shine::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%); }
  .bar-label { font-size: 6.5px; margin-top: 3px; color: #555; text-align: center; font-weight: 500; }
  .bar-value { font-size: 6px; color: #444; font-weight: 600; margin-bottom: 1px; }
  .grade-badge { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-bottom: 1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
  .grade-bg-EE { background: linear-gradient(180deg, #0b7a4b, #15803d); } .grade-bg-ME { background: linear-gradient(180deg, #2563eb, #3b82f6); }
  .grade-bg-AE { background: linear-gradient(180deg, #d97706, #f59e0b); } .grade-bg-BE { background: linear-gradient(180deg, #dc2626, #ef4444); }
  .stamp-area { text-align: center; font-size: 9px; color: #888; margin-top: 10px; border-top: 1px dashed #bbb; padding-top: 6px; }
  .footer-note { text-align: center; font-size: 7.5px; color: #999; margin-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body><div class="sheet">
  <div class="header">
    <div class="header-left">
      <div class="logo">${initials}</div>
      <div>
        <p class="school-name">${settings?.schoolName || "School"}</p>
        <p class="school-meta">${settings?.schoolAddress || ""} &nbsp;|&nbsp; Tel: ${settings?.schoolPhone || ""} &nbsp;|&nbsp; ${settings?.schoolEmail || ""}</p>
      </div>
    </div>
    <div class="header-right">Date: <strong>${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</strong></div>
  </div>

  <div class="report-title">REPORT FORM — ${settings?.currentTerm || "Term " + term} | ${year}</div>

  <div class="student-info">
    <div><span>Name:</span> <strong>${student.firstName} ${student.lastName}</strong></div>
    <div><span>Class:</span> <strong>${student.grade}</strong></div>
    <div><span>Gender:</span> <strong>${student.gender || "—"}</strong></div>
    <div><span>NEMIS:</span> <strong>${student.nemisId || "—"}</strong></div>
    <div><span>Position:</span> <strong>${position} / ${classStudents}</strong></div>
    <div><span>Class Size:</span> <strong>${classStudents}</strong></div>
  </div>

  <table class="subjects">
    <thead><tr>
      <th>Subject</th><th class="center">Marks</th><th class="center">Out Of</th>
      <th class="center">Avg %</th><th class="center">Grade</th><th class="center">Points</th>
      <th>Remarks</th><th class="center">Sign</th>
    </tr></thead>
    <tbody>
      ${subjects.map((s) => {
        const g = s.grade;
        return `<tr>
          <td>${s.name}</td>
          <td class="center">${s.marks || "—"}</td>
          <td class="center">${s.outOf}</td>
          <td class="center">${s.avgPercent > 0 ? s.avgPercent.toFixed(1) : "—"}</td>
          <td class="center grade-${g ? g.label : 'BE'}">${g ? g.label : "—"}</td>
          <td class="center">${g ? g.points : "—"}</td>
          <td>${s.remark}</td>
          <td class="center">${s.sign}</td>
        </tr>`;
      }).join("")}
    </tbody>
    <tfoot><tr>
      <td>Total</td>
      <td class="center">${totalMarks > 0 ? totalMarks.toFixed(1) : "—"}</td>
      <td class="center">${valid.length * 100}</td>
      <td class="center">—</td>
      <td class="center">${overallGrade ? overallGrade.label : "—"}</td>
      <td class="center">${meanPoints > 0 ? meanPoints.toFixed(1) : "—"}</td>
      <td colspan="2">Mean points / Overall band</td>
    </tr></tfoot>
  </table>

  <div class="summary-row">
    <div>Mean Score: <strong>${avgScore > 0 ? avgScore.toFixed(1) + "%" : "—"}</strong></div>
    <div>Overall Grade: <strong>${overallGrade ? overallGrade.label : "—"}</strong></div>
    <div>Subjects Assessed: <strong>${valid.length}</strong> of ${subjects.length}</div>
  </div>

  <div class="chart-section">
    <div class="chart-title">Performance Analysis — Subject Scores Distribution</div>
    <div class="chart-bars">
      ${subjects.filter((s) => s.grade).map((s) => `
      <div class="bar-col">
        <div class="bar-value">${s.avgPercent.toFixed(0)}%</div>
        <div class="bar shine grade-bg-${s.grade!.label}" style="height: ${Math.max(s.avgPercent, 4)}%;"></div>
        <div><span class="grade-badge grade-bg-${s.grade!.label}"></span></div>
        <div class="bar-label">${s.short}</div>
      </div>`).join("")}
    </div>
  </div>

  <div class="fees-row">
    <div>Term Total: <strong>KES ${fees.total.toLocaleString("en-KE")}</strong></div>
    <div>Paid: <strong>KES ${fees.paid.toLocaleString("en-KE")}</strong></div>
    <div>Balance: <strong>KES ${fees.balance.toLocaleString("en-KE")}</strong></div>
  </div>

  <div class="comment-box">
    <span class="label">Class Teacher's Comment:</span>${tComments}
  </div>

  <div class="comment-box">
    <span class="label">Head Teacher's Comment:</span>${hComments}
  </div>

  <div class="sign-grid">
    <div class="sign-line">${classSig}Class Teacher — ${today}</div>
    <div class="sign-line">${headSig}Head Teacher / Deputy — ${today}</div>
  </div>

  <div class="stamp-area">Official School Stamp</div>

  <div class="footer-note">Generated on ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} &middot; ${settings?.schoolName || "School"}</div>

</div>
<script>window.print();window.close();</script>
</body></html>`);
    win.document.close();
  }

  async function bulkPrint() {
    const toPrint = students.filter((s) => selectedIds.has(s.id));
    if (toPrint.length === 0) { toast.add("error", "Select at least one student"); return; }
    setPrintLoading(true);
    for (const s of toPrint) {
      await printSingle(s);
    }
    setPrintLoading(false);
    setSelectedIds(new Set());
  }

  const classAvg = studentRows.length > 0
    ? studentRows.reduce((sum, r) => sum + r.avg, 0) / studentRows.length
    : 0;

  return (
    <div>
      <PageNavigation title="Report Cards" description="CBC-compliant report cards with competency-based grading."
        quickSwitchers={[{ label: "Class Results", to: "/academic/results" }, { label: "Attendance", to: "/attendance" }]}
        activeQuickSwitcher="/academic/report-cards"/>

      <Card className="p-5 space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <FormField spec={{ name: "level", label: "Level", type: "select", required: true, options: LEVELS.map((l) => ({ value: l.value, label: l.label })) }} value={level} onChange={(v) => { setLevel(v as string); setGrade(""); }} />
          <FormField spec={{ name: "grade", label: "Grade", type: "select", required: true, options: gradeOptions.map((g) => ({ value: g, label: g })) }} value={grade} onChange={(v) => setGrade(v as string)} />
          <FormField spec={{ name: "term", label: "Term", type: "number", required: true }} value={term} onChange={(v) => setTerm(v as number)} />
          <div className="flex gap-2">
            <FormField spec={{ name: "academicYear", label: "Year", type: "number", required: true }} value={year} onChange={(v) => setYear(v as number)} />
            <button onClick={loadStudents} className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary transition-colors self-end whitespace-nowrap">
              {loading ? "..." : "Load"}
            </button>
          </div>
        </div>
      </Card>

      {loading && <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>}

      {loaded && students.length === 0 && (
        <p className="text-center text-on-surface-variant py-10">No students found in {grade}.</p>
      )}

      {loaded && students.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant font-medium">{students.length} students</span>
              <span className="w-px h-4 bg-surface-container" />
              <span className="text-sm text-on-surface-variant">Class avg: <span className="font-semibold text-on-surface">{classAvg.toFixed(1)}%</span></span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-primary font-medium bg-primary-container px-2.5 py-1 rounded-lg">{selectedIds.size} selected</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Dropdown
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={setSortBy}
                placeholder="Sort by..."
                size="sm"
              />
              <Button
                onClick={bulkPrint}
                disabled={selectedIds.size === 0 || printLoading}
                size="sm"
              >
                {printLoading ? "Printing..." : `Print Selected (${selectedIds.size})`}
              </Button>
            </div>
          </div>

          <Card className="divide-y divide-outline-variant overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low/70 border-b border-outline-variant text-xs font-medium text-on-surface-variant">
              <input
                type="checkbox"
                checked={selectedIds.size === students.length && students.length > 0}
                onChange={toggleAll}
                className="rounded border-outline text-primary focus:ring-primary shrink-0"
              />
              <span className="w-48">Student</span>
              <span className="text-on-surface-variant">Subjects</span>
              <span className="ml-auto flex items-center gap-4">
                <span className="w-14 text-center">Mean</span>
                <span className="w-12 text-center">Grade</span>
                <span className="w-24">Teacher</span>
                <span className="w-24">Head</span>
                <span className="w-16 text-center"></span>
              </span>
            </div>
            {studentRows.map(({ student: s, avg, comp, subjects }) => (
              <div key={s.id} className={clsx(
                "flex items-center gap-3 px-4 py-3 transition-colors text-sm",
                selectedIds.has(s.id) ? "bg-primary-container/40" : "hover:bg-surface-container-low",
              )}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                  className="rounded border-outline text-primary focus:ring-primary shrink-0"
                />
                <div className="w-48 shrink-0">
                  <button onClick={() => setChartStudent(s)} className="font-medium text-on-surface hover:text-primary transition-colors text-left">
                    {s.firstName} {s.lastName}
                  </button>
                  <div className="text-[11px] text-on-surface-variant">{s.nemisId || "\u2014"}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                  {learningAreas.map((la) => {
                    const r = getSubjectScore(s.id, la.id);
                    const level = r ? r.level : 0;
                    return (
                      <div
                        key={la.id}
                        title={r ? `${la.name}: ${r.score}%` : `${la.name}: no score`}
                        className={clsx(
                          "group relative w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                          level > 0
                            ? ["bg-red-100 text-red-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-primary-container text-on-primary-container"][level - 1]
                            : "bg-surface-container text-outline-variant",
                        )}
                      >
                        {level > 0 ? GRADE_LABELS[level - 1] : "\u2014"}
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-[7px] font-bold text-on-surface-variant shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          {r?.score ?? "?"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="shrink-0 flex items-center gap-4">
                  <span className="w-14 text-center font-semibold text-sm">{avg > 0 ? avg.toFixed(1) : "\u2014"}</span>
                  <span className="w-12 text-center">
                    {comp > 0 ? (
                      <span className={clsx("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold", GRADE_BG_CLASSES[comp - 1])}>
                        {GRADE_LABELS[comp - 1]}
                      </span>
                    ) : "\u2014"}
                  </span>
                  <input
                    value={teacherComments[s.id] || ""}
                    onChange={(e) => setTeacherComments({ ...teacherComments, [s.id]: e.target.value })}
                    className="w-24 text-xs border-0 bg-transparent focus:bg-surface-container-low rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder-outline"
                    placeholder="Comment..."
                  />
                  <input
                    value={headComments[s.id] || ""}
                    onChange={(e) => setHeadComments({ ...headComments, [s.id]: e.target.value })}
                    className="w-24 text-xs border-0 bg-transparent focus:bg-surface-container-low rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder-outline"
                    placeholder="Head..."
                  />
                  <button
                    onClick={() => printSingle(s)}
                    className="w-16 text-center text-xs text-primary hover:text-primary font-medium hover:bg-primary-container px-2 py-1 rounded transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {chartStudent && (
        <Modal title={`${chartStudent.firstName} ${chartStudent.lastName} \u2014 Subject Performance`} onClose={() => setChartStudent(null)}>
          <div className="min-w-[500px]">
            {(() => {
              const subjects = getStudentSubjects(chartStudent.id);
              const valid = subjects.filter((x) => x.grade);
              const barGradients: Record<string, string> = { EE: 'linear-gradient(180deg, #0b7a4b 0%, #15803d 100%)', ME: 'linear-gradient(180deg, #2563eb 0%, #3b82f6 100%)', AE: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', BE: 'linear-gradient(180deg, #dc2626 0%, #ef4444 100%)' };
              const avg = getStudentAvg(chartStudent.id);
              const comp = getCompLevel(chartStudent.id);
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-on-surface-variant">Mean: <strong className="text-on-surface">{avg.toFixed(1)}%</strong></span>
                    <span className="text-on-surface-variant">Grade: <strong className={GRADE_COLORS[comp - 1]}>{GRADE_LABELS[comp - 1]}</strong></span>
                    <span className="text-on-surface-variant">Subjects assessed: <strong className="text-on-surface">{valid.length}/{subjects.length}</strong></span>
                  </div>
                  <div className="flex items-end h-52 gap-4">
                    {valid.map((subj) => {
                      const grad = barGradients[subj.grade!.label] || '#6b7280';
                      return (
                        <div key={subj.name} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div className="mb-1 text-xs font-semibold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                            {subj.avgPercent.toFixed(1)}%
                          </div>
                          <div
                            className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110 group-hover:shadow-lg relative overflow-hidden cursor-pointer"
                            style={{
                              height: Math.max(subj.avgPercent, 3) + '%',
                              background: grad,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                          </div>
                          <div className="mt-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: grad }}>
                            {subj.grade!.label}
                          </div>
                          <div className="text-[10px] text-on-surface-variant mt-1.5 text-center leading-tight font-medium">{subj.short}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4 pt-2 border-t border-outline-variant">
                    {[['EE', 'Exceeding'], ['ME', 'Meeting'], ['AE', 'Approaching'], ['BE', 'Below']].map(([code, label]) => (
                      <div key={code} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: barGradients[code] }} />
                        {code} \u2014 {label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}

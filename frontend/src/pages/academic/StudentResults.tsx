import { useEffect, useState, useRef } from "react";
import { studentsApi } from "../../api/students";
import { assessmentsApi, learningAreasApi } from "../../api/academic";
import { settingsApi } from "../../api/settings";
import type { Assessment, LearningArea, Student, SchoolSettings } from "../../types";
import { Button, PageHeader, Card, Spinner } from "../../components/ui/Basics";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import { LEVELS } from "../../types";
import clsx from "clsx";

interface SubjectResult {
  subject: string;
  score: string;
  level: number;
  points: number;
}

interface StudentResult {
  student: Student;
  subjects: SubjectResult[];
  averageScore: number;
  totalPoints: number;
  meanPoints: number;
  grade: string;
}

const GRADE_LABELS = ["BE", "AE", "ME", "EE"];

function scoreToGrade(avg: number): { label: string; points: number } {
  if (avg >= 80) return { label: "EE", points: 4 };
  if (avg >= 60) return { label: "ME", points: 3 };
  if (avg >= 40) return { label: "AE", points: 2 };
  return { label: "BE", points: 1 };
}

export default function StudentResults() {
  const [level, setLevel] = useState("primary");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState(new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState<Student[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<LearningArea[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const selectedLevel = LEVELS.find((l) => l.value === level);
  const gradeOptions = selectedLevel?.grades ?? [];

  useEffect(() => { learningAreasApi.list().then(setLearningAreas); settingsApi.get().then(setSettings); }, []);

  useEffect(() => {
    setFilteredSubjects(learningAreas.filter((la) => la.gradeLevels.includes(grade)));
  }, [grade, learningAreas]);

  useEffect(() => {
    if (!grade) return;
    const timer = setTimeout(() => loadResults(), 300);
    return () => clearTimeout(timer);
  }, [grade, term, academicYear]);

  async function loadResults() {
    setLoading(true);
    setLoaded(false);
    try {
      const studentList = await studentsApi.list({ grade });
      setStudents(studentList);

      const allResults: StudentResult[] = [];
      for (const s of studentList) {
        const assessments = await assessmentsApi.listForStudent(s.id, { term, academicYear });
        const subs = filteredSubjects.length > 0 ? filteredSubjects : learningAreas;
        const subjects: SubjectResult[] = subs.map((la) => {
          const asm = assessments.filter((a) => a.learningAreaId === la.id && a.score);
          const scores = asm.map((a) => Number(a.score)).filter((n) => !isNaN(n));
          const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const g = avgScore > 0 ? scoreToGrade(avgScore) : { label: "", points: 0 };
          return {
            subject: la.name,
            score: avgScore > 0 ? avgScore.toFixed(1) : "-",
            level: g.points,
            points: g.points,
          };
        });
        const valid = subjects.filter((s) => s.points > 0);
        const avg = valid.length > 0 ? valid.reduce((sum, s) => sum + Number(s.score), 0) / valid.length : 0;
        const totalPoints = valid.reduce((sum, s) => sum + s.points, 0);
        const meanPoints = valid.length > 0 ? totalPoints / valid.length : 0;
        const g = avg > 0 ? scoreToGrade(avg) : { label: "", points: 0 };
        allResults.push({ student: s, subjects, averageScore: avg, totalPoints, meanPoints, grade: g.label });
      }
      allResults.sort((a, b) => b.averageScore - a.averageScore);
      setResults(allResults);
      setLoaded(true);
    } catch (e) {
      toast.add("error", "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  function printResults() {
    if (!tableRef.current || results.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const initials = settings?.schoolName ? settings.schoolName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase() : "SCH";
    const date = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
    const subs = filteredSubjects.length > 0 ? filteredSubjects : learningAreas;

    win.document.write(`<!DOCTYPE html>
<html><head><title>Class Results - ${grade} Term ${term}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 12px; }
  .header h1 { font-size: 16px; color: #0b3d2e; margin: 0; }
  .header p { font-size: 10px; color: #555; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  th { background: #0b3d2e; color: #fff; padding: 5px 4px; text-align: center; font-weight: 600; }
  td { padding: 4px; border: 1px solid #ddd; text-align: center; }
  td.left { text-align: left; }
  tr:nth-child(even) td { background: #f7f9f8; }
  .grade-EE { color: #0b7a4b; font-weight: 700; } .grade-ME { color: #1a6fb5; font-weight: 700; }
  .grade-AE { color: #b5871a; font-weight: 700; } .grade-BE { color: #b53a1a; font-weight: 700; }
  .footer { text-align: center; font-size: 7.5px; color: #999; margin-top: 12px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
<div class="header">
  <h1>${settings?.schoolName || "School"} — CLASS RESULTS</h1>
  <p>${grade} | Term ${term} | ${academicYear} | Generated: ${date}</p>
</div>
<table>
  <tr>
    <th>#</th><th class="left">Student</th>
    ${subs.map((s) => `<th>${s.name.split(" ")[0]}</th>`).join("")}
    <th>Avg%</th><th>Grade</th><th>Points</th>
  </tr>
  ${results.map((r, i) => {
    const subs = filteredSubjects.length > 0 ? filteredSubjects : learningAreas;
    return `<tr>
      <td>${i + 1}</td>
      <td class="left">${r.student.firstName} ${r.student.lastName}</td>
      ${subs.map((la) => {
        const subj = r.subjects.find((s) => s.subject === la.name);
        const val = subj && subj.score !== "-" ? Number(subj.score) : 0;
        const cls = val >= 80 ? "grade-EE" : val >= 60 ? "grade-ME" : val >= 40 ? "grade-AE" : val > 0 ? "grade-BE" : "";
        return `<td class="${cls}">${subj && subj.score !== "-" ? subj.score : "-"}</td>`;
      }).join("")}
      <td><strong>${r.averageScore > 0 ? r.averageScore.toFixed(1) : "-"}</strong></td>
      <td class="grade-${r.grade || 'BE'}"><strong>${r.grade || "-"}</strong></td>
      <td>${r.meanPoints > 0 ? r.meanPoints.toFixed(1) : "-"}</td>
    </tr>`;
  }).join("")}
</table>
<p class="footer">Generated on ${date} · ${settings?.schoolName || "School"}</p>
<script>window.print();</script>
</body></html>`);
    win.document.close();
  }

  return (
    <div>
      <PageHeader title="Class Results" description="View compiled exam results per class and subject." />

      <Card className="p-5 space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <FormField spec={{ name: "level", label: "Level", type: "select", required: true, options: LEVELS.map((l) => ({ value: l.value, label: l.label })) }} value={level} onChange={(v) => { setLevel(v as string); setGrade(""); }} />
          <FormField spec={{ name: "grade", label: "Grade", type: "select", required: true, options: gradeOptions.map((g) => ({ value: g, label: g })) }} value={grade} onChange={(v) => setGrade(v as string)} />
          <FormField spec={{ name: "term", label: "Term", type: "number", required: true }} value={term} onChange={(v) => setTerm(v as number)} />
          <FormField spec={{ name: "academicYear", label: "Year", type: "number", required: true }} value={academicYear} onChange={(v) => setAcademicYear(v as number)} />
          <div className="flex gap-2">
            {loaded && (
              <Button variant="secondary" onClick={printResults}>🖨️ Print</Button>
            )}
          </div>
        </div>
      </Card>

      {loading && <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>}

      {loaded && results.length === 0 && (
        <p className="text-center text-on-surface-variant py-10">No results found for {grade} Term {term}.</p>
      )}

      {loaded && results.length > 0 && (
        <Card className="p-5" ref={tableRef}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-on-surface">{results.length} students · Sorted by rank</p>
            <span className="text-[10px] text-on-surface-variant">EE ≥80% · ME ≥60% · AE ≥40% · BE {"<"}40%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-2 font-medium w-8">#</th>
                  <th className="py-3 px-3 font-medium">Student</th>
                  {filteredSubjects.map((la) => (
                    <th key={la.id} className="py-3 px-2 font-medium text-center">{la.name.split(" ")[0]}</th>
                  ))}
                  <th className="py-3 px-2 font-medium text-center">Avg%</th>
                  <th className="py-3 px-2 font-medium text-center">Grade</th>
                  <th className="py-3 px-2 font-medium text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.student.id} className="border-b border-surface-100 hover:bg-surface-container-low">
                    <td className="py-2 px-2 text-center text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-on-surface whitespace-nowrap">
                      {r.student.firstName} {r.student.lastName}
                    </td>
                    {filteredSubjects.map((la) => {
                      const subj = r.subjects.find((s) => s.subject === la.name);
                      const val = subj && subj.score !== "-" ? Number(subj.score) : 0;
                      return (
                        <td key={la.id} className="py-2 px-2 text-center">
                          {val > 0 ? (
                            <span className={clsx("font-medium", val >= 80 ? "text-emerald-600" : val >= 60 ? "text-blue-600" : val >= 40 ? "text-amber-600" : "text-red-500")}>
                              {subj!.score}
                            </span>
                          ) : <span className="text-outline-variant">-</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-bold">
                      {r.averageScore > 0 ? (
                        <span className={clsx(r.averageScore >= 80 ? "text-emerald-600" : r.averageScore >= 60 ? "text-blue-600" : r.averageScore >= 40 ? "text-amber-600" : "text-red-500")}>
                          {r.averageScore.toFixed(1)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className={clsx("py-2 px-2 text-center font-bold", r.grade === "EE" ? "text-emerald-600" : r.grade === "ME" ? "text-blue-600" : r.grade === "AE" ? "text-amber-600" : "text-red-500")}>
                      {r.grade || "-"}
                    </td>
                    <td className="py-2 px-2 text-center text-on-surface-variant">{r.meanPoints > 0 ? r.meanPoints.toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState, useRef, useCallback } from "react";
import { studentsApi } from "../../api/students";
import { learningAreasApi, assessmentsApi } from "../../api/academic";
import type { Assessment, LearningArea, Student } from "../../types";
import { LEVELS } from "../../types";
import { Card } from "../../components/ui/Basics";
import Dropdown from "../../components/ui/Dropdown";
import type { DropdownOption } from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import clsx from "clsx";

const REMARKS_BY_LEVEL: Record<number, string> = {
  4: "Exceeding Expectations",
  3: "Meeting Expectations",
  2: "Approaching Expectations",
  1: "Below Expectations",
};

function autoRemark(level: number): string {
  return REMARKS_BY_LEVEL[level] || "";
}

interface MarkRow {
  studentId: string;
  studentName: string;
  score: number | "";
  performanceLevel: number;
  remarks: string;
  remarksOverridden: boolean;
  saved: boolean;
  saving: boolean;
}

export default function MarksEntry() {
  const [grade, setGrade] = useState("");
  const [learningAreaId, setLearningAreaId] = useState("");
  const [term, setTerm] = useState(new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [examType, setExamType] = useState<"formative" | "summative">("summative");
  const [students, setStudents] = useState<Student[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useToast();

  const filteredSubjects = learningAreas.filter((la) => la.gradeLevels.includes(grade));
  const selectedSubject = learningAreas.find((la) => la.id === learningAreaId);

  const allGrades = LEVELS.flatMap((l) => l.grades);

  const gradeOptions: DropdownOption[] = allGrades.map((g) => ({ value: g, label: g }));
  const subjectOptions: DropdownOption[] = filteredSubjects.map((la) => ({ value: la.id, label: la.name }));

  useEffect(() => { learningAreasApi.list().then(setLearningAreas); }, []);

  const loadExisting = useCallback(async (sList: Student[]) => {
    if (!learningAreaId) return;
    try {
      const existing = await assessmentsApi.listByClass({
        grade, learningAreaId, term, academicYear,
      });
      const byStudent = new Map(existing.map((a: Assessment) => [a.studentId, a]));
      setMarks(sList.map((s) => {
        const ex = byStudent.get(s.id);
        const lvl = ex?.performanceLevel ?? 1;
        return {
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          score: ex?.score ? Number(ex.score) : "",
          performanceLevel: lvl,
          remarks: ex?.remarks ?? "",
          remarksOverridden: !!ex?.remarks,
          saved: !!ex,
          saving: false,
        };
      }));
    } catch {
      setMarks(sList.map((s) => ({
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        score: "",
        performanceLevel: 1,
        remarks: "",
        remarksOverridden: false,
        saved: false,
        saving: false,
      })));
    }
  }, [learningAreaId, grade, term, academicYear]);

  useEffect(() => {
    if (!grade) { setStudents([]); setMarks([]); setLoaded(false); return; }
    setLoaded(false);
    setSaveStatus("idle");
    setFocusedIdx(null);
    studentsApi.list({ grade }).then(async (result) => {
      setStudents(result);
      setLoaded(true);
      if (learningAreaId) await loadExisting(result);
    }).catch(() => toast.add("error", "Failed to load students"));
  }, [grade]);

  useEffect(() => {
    if (learningAreaId && loaded && students.length > 0) {
      loadExisting(students);
    }
  }, [learningAreaId, loaded, students]);

  useEffect(() => {
    if (marks.length > 0 && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [marks]);

  function focusNext(idx: number) {
    const next = idx + 1;
    if (next < marks.length && inputRefs.current[next]) {
      inputRefs.current[next]?.focus();
      setFocusedIdx(next);
    }
  }

  const marksRef = useRef(marks);
  marksRef.current = marks;

  const doAutoSave = useCallback(async (updated: MarkRow[]) => {
    const items = updated.filter((m) => m.score !== "" && m.score !== undefined);
    if (items.length === 0 || !learningAreaId) return;
    setSaveStatus("saving");
    try {
      await assessmentsApi.createBulk({
        assessments: items.map((m) => ({
          studentId: m.studentId,
          learningAreaId,
          term,
          academicYear,
          type: examType,
          score: String(m.score),
          performanceLevel: m.performanceLevel,
          remarks: m.remarks || undefined,
        })),
        term,
        academicYear,
      });
      setMarks((prev) => prev.map((m) => {
        const wasSaved = items.find((i) => i.studentId === m.studentId);
        return wasSaved ? { ...m, saved: true, saving: false } : m;
      }));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [learningAreaId, term, academicYear, examType]);

  function scheduleAutoSave(updated: MarkRow[]) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doAutoSave(updated), 800);
  }

  function updateMark(idx: number, field: keyof MarkRow, value: unknown) {
    const updated = [...marks];
    const row = updated[idx];
    (row as any)[field] = value;
    row.saved = false;
    row.saving = true;

    if (field === "score") {
      const score = value as number | "";
      const level = score === "" ? 1 : score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
      row.performanceLevel = level;
      if (!row.remarksOverridden) row.remarks = autoRemark(level);
    }

    if (field === "performanceLevel" && !row.remarksOverridden) {
      row.remarks = autoRemark(value as number);
    }

    if (field === "remarks") row.remarksOverridden = true;

    setMarks(updated);
    scheduleAutoSave(updated);
  }

  const filledCount = marks.filter((m) => m.score !== "").length;
  const savedCount = marks.filter((m) => m.saved).length;
  const missingCount = marks.filter((m) => m.score === "").length;

  const displayMarks = (showMissingOnly ? marks.filter((m) => m.score === "") : marks)
    .filter((m) => !studentSearch || m.studentName.toLowerCase().includes(studentSearch.toLowerCase()));

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Marks Entry</h1>
          <p className="text-sm text-surface-500 mt-0.5">Record and manage student assessment scores.</p>
        </div>
      </div>

      <Card className={clsx("p-4 mb-4 transition-all duration-300", !grade && "border-brand-200/60 bg-brand-50/20")}>
        {!grade && (
          <p className="text-xs text-brand-600 font-medium mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Select Grade to Submit Marks
          </p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-y-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Dropdown
              value={grade}
              options={gradeOptions}
              onChange={(v) => { setGrade(v); setLearningAreaId(""); }}
              placeholder="Select Grade"
              accent
            />

            {grade && (
              <Dropdown
                value={learningAreaId}
                options={subjectOptions}
                onChange={setLearningAreaId}
                placeholder={filteredSubjects.length === 0 ? "No subjects" : "Select Subject"}
                disabled={filteredSubjects.length === 0}
                accent
              />
            )}

            {selectedSubject && (
              <>
                <Dropdown
                  value={examType}
                  options={[{ value: "summative", label: "Summative" }, { value: "formative", label: "Formative" }]}
                  onChange={(v) => setExamType(v as "formative" | "summative")}
                  placeholder="Type"
                />
                <Dropdown
                  value={String(term)}
                  options={[
                    { value: "1", label: "Term 1" },
                    { value: "2", label: "Term 2" },
                    { value: "3", label: "Term 3" },
                  ]}
                  onChange={(v) => setTerm(Number(v))}
                  placeholder="Term"
                />
                <div className="relative">
                  <input
                    type="number"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value))}
                    className={clsx(
                      "w-[88px] px-4 py-2.5 text-sm rounded-2xl border-2 bg-white transition-all duration-150",
                      "shadow-sm hover:shadow-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-400",
                      "active:scale-[0.97]",
                      "border-surface-200 text-surface-700 hover:border-surface-300",
                    )}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedSubject && grade && marks.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 rounded-xl text-xs shadow-sm">
                  <span className="text-surface-500 font-semibold">{marks.length}</span>
                  <span className="text-surface-400">students</span>
                  <span className="w-px h-3 bg-surface-200" />
                  <span className="text-brand-600 font-semibold">{filledCount}</span>
                  <span className="text-surface-400">scored</span>
                  <span className="w-px h-3 bg-surface-200" />
                  <span className="text-emerald-600 font-semibold">{savedCount}</span>
                  <span className="text-surface-400">saved</span>
                </div>
                {missingCount > 0 && (
                  <button
                    onClick={() => setShowMissingOnly(!showMissingOnly)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                      "shadow-sm active:scale-[0.97]",
                      showMissingOnly
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                        : "bg-white border-2 border-dashed border-surface-300 text-surface-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/30",
                    )}
                  >
                    {missingCount} missing{showMissingOnly ? " \u25C0" : ""}
                  </button>
                )}
              </>
            )}
            <span className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 shadow-sm",
              saveStatus === "saved" && "text-emerald-700 bg-emerald-100",
              saveStatus === "saving" && "text-amber-700 bg-amber-100",
              saveStatus === "error" && "text-red-700 bg-red-100",
            )}>
              {saveStatus === "saved" && "All saved"}
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "error" && "Save failed"}
            </span>
          </div>
        </div>
      </Card>

      {selectedSubject && grade && loaded && (
        <Card className="overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {students.length === 0 ? (
            <div className="p-10 text-center text-sm text-surface-400">No students found in this grade.</div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-50/70 border-b border-surface-200 text-xs text-surface-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Enter scores &middot; Press <kbd className="px-1.5 py-0.5 bg-surface-100 rounded-md text-[10px] font-mono shadow-inner">Enter</kbd> for next student
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-saves on entry
                </span>
              </div>
              <div className="px-4 py-2 border-b border-surface-200 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={studentSearch}
                    onChange={(e) => { setStudentSearch(e.target.value); setFocusedIdx(null); }}
                    placeholder="Search students by name..."
                    className="w-full rounded-lg border border-surface-200 pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                  />
                </div>
                {studentSearch && (
                  <span className="text-[11px] text-surface-400 whitespace-nowrap">
                    {displayMarks.length} of {marks.length} students
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 bg-surface-50/30">
                      <th className="px-4 py-3 w-8">#</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 w-28">Score (%)</th>
                      <th className="px-4 py-3 w-36">Level</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3 w-12">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMarks.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-surface-400">No students match "{studentSearch}".</td></tr>
                    ) : displayMarks.map((m, i) => (
                      <tr key={m.studentId} className={clsx(
                        "border-b border-surface-100 transition-colors duration-100",
                        focusedIdx === i ? "bg-brand-50/40" : "hover:bg-surface-50/60",
                        m.score === "" && "bg-amber-50/20",
                      )}>
                        <td className="px-4 py-2.5 text-surface-400 text-[11px] font-medium">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-surface-900 text-sm whitespace-nowrap">{m.studentName}</td>
                        <td className="px-4 py-2.5">
                          <input
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="number"
                            min={0}
                            max={100}
                            value={m.score}
                            onFocus={() => setFocusedIdx(i)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext(i); } }}
                            onChange={(e) => updateMark(i, "score", e.target.value === "" ? "" : Number(e.target.value))}
                            className={clsx(
                              "w-full rounded-2xl border-2 px-3.5 py-2 text-sm transition-all duration-150",
                              "shadow-sm hover:shadow-lg active:scale-[0.97]",
                              "focus:outline-none focus:ring-[3px] focus:ring-brand-500/25",
                              m.score !== ""
                                ? "border-brand-300 bg-brand-50/60 focus:border-brand-500"
                                : "border-surface-200 bg-white hover:border-surface-300 focus:border-brand-400",
                            )}
                            placeholder="0-100"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4].map((l) => (
                              <button
                                key={l}
                                onClick={() => updateMark(i, "performanceLevel", l)}
                                className={clsx(
                                  "w-7 h-7 rounded-xl text-xs font-semibold transition-all duration-100",
                                  "shadow-sm active:scale-90",
                                  m.performanceLevel === l
                                    ? l >= 3 ? "bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-emerald-300" : l === 2 ? "bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-300" : "bg-red-100 text-red-700 shadow-sm ring-1 ring-red-300"
                                    : "bg-surface-100 text-surface-400 hover:bg-surface-200 hover:text-surface-500 hover:shadow-sm",
                                )}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={m.remarks}
                            onFocus={() => setFocusedIdx(i)}
                            onChange={(e) => updateMark(i, "remarks", e.target.value)}
                            className={clsx(
                              "w-full rounded-2xl border-2 px-3.5 py-2 text-sm transition-all duration-150",
                              "shadow-sm hover:shadow-lg active:scale-[0.97]",
                              "focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-400",
                              "border-surface-200 bg-white hover:border-surface-300",
                            )}
                            placeholder="Auto-set from level"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          {m.saved && (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {!m.saved && m.score !== "" && (
                            <svg className="w-5 h-5 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {!selectedSubject && grade && loaded && (
        <div className="flex flex-col items-center justify-center py-20 text-sm text-surface-400 gap-3">
          <svg className="w-10 h-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Select a subject to begin entering marks.</span>
        </div>
      )}

      {!loaded && grade && (
        <div className="flex items-center justify-center py-20 text-sm text-surface-400">
          <svg className="w-6 h-6 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading students...
        </div>
      )}
    </div>
  );
}

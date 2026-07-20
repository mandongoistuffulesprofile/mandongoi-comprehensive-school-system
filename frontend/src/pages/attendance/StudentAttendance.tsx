import { useEffect, useState } from "react";
import { studentsApi } from "../../api/students";
import type { Student } from "../../types";
import { Button, Card, PageHeader } from "../../components/ui/Basics";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import { api } from "../../lib/api";
import clsx from "clsx";

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "absent" | "late" | "excused";
  markedByName?: string;
}

const STATUS = ["absent", "late", "excused"] as const;

const STYLE = {
  absent: { dot: "bg-red-500", card: "ring-2 ring-red-300 bg-red-50", badge: "bg-red-500 text-white", label: "Absent", hover: "hover:bg-red-100" },
  late: { dot: "bg-amber-500", card: "ring-2 ring-amber-300 bg-amber-50", badge: "bg-amber-500 text-white", label: "Late", hover: "hover:bg-amber-100" },
  excused: { dot: "bg-blue-500", card: "ring-2 ring-blue-300 bg-blue-50", badge: "bg-blue-500 text-white", label: "Excused", hover: "hover:bg-blue-100" },
};

export default function StudentAttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exceptions, setExceptions] = useState<{ studentId: string; status: "absent" | "late" | "excused" }[]>([]);
  const [search, setSearch] = useState("");
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    studentsApi.list({ status: "active" }).then(setStudents);
  }, []);

  const filtered = students.filter((s) => {
    if (s.status !== "active") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName} ${s.grade}`.toLowerCase().includes(q);
  });

  const historyOptions = students
    .filter((s) => s.status === "active")
    .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${s.grade}` }));

  function toggleException(studentId: string) {
    setExceptions((prev) =>
      prev.some((e) => e.studentId === studentId)
        ? prev.filter((e) => e.studentId !== studentId)
        : [...prev, { studentId, status: "absent" }]
    );
  }

  function setExceptionStatus(studentId: string, status: "absent" | "late" | "excused") {
    setExceptions((prev) => prev.map((e) => e.studentId === studentId ? { ...e, status } : e));
  }

  async function saveExceptions() {
    try {
      for (const ex of exceptions) {
        await api.post("/attendance", { studentId: ex.studentId, date, status: ex.status });
      }
      toast.add("success", `${exceptions.length} exception${exceptions.length > 1 ? "s" : ""} recorded`);
      setExceptions([]);
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function loadHistory(studentId: string) {
    setHistoryLoading(true);
    try {
      const records = await api.get<AttendanceRecord[]>(`/attendance/student/${studentId}`);
      setHistoryRecords(records);
    } catch {
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const exceptionCount = exceptions.length;
  const allClear = exceptionCount === 0;

  return (
    <div className="animate-fade-in max-w-5xl space-y-5">
      <PageHeader
        title="Attendance"
        description="Only log absences, lateness, or excused students — everyone else is assumed present."
      />

      <Card className={clsx("p-4 transition-all duration-300", allClear && "border-emerald-200/60 bg-emerald-50/20")}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border-2 border-surface-200 bg-white px-3.5 py-2 text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
            {allClear ? (
              <div className="flex items-center gap-2 px-3.5 py-2 text-sm text-emerald-700 bg-emerald-100 rounded-xl font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                All present — no exceptions
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-500 font-medium bg-surface-100 px-3 py-2 rounded-xl">
                  {exceptionCount} student{exceptionCount > 1 ? "s" : ""} flagged
                </span>
              </div>
            )}
          </div>
          {exceptionCount > 0 && (
            <Button onClick={saveExceptions} className="animate-pulse shadow-sm">
              Save {exceptionCount} Exception{exceptionCount > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-surface-100">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name or grade..."
              className="w-full rounded-xl border-2 border-surface-200 bg-surface-50/50 pl-10 pr-4 py-2.5 text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className={clsx("grid gap-2.5 p-4", "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
          {filtered.map((s) => {
            const ex = exceptions.find((e) => e.studentId === s.id);
            const exStyle = ex ? STYLE[ex.status] : null;
            return (
              <div
                key={s.id}
                className={clsx(
                  "rounded-xl p-3 transition-all duration-150",
                  exStyle
                    ? `${exStyle.card}`
                    : "bg-surface-50 border border-surface-100 hover:border-surface-200 hover:shadow-sm",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0", exStyle ? exStyle.badge : "bg-surface-300")}>
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900 truncate">{s.firstName} {s.lastName}</p>
                      <p className="text-[11px] text-surface-400">{s.grade}</p>
                    </div>
                  </div>
                  {ex && (
                    <button
                      onClick={() => toggleException(s.id)}
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-surface-400 hover:text-red-500 hover:bg-white/50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {ex ? (
                  <div className="flex gap-1">
                    {STATUS.map((st) => (
                      <button
                        key={st}
                        onClick={() => setExceptionStatus(s.id, st)}
                        className={clsx(
                          "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-100 active:scale-95",
                          ex.status === st
                            ? STYLE[st].badge
                            : "bg-white/70 text-surface-500 hover:bg-white",
                        )}
                      >
                        {STYLE[st].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => toggleException(s.id)}
                    className="w-full py-1.5 rounded-lg text-[11px] font-medium text-surface-400 bg-white/50 hover:bg-white hover:text-surface-600 hover:shadow-sm border border-dashed border-surface-200 hover:border-surface-300 transition-all active:scale-95"
                  >
                    + Mark Exception
                  </button>
                )}
              </div>
            );
          })}
          {search && filtered.length === 0 && (
            <p className="col-span-full text-sm text-surface-400 text-center py-10">No students match &quot;{search}&quot;</p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="font-semibold text-surface-900 text-sm">Attendance History</h3>
          <div className="w-64">
            <Dropdown
              value={historyStudent?.id ?? ""}
              options={historyOptions}
              onChange={(v) => {
                const s = students.find((st) => st.id === v) ?? null;
                setHistoryStudent(s);
                if (s) loadHistory(s.id);
              }}
              placeholder="Select a student..."
              size="sm"
            />
          </div>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-surface-200 border-t-brand-600 animate-spin" />
          </div>
        ) : !historyStudent ? (
          <div className="flex flex-col items-center gap-2 py-8 text-surface-400">
            <svg className="w-8 h-8 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-sm">Select a student above to view their attendance history.</p>
          </div>
        ) : historyRecords.length === 0 ? (
          <p className="text-sm text-surface-400 py-4 text-center">No attendance records found for {historyStudent.firstName} {historyStudent.lastName}.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {historyRecords.map((r) => {
              const st = STYLE[r.status];
              return (
                <div key={r.id} className={clsx("flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors", st.hover)}>
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-2 h-2 rounded-full", st.dot)} />
                    <span className="font-mono text-surface-700">{new Date(r.date).toLocaleDateString("en-KE", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                  <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold", st.badge)}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

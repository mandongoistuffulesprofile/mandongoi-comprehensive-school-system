import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { studentsApi } from "../../api/students";
import { DataTable } from "../../components/ui/DataTable";
import { Button, EnumBadge, Card } from "../../components/ui/Basics";
import { PageNavigation } from "../../components/ui/PageNavigation";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import type { Student } from "../../types";
import { LEVELS } from "../../types";
import type { PaginationInfo } from "../../components/ui/Pagination";



const STUDENTS_QUICK_SWITCHERS = [
  { label: "Students", to: "/students", active: true },
  { label: "Marks Entry", to: "/academic/marks-entry" },
  { label: "Attendance", to: "/attendance" },
];

export default function StudentsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "schoolAdmin";
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [page, setPage] = useState(1);
  const [gradeFilter, setGradeFilter] = useState("");

  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const toast = useToast();

  const ALL_GRADES = useMemo(() => {
    return LEVELS.flatMap((l) => l.grades);
  }, []);

  async function load(p?: number) {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p ?? page, limit: 20 };
      if (search) params.search = search;
      if (gradeFilter) params.grade = gradeFilter;

      const result = await studentsApi.listPaginated(params as any);
      setRows(result.data as Student[]);
      setPagination(result.pagination);
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    load(1);
  }, [gradeFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { load(); }, [page]);

  function openEdit(row: Student) {
    setForm({ ...row, dateOfBirth: row.dateOfBirth?.slice(0, 10), enrollmentDate: row.enrollmentDate?.slice(0, 10) });
    setEditing(row);
  }

  const selectedLevel = LEVELS.find((l) => l.value === (form.level as string));
  const gradeOptions = selectedLevel?.grades.map((g) => ({ value: g, label: g })) ?? [];

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await studentsApi.update(editing.id, form);
        toast.add("success", "Student updated");
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const deletedRow = deleting;
    setDeleting(null);
    setRows((prev) => prev.filter((s) => s.id !== deletedRow.id));
    setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
    toast.add("success", "Student deleted");
    try {
      await studentsApi.remove(deletedRow.id);
    } catch (e) {
      setRows((prev) => [...prev, deletedRow].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
      setPagination((prev) => prev ? { ...prev, total: prev.total + 1 } : prev);
      toast.add("error", "Delete failed — restored");
    }
  }

  return (
    <div>
      <PageNavigation
        title="Students"
        description="Enrolled learners across all grades and classes."
        actions={isAdmin && <Button onClick={() => navigate("/students/new")}>+ New Student</Button>}
        quickSwitchers={STUDENTS_QUICK_SWITCHERS}
        activeQuickSwitcher="/students"      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-lg border border-outline pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
         <Dropdown
           value={gradeFilter}
           options={[
             { value: "", label: "All Grades" },
             ...ALL_GRADES.map((g: string) => ({ value: g, label: g })),
           ]}
           onChange={setGradeFilter}
           placeholder="All Grades"
         />
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (s) => <span className="font-medium">{s.firstName} {s.lastName}</span>, sortable: true, sortKey: "firstName" },
          { header: "Level", cell: (s) => <span className="text-xs uppercase tracking-wider text-on-surface-variant">{s.level?.replace("_", " ") || "—"}</span>, sortable: true, sortKey: "level" },
          { header: "Grade", cell: (s) => s.grade, sortable: true, sortKey: "grade" },
          { header: "Status", cell: (s) => <EnumBadge value={s.status} /> },
        ]}
        rows={rows}
        loading={loading}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        actions={
          isAdmin
            ? (row) => (
                <div className="flex gap-1">
                  <button className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded-md transition-colors" onClick={() => openEdit(row)}>Edit</button>
                  <button className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors" onClick={() => setDeleting(row)}>Delete</button>
                </div>
              )
            : undefined
        }
      />

      {editing && (
        <Modal title="Edit Student" onClose={() => { setEditing(null); }}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField spec={{ name: "firstName", label: "First Name", required: true }} value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
              <FormField spec={{ name: "lastName", label: "Last Name", required: true }} value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField spec={{ name: "dateOfBirth", label: "Date of Birth", type: "date", max: new Date().toISOString().slice(0, 10) }} value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
              <FormField spec={{ name: "gender", label: "Gender", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }] }} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField spec={{ name: "level", label: "Level", type: "select", options: LEVELS.map((l) => ({ value: l.value, label: l.label })) }} value={form.level} onChange={(v) => { setForm({ ...form, level: v, grade: "" }); }} />
              <FormField spec={{ name: "grade", label: "Grade", type: "select", required: true, options: gradeOptions }} value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} />
            </div>
            <FormField spec={{ name: "enrollmentDate", label: "Enrollment Date", type: "date", max: new Date().toISOString().slice(0, 10) }} value={form.enrollmentDate} onChange={(v) => setForm({ ...form, enrollmentDate: v })} />
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <Button variant="ghost" onClick={() => { setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update"}</Button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <div className="fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm flex items-start justify-center pt-16 z-50 animate-fade-in" onClick={() => setDeleting(null)}>
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-xl border border-outline-variant animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-on-surface mb-2">Delete Student</h3>
              <p className="text-sm text-on-surface-variant mb-6">This action cannot be undone. Are you sure?</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
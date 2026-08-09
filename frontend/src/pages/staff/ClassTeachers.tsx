import { useEffect, useState, useRef } from "react";
import { Card, Button, Spinner } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";
import Dropdown from "../../components/ui/Dropdown";
import { api } from "../../lib/api";
import { staffApi } from "../../api/staff";
import { useToast } from "../../lib/toast";
import { LEVELS } from "../../types";
import clsx from "clsx";

interface ClassTeacher {
  id: string;
  staffId: string;
  grade: string;
  class: string | null;
  signatureUrl: string | null;
  isActive: boolean;
  staffName: string;
}

export default function ClassTeachers() {
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClassTeacher | "new" | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const allGrades = LEVELS.flatMap((l) => l.grades);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<ClassTeacher[]>("/class-teachers"),
      staffApi.list({ role: "teacher" }),
    ]).then(([t, s]) => {
      setTeachers(t);
      setStaffList(s.map((st: any) => ({ id: st.id, name: st.name })));
    }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openEdit(ct: ClassTeacher | null) {
    setEditing(ct);
    setSelectedStaff(ct?.staffId ?? "");
    setSelectedGrade(ct?.grade ?? "");
    setSelectedClass(ct?.class ?? "");
    setSigPreview(ct?.signatureUrl ?? null);
  }

  async function uploadSig() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("signature", file);
    try {
      const res = await api.upload<{ url: string }>("/uploads/signature", fd);
      setSigPreview(res.url);
      toast.add("success", "Signature uploaded");
    } catch {
      toast.add("error", "Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!selectedStaff || !selectedGrade) return;
    setSaving(true);
    try {
      const payload = { staffId: selectedStaff, grade: selectedGrade, class: selectedClass || null, signatureUrl: sigPreview, isActive: true };
      if (editing) {
        await api.put(`/class-teachers/${editing.id}`, payload);
        toast.add("success", "Updated");
      } else {
        await api.post("/class-teachers", payload);
        toast.add("success", "Created");
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/class-teachers/${id}`);
      toast.add("success", "Removed");
      load();
    } catch {
      toast.add("error", "Failed to remove");
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageNavigation
        title="Class Teachers"
        description="Assign teachers to grades and upload their signature images for report cards."
        quickSwitchers={[{ label: "Staff Records", to: "/staff" }, { label: "Staff Attendance", to: "/staff/attendance" }]}
        activeQuickSwitcher="/staff/class-teachers"        actions={<Button onClick={() => { setEditing("new"); setSelectedStaff(""); setSelectedGrade(""); setSelectedClass(""); setSigPreview(null); }}>+ Assign Teacher</Button>}
      />

      {editing !== null && (
        <div className="bg-surface-container-lowest rounded-xl border border-primary/20 p-6 mb-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-on-surface">{editing && editing !== "new" ? "Edit" : "Assign"} Class Teacher</h3>
            <button onClick={() => setEditing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Teacher *</label>
              <Dropdown
                value={selectedStaff}
                options={staffList.map((s) => ({ value: s.id, label: s.name }))}
                onChange={setSelectedStaff}
                placeholder="Select teacher..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Grade *</label>
              <Dropdown
                value={selectedGrade}
                options={allGrades.map((g) => ({ value: g, label: g }))}
                onChange={setSelectedGrade}
                placeholder="Select grade..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Class</label>
              <Dropdown
                value={selectedClass}
                options={[
                  { value: "", label: "All classes" },
                  ...["A", "B", "C", "D", "E"].map((c) => ({ value: c, label: `Class ${c}` })),
                ]}
                onChange={setSelectedClass}
                placeholder="Class (optional)..."
              />
            </div>
          </div>
          <div className="border-t border-outline-variant pt-4">
            <label className="block text-sm font-medium text-on-surface mb-2">Signature Image <span className="text-on-surface-variant font-normal">(for report cards)</span></label>
            <div className="flex items-end gap-3">
              <input ref={fileRef} type="file" accept="image/*" className="block w-full text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-container file:text-on-primary-container hover:file:bg-primary-container transition-colors" />
              <Button size="sm" onClick={uploadSig}>Upload</Button>
            </div>
            {sigPreview && (
              <div className="mt-3 flex items-center gap-3">
                <img src={sigPreview} alt="Signature" className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest p-1" />
                <button onClick={() => setSigPreview(null)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !selectedStaff || !selectedGrade}>
              {saving ? "Saving..." : editing && editing !== "new" ? "Update Assignment" : "Assign Teacher"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
      ) : teachers.length === 0 ? (
        <Card className="p-10 text-center text-sm text-on-surface-variant">No class teachers assigned yet.</Card>
      ) : (
        <div className="space-y-2">
          {teachers.map((ct) => (
            <div key={ct.id} className="flex items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-5 py-4 hover:border-outline transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-14 rounded-lg bg-surface-container-low border border-outline-variant">
                  {ct.signatureUrl ? (
                    <img src={ct.signatureUrl} alt="sig" className="h-8 object-contain" />
                  ) : (
                    <span className="text-[11px] font-medium text-outline-variant">No sig</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{ct.staffName}</p>
                  <p className="text-sm text-on-surface-variant">{ct.grade}{ct.class ? ` · Class ${ct.class}` : ""}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(ct)} className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container rounded-lg transition-colors">Edit</button>
                <button onClick={() => remove(ct.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

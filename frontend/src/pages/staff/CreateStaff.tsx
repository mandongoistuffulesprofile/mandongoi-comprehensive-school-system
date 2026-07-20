import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { staffApi } from "../../api/staff";
import { Button, PageHeader, Card } from "../../components/ui/Basics";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";

export default function CreateStaff() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [teacherType, setTeacherType] = useState("bom");
  const [employmentType, setEmploymentType] = useState("flatRate");
  const [baseRate, setBaseRate] = useState("");
  const [extraSessionRate, setExtraSessionRate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !phone) { toast.add("error", "Name and phone are required"); return; }
    if (role === "teacher" && !baseRate) { toast.add("error", "Base rate is required for teachers"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, phone, email: email || undefined, role, isActive };
      if (role === "teacher") {
        payload.teacherType = teacherType;
        payload.employmentType = employmentType;
        payload.baseRate = baseRate;
        if (extraSessionRate) payload.extraSessionRate = extraSessionRate;
      } else {
        payload.teacherType = "bom";
        payload.employmentType = "flatRate";
        payload.baseRate = "0";
      }
      await staffApi.create(payload);
      toast.add("success", `${name} added to staff`);
      navigate("/staff");
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Staff" description="Add a teacher or support staff member." />

      <Card className="p-6 max-w-2xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "name", label: "Name", required: true, placeholder: "Full name" }} value={name} onChange={(v) => setName(v as string)} />
            <FormField spec={{ name: "phone", label: "Phone", required: true, placeholder: "+2547..." }} value={phone} onChange={(v) => setPhone(v as string)} />
          </div>
          <FormField spec={{ name: "email", label: "Email", type: "email", placeholder: "staff@school.edu" }} value={email} onChange={(v) => setEmail(v as string)} />
          <FormField spec={{ name: "role", label: "Role", type: "select", required: true, options: [{ value: "teacher", label: "Teacher" }, { value: "support", label: "Support" }] }} value={role} onChange={(v) => { setRole(v as string); if (v === "support") { setTeacherType("bom"); setEmploymentType("flatRate"); setBaseRate(""); setExtraSessionRate(""); } }} />

          {role === "teacher" && (
            <>
              <FormField spec={{ name: "teacherType", label: "Teacher Type", type: "select", required: true, options: [{ value: "bom", label: "BOM (Monthly Salary)" }, { value: "tsc", label: "TSC (Extra Duty Only)" }] }} value={teacherType} onChange={(v) => { setTeacherType(v as string); setEmploymentType(v === "bom" ? "flatRate" : "sessionBased"); }} />
              <FormField spec={{ name: "employmentType", label: "Employment Type", type: "select", required: true, options: [{ value: "flatRate", label: "Flat Rate" }, { value: "sessionBased", label: "Session Based" }] }} value={employmentType} onChange={(v) => setEmploymentType(v as string)} />
              <FormField spec={{ name: "baseRate", label: "Base Rate (KES)", type: "number", step: "0.01", required: true, helpText: teacherType === "tsc" ? "Per-session rate for TSC teachers" : "Monthly salary for BOM teachers" }} value={baseRate} onChange={(v) => setBaseRate(v as string)} />
              {teacherType === "bom" && (
                <FormField spec={{ name: "extraSessionRate", label: "Extra Session Rate (KES)", type: "number", step: "0.01", helpText: "Override default morning/evening/weekend rate (optional)" }} value={extraSessionRate} onChange={(v) => setExtraSessionRate(v as string)} />
              )}
            </>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-surface-300 text-brand-600 focus:ring-brand-500/20 focus:ring-2" />
            <span className="text-sm font-medium text-surface-700">Active</span>
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-200">
            <Button variant="ghost" onClick={() => navigate("/staff")}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Staff"}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

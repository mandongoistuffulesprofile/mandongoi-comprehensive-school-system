import { useEffect, useState, useRef } from "react";
import { settingsApi } from "../api/settings";
import { Button, Card, Spinner, PageHeader } from "../components/ui/Basics"
import { PageNavigation } from "../components/ui/PageNavigation";
import { FormField } from "../components/ui/FormField";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";
import type { SchoolSettings } from "../types";
import clsx from "clsx";

export default function SchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sigUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingSig, setUploadingSig] = useState<"head" | null>(null);
  const toast = useToast();

  useEffect(() => {
    settingsApi.get().then((s) => setSettings(s)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner className="w-8 h-8 mx-auto mt-20" />;
  if (!settings) return <p className="text-center text-on-surface-variant mt-20">No settings found</p>;

  const update = (key: keyof SchoolSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  async function uploadSignature(type: "head") {
    const file = sigUploadRef.current?.files?.[0];
    if (!file) return;
    setUploadingSig(type);
    const formData = new FormData();
    formData.append("signature", file);
    try {
      const res = await api.upload<{ url: string }>("/uploads/signature", formData);
      if (type === "head") {
        update("headTeacherSignature", res.url);
      }
      toast.add("success", "Signature uploaded");
    } catch (e) {
      toast.add("error", "Upload failed");
    } finally {
      setUploadingSig(null);
      if (sigUploadRef.current) sigUploadRef.current.value = "";
    }
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.add("success", "Settings saved");
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageNavigation
        title="School Settings"
        description="Configure your school name, term dates, and system preferences."
        quickSwitchers={[{ label: "Parent Accounts", to: "/parents/links" }, { label: "User Accounts", to: "/admin/users" }]}
        activeQuickSwitcher="/settings"
        quickSwitchers={[{ label: "Parent Accounts", to: "/parents/links" }, { label: "User Accounts", to: "/admin/users" }]}
        activeQuickSwitcher="/settings"
        actions={<Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>}
      />

      <div className="space-y-6 mt-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">School Information</h3>
          <FormField spec={{ name: "schoolName", label: "School Name", required: true }} value={settings.schoolName} onChange={(v) => update("schoolName", v as string)} />
          <FormField spec={{ name: "schoolMotto", label: "School Motto", type: "text" }} value={settings.schoolMotto} onChange={(v) => update("schoolMotto", v as string)} />
          <FormField spec={{ name: "schoolAddress", label: "Address", type: "text" }} value={settings.schoolAddress} onChange={(v) => update("schoolAddress", v as string)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "schoolPhone", label: "Phone", type: "tel" }} value={settings.schoolPhone} onChange={(v) => update("schoolPhone", v as string)} />
            <FormField spec={{ name: "schoolEmail", label: "Email", type: "email" }} value={settings.schoolEmail} onChange={(v) => update("schoolEmail", v as string)} />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">Current Term</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "currentTerm", label: "Term", required: true, options: [
              { value: "Term 1", label: "Term 1" },
              { value: "Term 2", label: "Term 2" },
              { value: "Term 3", label: "Term 3" },
            ]}} value={settings.currentTerm} onChange={(v) => update("currentTerm", v as string)} />
            <FormField spec={{ name: "currentAcademicYear", label: "Academic Year" }} value={settings.currentAcademicYear} onChange={(v) => update("currentAcademicYear", v as string)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "termStartDate", label: "Term Start Date", type: "date" }} value={settings.termStartDate?.split("T")[0] || ""} onChange={(v) => update("termStartDate", v as string)} />
            <FormField spec={{ name: "termEndDate", label: "Term End Date", type: "date" }} value={settings.termEndDate?.split("T")[0] || ""} onChange={(v) => update("termEndDate", v as string)} />
          </div>
          <FormField spec={{ name: "nextTermStartDate", label: "Next Term Start Date", type: "date" }} value={settings.nextTermStartDate?.split("T")[0] || ""} onChange={(v) => update("nextTermStartDate", v as string)} />
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">Other Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "currency", label: "Currency", options: [
              { value: "KES", label: "KES (Kenya Shilling)" },
              { value: "UGX", label: "UGX (Uganda Shilling)" },
              { value: "TZS", label: "TZS (Tanzania Shilling)" },
              { value: "USD", label: "USD (US Dollar)" },
            ]}} value={settings.currency} onChange={(v) => update("currency", v as string)} />
            <FormField spec={{ name: "smsSenderId", label: "SMS Sender ID" }} value={settings.smsSenderId} onChange={(v) => update("smsSenderId", v as string)} />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">Payroll Settings</h3>
          <p className="text-xs text-on-surface-variant">Configure salary payment day. The system will send in-app reminders before pay day.</p>
          <FormField spec={{ name: "payDay", label: "Pay Day (day of month 1-31)", type: "number", min: 1, max: 31 }} value={settings.payDay} onChange={(v) => update("payDay", Number(v))} />
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">Extra Duty Session Rates</h3>
          <p className="text-xs text-on-surface-variant">These are the default rates for morning, evening, and weekend sessions paid to teachers (both BOM and TSC). Individual teachers can override these.</p>
          <div className="grid grid-cols-3 gap-4">
            <FormField spec={{ name: "morningSessionRate", label: "Morning Session (KES)", type: "number" }} value={settings.morningSessionRate} onChange={(v) => update("morningSessionRate", v as string)} />
            <FormField spec={{ name: "eveningSessionRate", label: "Evening Session (KES)", type: "number" }} value={settings.eveningSessionRate} onChange={(v) => update("eveningSessionRate", v as string)} />
            <FormField spec={{ name: "weekendSessionRate", label: "Weekend Session (KES)", type: "number" }} value={settings.weekendSessionRate} onChange={(v) => update("weekendSessionRate", v as string)} />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg">Digital Signatures</h3>
          <p className="text-xs text-on-surface-variant">Upload scanned signature images. These will appear on printed report cards. Class teacher signatures are managed per-grade from the <strong>Staff &gt; Class Teachers</strong> page.</p>

          <div className="border-t border-outline-variant pt-4">
            <label className="block text-sm font-medium text-on-surface mb-2">Head Teacher Signature</label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input ref={sigUploadRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="block w-full text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-primary-container file:text-on-primary-container hover:file:bg-primary-container" />
              </div>
              <Button size="sm" onClick={() => uploadSignature("head")} disabled={uploadingSig === "head"}>
                {uploadingSig === "head" ? "Uploading..." : "Upload"}
              </Button>
            </div>
            {settings.headTeacherSignature && (
              <div className="mt-3 flex items-center gap-3">
                <img src={settings.headTeacherSignature} alt="Head teacher sig" className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest p-1" />
                <button onClick={() => update("headTeacherSignature", "")} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            )}
            {settings.headTeacherSignature && (
              <div className="mt-2">
                <label className="block text-xs text-on-surface-variant mb-1">Or paste image URL:</label>
                <input value={settings.headTeacherSignature} onChange={(e) => update("headTeacherSignature", e.target.value)}
                  className="w-full rounded-lg border border-outline px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

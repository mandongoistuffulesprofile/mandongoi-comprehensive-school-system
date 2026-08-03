import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { smsCampaignsApi, smsTemplatesApi, smsRecipientsApi } from "../../api/sms";
import { useAuth } from "../../lib/auth";
import type { SmsCampaign, SmsTemplate, GuardianRecipient } from "../../types";
import { Button, EnumBadge, PageHeader, Card, Money } from "../../components/ui/Basics";
import { DataTable } from "../../components/ui/DataTable";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import clsx from "clsx";

type TargetOption = "all" | "grade" | "fee-status" | "manual";

export default function SmsCampaigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "schoolAdmin";
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    smsCampaignsApi.list().then(setCampaigns).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function send(id: string) {
    try {
      await smsCampaignsApi.send(id);
      toast.add("success", "Campaign sent");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to send");
    }
  }

  if (showNew) {
    return <CreateCampaignFullPage onDone={() => { setShowNew(false); load(); }} onCancel={() => setShowNew(false)} />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Send Messages"
        description="Send SMS to parents — fee reminders, term dates, results, and more."
        actions={isAdmin && <Button onClick={() => setShowNew(true)}>+ New Message</Button>}
      />

      <DataTable
        columns={[
          { header: "Name", cell: (c) => c.name },
          { header: "Type", cell: (c) => c.type },
          { header: "Recipients", cell: (c) => c.recipientCount ?? "—" },
          { header: "Status", cell: (c) => <EnumBadge value={c.status} /> },
          { header: "Cost", cell: (c) => (c.cost ? <Money value={c.cost} /> : "—") },
        ]}
        rows={campaigns}
        loading={loading}
        actions={isAdmin ? (c) => c.status === "draft" ? (
          <button className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded-md transition-colors" onClick={() => send(c.id)}>Send</button>
        ) : null : undefined}
      />
    </div>
  );
}

function CreateCampaignFullPage({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<"message" | "target" | "review">("message");
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bulk" | "scheduled" | "automated">("bulk");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [target, setTarget] = useState<TargetOption>("all");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [feeStatus, setFeeStatus] = useState<string>("");
  const [recipients, setRecipients] = useState<GuardianRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => { smsTemplatesApi.list({ isActive: true }).then(setTemplates); }, []);
  useEffect(() => { smsRecipientsApi.grades().then(setGrades); }, []);

  useEffect(() => {
    const t = templates.find((t) => t.id === templateId);
    if (t) setMessage(t.content);
  }, [templateId, templates]);

  async function previewRecipients() {
    setLoadingRecipients(true);
    try {
      const params: any = {};
      if (target === "grade") params.grade = selectedGrade;
      if (target === "fee-status") params.feeStatus = feeStatus;
      if (target === "all") params.allGuardians = true;
      const res = await smsRecipientsApi.query(params);
      setRecipients(res);
      setRecipientCount(res.length);
    } catch (e) {
      toast.add("error", "Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }

  useEffect(() => {
    if (step === "target") previewRecipients();
  }, [step, target, selectedGrade, feeStatus]);

  function previewMessage(name: string, studentName: string) {
    return message
      .replace(/{guardianName}/g, name)
      .replace(/{studentName}/g, studentName)
      .replace(/{balance}/g, "1,500")
      .replace(/{dueDate}/g, "15 Aug 2026")
      .replace(/{totalAmount}/g, "5,000")
      .replace(/{amountPaid}/g, "3,500")
      .replace(/{currentTerm}/g, "Term 2")
      .replace(/{academicYear}/g, "2026")
      .replace(/{termStartDate}/g, "5 May 2026")
      .replace(/{termEndDate}/g, "15 Aug 2026")
      .replace(/{schoolName}/g, "School");
  }

  async function submit() {
    if (!name || !message || recipients.length === 0) return;
    setSaving(true);
    try {
      const campaign = await smsCampaignsApi.create({
        name,
        type,
        templateId: templateId || undefined,
        message,
        targetFilter: { target, grade: selectedGrade || undefined, feeStatus: feeStatus || undefined },
        recipientCount: recipients.length,
      });

      const res = await smsRecipientsApi.sendTargeted({
        recipients: recipients.map((r) => ({
          guardianId: r.id,
          phone: r.phone,
          name: r.name,
          studentName: r.studentName,
          studentId: r.studentId,
        })),
        message,
        templateId: templateId || undefined,
        campaignId: campaign.id,
      });

      toast.add("success", `Message sent to ${recipients.length} recipients`);
      onDone();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <button onClick={onCancel} className="hover:text-primary transition-colors">Send Messages</button>
        <span>/</span>
        <span className="text-on-surface font-medium">New Message</span>
        <span className="ml-auto text-xs text-on-surface-variant">
          Step {step === "message" ? "1" : step === "target" ? "2" : "3"} of 3
        </span>
      </div>

      <PageHeader title="New SMS Campaign" description="Write a message, choose recipients, and send." />

      {step === "message" && (
        <div className="mt-6 space-y-5">
          <Card className="p-6 space-y-5">
            <FormField spec={{ name: "name", label: "Campaign Name", required: true }} value={name} onChange={(v) => setName(v as string)} />
            <FormField spec={{ name: "type", label: "Schedule", required: true, type: "select", options: [
              { value: "bulk", label: "Send Now" },
              { value: "scheduled", label: "Schedule for Later" },
            ]}} value={type} onChange={(v) => setType(v as typeof type)} />
            <FormField spec={{ name: "templateId", label: "Use Template (optional)", type: "select", options: [
              { value: "", label: "— Write custom message —" },
              ...templates.map((t) => ({ value: t.id, label: t.name })),
            ]}} value={templateId} onChange={(v) => setTemplateId(v as string)} />
            <FormField spec={{ name: "message", label: "Message", type: "textarea", required: true, placeholder: "Dear {guardianName},\nYour child {studentName}..." }} value={message} onChange={(v) => setMessage(v as string)} />
            {message && (
              <details className="text-xs text-on-surface-variant">
                <summary className="cursor-pointer hover:text-on-surface-variant">Available variables</summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-on-surface-variant">
                  <span><code className="text-primary">{"{guardianName}"}</code> Parent name</span>
                  <span><code className="text-primary">{"{studentName}"}</code> Child name</span>
                  <span><code className="text-primary">{"{balance}"}</code> Fee balance</span>
                  <span><code className="text-primary">{"{totalAmount}"}</code> Total fee</span>
                  <span><code className="text-primary">{"{amountPaid}"}</code> Amount paid</span>
                  <span><code className="text-primary">{"{dueDate}"}</code> Due date</span>
                  <span><code className="text-primary">{"{currentTerm}"}</code> Current term</span>
                  <span><code className="text-primary">{"{academicYear}"}</code> Academic year</span>
                  <span><code className="text-primary">{"{termStartDate}"}</code> Term start date</span>
                  <span><code className="text-primary">{"{termEndDate}"}</code> Term end date</span>
                  <span><code className="text-primary">{"{schoolName}"}</code> School name</span>
                </div>
              </details>
            )}
          </Card>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => setStep("target")} disabled={!name || !message}>Choose Recipients →</Button>
          </div>
        </div>
      )}

      {step === "target" && (
        <div className="mt-6 space-y-5">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-on-surface">Who should receive this message?</h3>

            {[
              { value: "all" as TargetOption, label: "All Parents", desc: "Send to every guardian who hasn't opted out" },
              { value: "grade" as TargetOption, label: "By Grade", desc: "Send to parents of students in a specific grade" },
              { value: "fee-status" as TargetOption, label: "By Fee Status", desc: "Send to parents based on fee payment status" },
            ].map((opt) => (
              <label key={opt.value} className={clsx(
                "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:shadow-sm",
                target === opt.value ? "border-brand-500 bg-primary-container" : "border-outline-variant hover:border-outline"
              )}>
                <input type="radio" name="target" checked={target === opt.value} onChange={() => setTarget(opt.value)} className="accent-brand-600" />
                <div>
                  <p className="font-medium text-sm text-on-surface">{opt.label}</p>
                  <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                </div>
              </label>
            ))}

            {target === "grade" && (
              <div className="ml-10">
                <FormField spec={{ name: "grade", label: "Select Grade", type: "select", required: true, options: grades.map((g) => ({ value: g, label: g })) }} value={selectedGrade} onChange={(v) => setSelectedGrade(v as string)} />
              </div>
            )}
            {target === "fee-status" && (
              <div className="ml-10">
                <FormField spec={{ name: "feeStatus", label: "Fee Status", type: "select", required: true, options: [
                  { value: "overdue", label: "Overdue Fees" },
                  { value: "unpaid", label: "No Payment Made" },
                  { value: "partial", label: "Partially Paid" },
                  { value: "paid", label: "Fully Paid" },
                ]}} value={feeStatus} onChange={(v) => setFeeStatus(v as string)} />
              </div>
            )}

            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-sm font-medium text-on-surface">
                {loadingRecipients ? "Counting recipients..." : `${recipientCount} recipients selected`}
              </p>
              {recipients.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-on-surface-variant space-y-1">
                  {recipients.slice(0, 10).map((r) => (
                    <p key={r.id}>{r.name} → {r.studentName} ({r.phone})</p>
                  ))}
                  {recipients.length > 10 && <p className="text-on-surface-variant">...and {recipients.length - 10} more</p>}
                </div>
              )}
            </div>

            <div className="bg-primary-container rounded-xl p-4 text-sm text-primary">
              <p className="font-medium">Message preview:</p>
              <p className="mt-1 text-primary">
                {recipients[0]
                  ? previewMessage(recipients[0].name, recipients[0].studentName).slice(0, 120)
                  : message.slice(0, 120)}
                {(recipients[0] ? previewMessage(recipients[0].name, recipients[0].studentName) : message).length > 120 ? "..." : ""}
              </p>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("message")}>← Edit Message</Button>
            <Button onClick={submit} disabled={saving || recipients.length === 0}>
              {saving ? "Sending..." : `Send to ${recipientCount} recipients →`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { automatedRulesApi, smsTemplatesApi } from "../../api/sms";
import type { AutomatedSmsRule, SmsTemplate } from "../../types";
import { Button, EnumBadge, PageHeader, Card } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";

export default function AutomatedRules() {
  const [rules, setRules] = useState<AutomatedSmsRule[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([automatedRulesApi.list(), smsTemplatesApi.list()]).then(([r, t]) => {
      setRules(r);
      setTemplates(t);
    }).catch((e) => toast.add("error", e.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(rule: AutomatedSmsRule) {
    try {
      await automatedRulesApi.update(rule.id, { isActive: !rule.isActive });
      toast.add("success", rule.isActive ? "Rule disabled" : "Rule enabled");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to update rule");
    }
  }

  const templateName = (id?: string) => templates.find((t) => t.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Automated SMS Rules"
        description="Trigger-based messaging: fee due/overdue, low attendance, results published."
        actions={<Button onClick={() => setShowCreate(true)}>+ New Rule</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-brand-600 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rules.length === 0 && <p className="text-on-surface-variant text-sm text-center py-10">No rules configured yet.</p>}
          {rules.map((r) => (
            <Card key={r.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">{r.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  <EnumBadge value={r.triggerType} /> · template: {templateName(r.templateId)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <EnumBadge value={r.isActive ? "active" : "inactive"} />
                <Button variant="ghost" size="sm" onClick={() => toggle(r)}>
                  {r.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateRuleModal templates={templates} onClose={() => setShowCreate(false)} onDone={load} />}
    </div>
  );
}

function CreateRuleModal({ templates, onClose, onDone }: { templates: SmsTemplate[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("feeDueSoon");
  const [templateId, setTemplateId] = useState("");
  const toast = useToast();

  async function submit() {
    try {
      await automatedRulesApi.create({ name, triggerType, templateId, isActive: true } as any);
      toast.add("success", "Rule created");
      onDone();
      onClose();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to create rule");
    }
  }

  return (
    <Modal title="New Automated Rule" onClose={onClose}>
      <div className="space-y-5">
        <FormField spec={{ name: "name", label: "Rule Name", required: true }} value={name} onChange={(v) => setName(v as string)} />
        <FormField spec={{ name: "triggerType", label: "Trigger", type: "select", required: true, options: [
          { value: "feeDueSoon", label: "Fee Due Soon" },
          { value: "feeOverdue", label: "Fee Overdue" },
          { value: "lowAttendance", label: "Low Attendance" },
          { value: "resultPublished", label: "Result Published" },
          { value: "emergencyClosure", label: "Emergency Closure" },
          { value: "custom", label: "Custom" },
        ]}} value={triggerType} onChange={(v) => setTriggerType(v as string)} />
        <FormField spec={{ name: "templateId", label: "Template", type: "select", required: true, options: templates.map((t) => ({ value: t.id, label: t.name })) }} value={templateId} onChange={(v) => setTemplateId(v as string)} />
        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !templateId}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

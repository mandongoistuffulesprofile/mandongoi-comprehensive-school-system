import { useAuth } from "../../lib/auth";
import { smsTemplatesApi } from "../../api/sms";
import { ResourcePage } from "../../components/ui/ResourcePage";
import { PageNavigation } from '../../components/ui/PageNavigation';
import { EnumBadge } from "../../components/ui/Basics";
import type { SmsTemplate } from "../../types";

export default function SmsTemplates() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";

  return (
      <ResourcePage<SmsTemplate>
      quickSwitchers={[{ label: "Send Messages", to: "/sms/campaigns" }, { label: "Auto Messages", to: "/sms/automated-rules" }]}
      activeQuickSwitcher="/sms/templates"      title="SMS Templates"
      description="Reusable message templates used by campaigns and automated rules."
      canWrite={isAdmin}
      fields={[
        { name: "name", label: "Name", required: true },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "feeReminder", label: "Fee Reminder" },
            { value: "receipt", label: "Receipt" },
            { value: "results", label: "Results" },
            { value: "meeting", label: "Meeting" },
            { value: "attendance", label: "Attendance" },
            { value: "emergency", label: "Emergency" },
            { value: "custom", label: "Custom" },
          ],
        },
        { name: "content", label: "Content", type: "textarea", required: true, placeholder: "Dear {guardianName}, ..." },
        {
          name: "language",
          label: "Language",
          type: "select",
          options: [
            { value: "en", label: "English" },
            { value: "sw", label: "Swahili" },
          ],
        },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { header: "Name", cell: (t) => t.name },
        { header: "Type", cell: (t) => <EnumBadge value={t.type} /> },
        { header: "Language", cell: (t) => t.language.toUpperCase() },
        { header: "Status", cell: (t) => <EnumBadge value={t.isActive ? "active" : "inactive"} /> },
      ]}
      fetchList={() => smsTemplatesApi.list()}
      createItem={isAdmin ? (p) => smsTemplatesApi.create(p) : undefined}
      updateItem={isAdmin ? (id, p) => smsTemplatesApi.update(id, p) : undefined}
      deleteItem={isAdmin ? (id) => smsTemplatesApi.remove(id) : undefined}
    />
  );
}

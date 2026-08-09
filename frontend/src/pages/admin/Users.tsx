import { useState } from "react";
import { authApi } from "../../api/auth";
import type { Role } from "../../types";
import { Button, PageHeader, Card } from "../../components/ui/Basics"
import { PageNavigation } from "../../components/ui/PageNavigation";;
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";

export default function Users() {
  const [form, setForm] = useState<Record<string, unknown>>({ role: "teacher" });
  const toast = useToast();

  async function submit() {
    try {
      await authApi.register(form as { name: string; email: string; phone: string; password: string; role: Role });
      toast.add("success", "User created. They'll be prompted to reset their password on first login.");
      setForm({ role: "teacher" });
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to create user");
    }
  }

  return (
    <div>
      <PageNavigation title="Users" description="Register staff, accountants, and parent accounts."
        quickSwitchers={[{ label: "Parent Accounts", to: "/parents/links" }, { label: "Paybills", to: "/settings/paybills" }]}
        activeQuickSwitcher="/admin/users"
        quickSwitchers={[{ label: "Parent Accounts", to: "/parents/links" }, { label: "Paybills", to: "/settings/paybills" }]}
        activeQuickSwitcher="/admin/users" />

      <Card className="p-6 max-w-lg">
        <div className="space-y-5">
          <FormField spec={{ name: "name", label: "Full Name", required: true }} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <FormField spec={{ name: "phone", label: "Phone", required: true }} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <FormField spec={{ name: "password", label: "Temporary Password", required: true, placeholder: "Min 6 characters" }} value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <FormField spec={{ name: "role", label: "Role", type: "select", required: true, options: [
            { value: "schoolAdmin", label: "School Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "accountant", label: "Accountant" },
            { value: "parent", label: "Parent" },
          ]}} value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <div className="pt-2 border-t border-outline-variant">
            <Button onClick={submit} className="w-full">Create User</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

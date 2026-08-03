import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { staffApi } from "../../api/staff";
import { ResourcePage } from "../../components/ui/ResourcePage";
import { EnumBadge, Money, Button } from "../../components/ui/Basics";
import type { Staff } from "../../types";

const EDIT_FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "phone", label: "Phone", required: true },
  { name: "email", label: "Email" },
  { name: "isActive", label: "Active", type: "checkbox" },
];

export default function StaffList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";

  return (
    <ResourcePage<Staff>
      title="Staff"
      description="Teaching and support staff. BOM teachers get monthly salary; TSC get extra duty pay only."
      canWrite={isAdmin}
      fields={EDIT_FIELDS}
      extraHeaderActions={isAdmin && <Button onClick={() => navigate("/staff/new")}>+ New Staff</Button>}
      columns={[
        { header: "Name", cell: (s) => s.name },
        { header: "Teacher Type", cell: (s) => <EnumBadge value={s.teacherType === "bom" ? "BOM" : "TSC"} /> },
        { header: "Role", cell: (s) => <EnumBadge value={s.role} /> },
        { header: "Base Rate", cell: (s) => <Money value={s.baseRate} /> },
        { header: "Extra Rate", cell: (s) => (s.extraSessionRate ? <Money value={s.extraSessionRate} /> : <span className="text-on-surface-variant">default</span>) },
        { header: "Status", cell: (s) => <EnumBadge value={s.isActive ? "active" : "inactive"} /> },
      ]}
      fetchList={() => staffApi.list()}
      updateItem={isAdmin ? (id, p) => staffApi.update(id, p) : undefined}
      deleteItem={isAdmin ? (id) => staffApi.remove(id) : undefined}
    />
  );
}

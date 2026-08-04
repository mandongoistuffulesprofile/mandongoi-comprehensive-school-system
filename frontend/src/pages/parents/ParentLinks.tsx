import { useEffect, useState } from "react";
import { parentLinksApi } from "../../api/parentLinks";
import { Button, Card, PageHeader, Spinner, EmptyState } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import type { ParentStudentLink } from "../../types";

export default function ParentLinks() {
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [userId, setUserId] = useState("");
  const [studentId, setStudentId] = useState("");
  const toast = useToast();

  function load() {
    setLoading(true);
    parentLinksApi.list().then(setLinks).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create() {
    try {
      await parentLinksApi.create({ userId, studentId });
      toast.add("success", "Parent linked to student");
      setShowCreate(false);
      setUserId("");
      setStudentId("");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to create link");
    }
  }

  async function remove(id: string) {
    try {
      await parentLinksApi.remove(id);
      toast.add("success", "Link removed");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to remove link");
    }
  }

  return (
    <div>
      <PageHeader
        title="Parent Links"
        description="Assign parent accounts to students for the parent portal."
        actions={<Button onClick={() => setShowCreate(true)}>+ New Link</Button>}
      />

      {loading ? (
        <Spinner />
      ) : links.length === 0 ? (
        <EmptyState label="No parent links yet" description="Link parents to students so they can access the parent portal." />
      ) : (
        <Card>
          <div className="divide-y divide-outline-variant">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">{link.userName ?? link.userId}</p>
                  <p className="text-xs text-on-surface-variant">Student: {link.studentName ?? link.studentId}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => remove(link.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showCreate && (
        <Modal title="Link Parent to Student" onClose={() => setShowCreate(false)}>
          <div className="space-y-5">
            <FormField spec={{ name: "userId", label: "Parent User ID", required: true, placeholder: "User UUID" }} value={userId} onChange={(v) => setUserId(v as string)} />
            <FormField spec={{ name: "studentId", label: "Student ID", required: true, placeholder: "Student UUID" }} value={studentId} onChange={(v) => setStudentId(v as string)} />
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={create} disabled={!userId || !studentId}>Create Link</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

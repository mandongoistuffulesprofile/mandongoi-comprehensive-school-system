import { useEffect, useState } from "react";
import { Button, PageHeader } from "./Basics";
import { DataTable } from "./DataTable";
import type { Column } from "./DataTable";
import { FormField } from "./FormField";
import type { FieldSpec } from "./FormField";
import { ConfirmDialog, Modal } from "./Modal";
import { ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";

interface ResourcePageProps<T extends { id: string }> {
  title: string;
  description?: string;
  fields: FieldSpec[] | ((form: Record<string, unknown>) => FieldSpec[]);
  columns: Column<T>[];
  fetchList: () => Promise<T[]>;
  createItem?: (payload: Record<string, unknown>) => Promise<T>;
  updateItem?: (id: string, payload: Record<string, unknown>) => Promise<T>;
  deleteItem?: (id: string) => Promise<void>;
  canWrite?: boolean;
  extraHeaderActions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  formLayout?: "modal" | "fullPage";
}

export function ResourcePage<T extends { id: string }>({
  title,
  description,
  fields,
  columns,
  fetchList,
  createItem,
  updateItem,
  deleteItem,
  canWrite = true,
  extraHeaderActions,
  onRowClick,
  formLayout = "modal",
}: ResourcePageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<T | null | "new">(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleting, setDeleting] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const activeFields = typeof fields === "function" ? fields(form) : fields;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchList());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function initForm() {
    const defaultFields = typeof fields === "function" ? fields({}) : fields;
    const initial: Record<string, unknown> = {};
    defaultFields.forEach((f) => (initial[f.name] = f.type === "checkbox" ? false : ""));
    return initial;
  }

  function updateForm(name: string, value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "role" && value === "support") {
        delete next.teacherType;
        delete next.employmentType;
        delete next.baseRate;
        delete next.extraSessionRate;
      }
      if (name === "teacherType" && value === "bom") {
        next.employmentType = "flatRate";
      }
      if (name === "teacherType" && value === "tsc") {
        next.employmentType = "sessionBased";
      }
      return next;
    });
  }

  function openCreate() {
    setForm(initForm());
    setEditing("new");
  }

  function openEdit(row: T) {
    setForm({ ...row } as Record<string, unknown>);
    setEditing(row);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editing === "new" && createItem) {
        await createItem(form);
        toast.add("success", "Created successfully");
      } else if (editing && editing !== "new" && updateItem) {
        await updateItem(editing.id, form);
        toast.add("success", "Updated successfully");
      }
      setEditing(null);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed.";
      setError(msg);
      toast.add("error", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || !deleteItem) return;
    setSaving(true);
    try {
      await deleteItem(deleting.id);
      setDeleting(null);
      toast.add("success", "Deleted successfully");
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed.";
      setError(msg);
      toast.add("error", msg);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            {extraHeaderActions}
            {canWrite && createItem && <Button onClick={openCreate}>+ New</Button>}
          </div>
        }
      />

      {error && (
        <div className="mb-4 text-sm text-on-error-container bg-error-container border border-error/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-base shrink-0">error</span>
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyDescription="Get started by creating the first entry."
        onRowClick={onRowClick}
        actions={
          canWrite && (updateItem || deleteItem)
            ? (row) => (
                <div className="flex gap-1">
                  {updateItem && (
                    <button
                      className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded-md transition-colors"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                  )}
                  {deleteItem && (
                    <button
                      className="px-2.5 py-1 text-xs font-medium text-error hover:bg-error-container rounded-md transition-colors"
                      onClick={() => setDeleting(row)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )
            : undefined
        }
      />

      {editing && formLayout === "modal" && (
        <Modal title={editing === "new" ? `New ${title}` : `Edit ${title}`} onClose={() => setEditing(null)}>
          <div className="space-y-5">
            {activeFields.map((f) => (
              <FormField key={f.name} spec={f} value={form[f.name]} onChange={(v) => updateForm(f.name, v)} />
            ))}
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {editing && formLayout === "fullPage" && (
        <div className="mt-6 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">{editing === "new" ? `New ${title}` : `Edit ${title}`}</h2>
              <p className="text-sm text-on-surface-variant mt-0.5">Fill in the details below</p>
            </div>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 space-y-5">
            {activeFields.map((f) => (
              <FormField key={f.name} spec={f} value={form[f.name]} onChange={(v) => updateForm(f.name, v)} />
            ))}
            <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${title}`}
          message="This action cannot be undone. Are you sure?"
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
          loading={saving}
        />
      )}
    </div>
  );
}

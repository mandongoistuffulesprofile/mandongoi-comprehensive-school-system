import { useEffect, useState } from "react";
import { learningAreasApi, strandsApi } from "../../api/academic";
import { useAuth } from "../../lib/auth";
import { ResourcePage } from "../../components/ui/ResourcePage";
import { Button } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import type { LearningArea, Strand } from "../../types";

export default function LearningAreas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const [selected, setSelected] = useState<LearningArea | null>(null);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  async function seedCbc() {
    setSeeding(true);
    try {
      const res = await learningAreasApi.seed();
      toast.add("success", `Seeded ${res.created} new CBC subjects (${res.total} total)`);
    } catch (e) {
      toast.add("error", "Failed to seed subjects");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <ResourcePage<LearningArea>
        title="Learning Areas"
        description="CBC learning areas and their applicable grade levels."
        canWrite={isAdmin}
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "e.g. Mathematics" },
          { name: "gradeLevels", label: "Grade Levels (comma separated)", placeholder: "Grade 1, Grade 2" },
        ]}
        columns={[
          { header: "Name", cell: (a) => a.name },
          { header: "Grade Levels", cell: (a) => (Array.isArray(a.gradeLevels) ? a.gradeLevels.join(", ") : "") },
          {
            header: "Strands",
            cell: (a) => (
              <button className="text-ochre text-xs hover:underline" onClick={() => setSelected(a)}>
                View strands
              </button>
            ),
          },
        ]}
        fetchList={() => learningAreasApi.list()}
        createItem={
          isAdmin
            ? (p) =>
                learningAreasApi.create({
                  ...p,
                  gradeLevels: typeof p.gradeLevels === "string" ? p.gradeLevels.split(",").map((s) => s.trim()).filter(Boolean) : [],
                })
            : undefined
        }
        updateItem={
          isAdmin
            ? (id, p) =>
                learningAreasApi.update(id, {
                  ...p,
                  gradeLevels: typeof p.gradeLevels === "string" ? (p.gradeLevels as string).split(",").map((s) => s.trim()).filter(Boolean) : (p.gradeLevels as string[] | undefined),
                })
            : undefined
        }
        deleteItem={isAdmin ? (id) => learningAreasApi.remove(id) : undefined}
        extraHeaderActions={isAdmin && <Button variant="secondary" onClick={seedCbc} disabled={seeding}>{seeding ? "Seeding..." : "Seed CBC Subjects"}</Button>}
      />

      {selected && <StrandsModal area={selected} canWrite={isAdmin} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StrandsModal({ area, canWrite, onClose }: { area: LearningArea; canWrite: boolean; onClose: () => void }) {
  const [strands, setStrands] = useState<Strand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  function load() {
    setLoading(true);
    strandsApi.listByLearningArea(area.id).then(setStrands).finally(() => setLoading(false));
  }
  useEffect(load, [area.id]);

  async function add() {
    if (!newName.trim()) return;
    await strandsApi.create({ learningAreaId: area.id, name: newName.trim() });
    setNewName("");
    load();
  }

  async function remove(id: string) {
    await strandsApi.remove(id);
    load();
  }

  return (
    <Modal title={`Strands · ${area.name}`} onClose={onClose}>
      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : (
        <div className="space-y-2 mb-4">
          {strands.length === 0 && <p className="text-sm text-ink/50">No strands yet.</p>}
          {strands.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-navy/5 rounded px-3 py-2 text-sm">
              {s.name}
              {canWrite && (
                <button className="text-brick text-xs hover:underline" onClick={() => remove(s.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <FormField spec={{ name: "name", label: "" }} value={newName} onChange={(v) => setNewName(v as string)} />
          <Button onClick={add}>Add</Button>
        </div>
      )}
    </Modal>
  );
}

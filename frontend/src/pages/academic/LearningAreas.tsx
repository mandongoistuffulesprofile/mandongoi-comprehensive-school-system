import { useEffect, useState, useMemo } from "react";
import { learningAreasApi, strandsApi } from "../../api/academic";
import { useAuth } from "../../lib/auth";
import { Button, Card, EnumBadge, Spinner, EmptyState } from "../../components/ui/Basics";
import { PageNavigation } from "../../components/ui/PageNavigation";
import { GradeGridSelector, type GradeGridSelectorOption } from "../../components/ui/GradeGridSelector";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import type { LearningArea, Strand } from "../../types";
import { LEVELS } from "../../types";
import clsx from "clsx";
import { Plus, Search, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

const GRADE_OPTIONS: GradeGridSelectorOption[] = LEVELS.map((l) => ({ value: l, label: l }));

const LEVEL_GROUPS = [
  { key: "pre_primary", label: "PP1–PP2", levels: ["PP1", "PP2"] },
  { key: "lower_primary", label: "Grade 1–3", levels: ["Grade 1", "Grade 2", "Grade 3"] },
  { key: "upper_primary", label: "Grade 4–6", levels: ["Grade 4", "Grade 5", "Grade 6"] },
  { key: "junior_secondary", label: "Grade 7–9", levels: ["Grade 7", "Grade 8", "Grade 9"] },
];

const CBC_SEED_PREVIEW = [
  { name: "English", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Kiswahili", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Mathematics", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Science & Technology", gradeLevels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Social Studies", gradeLevels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Christian Religious Education", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Islamic Religious Education", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Creative Arts", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Physical & Health Education", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Home Science", gradeLevels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Agriculture", gradeLevels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Music", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Art & Craft", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Indigenous Language", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Pastoral Programme of Instruction", gradeLevels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "Computer Studies", gradeLevels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
  { name: "French", gradeLevels: ["Grade 7", "Grade 8", "Grade 9"] },
];

function getLevelGroup(gradeLevels: string[]): string {
  if (!gradeLevels?.length) return "unknown";
  for (const group of LEVEL_GROUPS) {
    if (gradeLevels.some((g) => group.levels.includes(g))) return group.key;
  }
  return "unknown";
}

export default function LearningAreas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();

  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<LearningArea | null>(null);
  const [strands, setStrands] = useState<Strand[]>([]);
  const [strandsLoading, setStrandsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArea, setEditingArea] = useState<LearningArea | null>(null);
  const [formData, setFormData] = useState<{ name: string; gradeLevels: string[] }>({ name: "", gradeLevels: [] });
  const [saving, setSaving] = useState(false);
  const [seedPreview, setSeedPreview] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deletingArea, setDeletingArea] = useState<LearningArea | null>(null);
  const [deletingStrand, setDeletingStrand] = useState<Strand | null>(null);
  const [newStrandName, setNewStrandName] = useState("");

  function loadAreas() {
    setLoading(true);
    setError(null);
    if (levelFilter === "all") {
      learningAreasApi.list()
        .then(setLearningAreas)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    } else {
      const group = LEVEL_GROUPS.find((g) => g.key === levelFilter);
      if (group) {
        learningAreasApi.listByLevel(group.levels[0])
          .then(setLearningAreas)
          .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
          .finally(() => setLoading(false));
      }
    }
  }

  function loadStrands(area: LearningArea) {
    setStrandsLoading(true);
    strandsApi.listByLearningArea(area.id)
      .then(setStrands)
      .catch(() => toast.add("error", "Failed to load strands"))
      .finally(() => setStrandsLoading(false));
  }

  useEffect(() => { loadAreas(); }, [levelFilter]);
  useEffect(() => { if (selectedArea) loadStrands(selectedArea); }, [selectedArea]);

  const filteredAreas = useMemo(() => {
    return learningAreas.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [learningAreas, searchQuery]);

  function openCreate() {
    setFormData({ name: "", gradeLevels: [] });
    setEditingArea(null);
    setShowCreateModal(true);
  }

  function openEdit(area: LearningArea) {
    setFormData({ name: area.name, gradeLevels: area.gradeLevels });
    setEditingArea(area);
    setShowCreateModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim() || formData.gradeLevels.length === 0) {
      toast.add("error", "Name and at least one grade level are required");
      return;
    }
    setSaving(true);
    try {
      if (editingArea) {
        await learningAreasApi.update(editingArea.id, { name: formData.name, gradeLevels: formData.gradeLevels });
        toast.add("success", "Learning area updated");
      } else {
        await learningAreasApi.create({ name: formData.name, gradeLevels: formData.gradeLevels });
        toast.add("success", "Learning area created");
      }
      setShowCreateModal(false);
      loadAreas();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletingArea) return;
    setSaving(true);
    try {
      await learningAreasApi.remove(deletingArea.id);
      toast.add("success", "Learning area deleted");
      if (selectedArea?.id === deletingArea.id) setSelectedArea(null);
      setDeletingArea(null);
      loadAreas();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Delete failed");
    } finally { setSaving(false); }
  }

  async function seedCbc() {
    setSeeding(true);
    try {
      const res = await learningAreasApi.seed();
      toast.add("success", `Seeded ${res.created} new CBC subjects (${res.total} total)`);
      setSeedPreview(false);
      loadAreas();
    } catch (e) {
      toast.add("error", "Failed to seed subjects");
    } finally { setSeeding(false); }
  }

  async function addStrand() {
    if (!newStrandName.trim() || !selectedArea) return;
    await strandsApi.create({ learningAreaId: selectedArea.id, name: newStrandName.trim() });
    setNewStrandName("");
    loadStrands(selectedArea);
  }

  async function removeStrand() {
    if (!deletingStrand) return;
    await strandsApi.remove(deletingStrand.id);
    setDeletingStrand(null);
    if (selectedArea) loadStrands(selectedArea);
  }

  return (
    <div className="h-full flex flex-col">
      <PageNavigation
        title="Learning Areas"
        description="CBC learning areas, grade levels, and strands."
        quickSwitchers={[
          { label: "Curriculum", to: "/academic/curriculum" },
          { label: "Assessments", to: "/academic/marks" },
        ]}
        activeQuickSwitcher="/academic/learning-areas"
        actions={isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSeedPreview(true)} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed CBC Subjects"}
            </Button>
            <Button onClick={openCreate}>+ Add Learning Area</Button>
          </div>
        )}
      />

      {error && (
        <div className="mb-4 text-sm text-on-error-container bg-error-container border border-error/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Learning Areas List */}
        <div className="w-full md:w-3/5 lg:w-1/2 border-r border-cbcBorder flex flex-col bg-canvas">
          {/* Level Filter Tabs */}
          <div className="p-4 border-b border-cbcBorder bg-surface flex flex-wrap gap-2">
            <button
              className={clsx("px-3 py-1.5 text-sm rounded-full border transition-colors", levelFilter === "all" ? "bg-navy-900 text-white border-navy-900" : "bg-surface text-steel border-cbcBorder hover:bg-canvas")}
              onClick={() => setLevelFilter("all")}
            >
              All
            </button>
            {LEVEL_GROUPS.map((group) => (
              <button
                key={group.key}
                className={clsx("px-3 py-1.5 text-sm rounded-full border transition-colors", levelFilter === group.key ? "bg-navy-900 text-white border-navy-900" : "bg-surface text-steel border-cbcBorder hover:bg-canvas")}
                onClick={() => setLevelFilter(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-4 border-b border-cbcBorder bg-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
              <input
                type="text"
                placeholder="Search learning areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-canvas border border-cbcBorder rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-600/25"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-steel">
                <Spinner className="w-6 h-6" />
                <p className="text-sm">Loading…</p>
              </div>
            ) : filteredAreas.length === 0 ? (
              <EmptyState
                label="No learning areas found"
                description={levelFilter !== "all" ? "Try a different level filter or search." : isAdmin ? "Click 'Seed CBC Subjects' to populate with standard CBC subjects." : "Contact admin to add learning areas."}
                action={isAdmin && levelFilter === "all" ? (
                  <Button variant="secondary" onClick={() => setSeedPreview(true)}>Seed CBC Subjects</Button>
                ) : undefined}
              />
            ) : (
              <div className="p-2 space-y-1">
                {filteredAreas.map((area) => {
                  const group = LEVEL_GROUPS.find((g) => g.key === getLevelGroup(area.gradeLevels));
                  const isSelected = selectedArea?.id === area.id;
                  return (
                    <button
                      key={area.id}
                      onClick={() => { setSelectedArea(area); loadStrands(area); }}
                      className={clsx(
                        "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3",
                        isSelected ? "bg-navy-900/10 border border-navy-900/20" : "hover:bg-surface hover:border-cbcBorder",
                        "border"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={clsx("font-medium truncate", isSelected ? "text-navy-900" : "text-ink")}>{area.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {area.gradeLevels.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className={clsx(
                                "px-1.5 py-0.5 text-[10px] rounded border",
                                isSelected ? "bg-navy-900 text-white border-navy-900" : "bg-surface text-steel border-cbcBorder"
                              )}
                            >
                              {g}
                            </span>
                          ))}
                          {area.gradeLevels.length > 4 && (
                            <span className={clsx("px-1.5 py-0.5 text-[10px] rounded border text-steel", isSelected ? "text-navy-900" : "")}>
                              +{area.gradeLevels.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "text-xs px-2 py-1 rounded-full",
                          group?.key === "pre_primary" ? "bg-amber-100 text-amber-700" :
                          group?.key === "lower_primary" ? "bg-emerald-100 text-emerald-700" :
                          group?.key === "upper_primary" ? "bg-blue-100 text-blue-700" :
                          group?.key === "junior_secondary" ? "bg-purple-100 text-purple-700" :
                          "bg-surface text-steel"
                        )}>
                          {group?.label ?? "Unknown"}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(area); }}
                            className="p-1.5 text-steel hover:text-navy-900 hover:bg-surface rounded transition-colors"
                            title="Edit"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Strands Detail */}
        <div className="w-full md:w-2/5 lg:w-1/2 flex flex-col min-w-0">
          {selectedArea ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-cbcBorder bg-surface flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-navy-900/10 flex items-center justify-center">
                    <span className="text-navy-900 font-bold text-lg">{selectedArea.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{selectedArea.name}</h3>
                    <p className="text-xs text-steel">
                      {selectedArea.gradeLevels.join(", ")}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => openEdit(selectedArea)}>
                    <Plus className="w-4 h-4 mr-1" /> Edit Area
                  </Button>
                )}
              </div>

              {/* Strands List */}
              <div className="flex-1 overflow-y-auto p-4">
                {strandsLoading ? (
                  <div className="flex items-center justify-center h-full gap-3 text-steel">
                    <Spinner className="w-6 h-6" />
                    <p className="text-sm">Loading strands…</p>
                  </div>
                ) : strands.length === 0 ? (
                  <EmptyState
                    label="No strands yet"
                    description="Add strands to define the sub-topics for this learning area."
                    action={isAdmin ? null : undefined}
                  />
                ) : (
                  <ul className="space-y-2" role="list">
                    {strands.map((strand) => (
                      <li key={strand.id} className="flex items-center justify-between bg-canvas rounded-lg border border-cbcBorder px-4 py-3 hover:border-accent-600/30 transition-colors">
                        <span className="font-medium text-ink flex-1">{strand.name}</span>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingStrand(strand)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete strand"
                          >
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add Strand Form */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-cbcBorder">
                    <div className="flex gap-2">
                      <FormField
                        spec={{ name: "name", label: "New Strand", placeholder: "e.g. Numbers & Operations", required: true }}
                        value={newStrandName}
                        onChange={(v) => setNewStrandName(v as string)}
                      />
                      <Button onClick={addStrand} disabled={!newStrandName.trim() || strandsLoading}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-steel">
              <div className="text-center px-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface border border-cbcBorder flex items-center justify-center">
                  <span className="text-3xl">📚</span>
                </div>
                <p className="text-lg font-medium text-ink mb-1">Select a learning area</p>
                <p className="text-sm">Choose from the list to view and manage its strands.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showCreateModal && (
        <Modal title={editingArea ? `Edit ${editingArea.name}` : "New Learning Area"} onClose={() => { setShowCreateModal(false); setEditingArea(null); }}>
          <div className="space-y-5">
            <FormField
              spec={{ name: "name", label: "Name", required: true, placeholder: "e.g. Mathematics" }}
              value={formData.name}
              onChange={(v) => setFormData((p) => ({ ...p, name: v as string }))}
            />
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5 cursor-pointer">
                Grade Levels <span className="text-error ml-0.5">*</span>
              </label>
              <GradeGridSelector
                value={formData.gradeLevels}
                options={GRADE_OPTIONS}
                onChange={(v) => setFormData((p) => ({ ...p, gradeLevels: v as string[] }))}
                multiple
                placeholder="Select grade levels…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-cbcBorder">
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); setEditingArea(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </Modal>
      )}

      {seedPreview && (
        <ConfirmDialog
          title="Seed CBC Subjects"
          message="Create standard CBC learning areas with their grade-level mappings?"
          supporting="Existing subjects will not be duplicated. This will add 18 standard subjects."
          fields={CBC_SEED_PREVIEW.map((s) => ({
            label: s.name,
            value: s.gradeLevels.join(", "),
          }))}
          onConfirm={seedCbc}
          onCancel={() => setSeedPreview(false)}
          loading={seeding}
          danger={false}
        />
      )}

      {deletingArea && (
        <ConfirmDialog
          title="Delete Learning Area"
          message={`Delete "${deletingArea.name}"? This will also remove all its strands.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingArea(null)}
          danger={true}
          loading={saving}
        />
      )}

      {deletingStrand && (
        <ConfirmDialog
          title="Delete Strand"
          message={`Delete "${deletingStrand.name}" from "${selectedArea?.name}"?`}
          onConfirm={removeStrand}
          onCancel={() => setDeletingStrand(null)}
          danger={true}
          loading={strandsLoading}
        />
      )}
    </div>
  );
}
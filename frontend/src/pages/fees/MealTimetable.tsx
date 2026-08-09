import { useEffect, useState, useMemo } from "react";
import { api } from "../../lib/api";
import { Button, PageHeader, Spinner, Money } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import clsx from "clsx";

interface MealTemplate {
  id: string;
  dayOfWeek: string;
  mealType: string;
  presetId: string;
  fixedQuantity: string;
  isActive: boolean;
  term: number;
  academicYear: number;
  itemName: string;
  unit: string;
  unitPrice: string;
}

interface FoodPreset {
  id: string;
  itemName: string;
  unitPrice: string;
  unit: string;
  isActive: boolean;
}

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  supper: "Supper",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🥐",
  lunch: "🥘",
  supper: "🍲",
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MEALS = ["breakfast", "lunch", "supper"];

function getCurrentKenyanTerm(): { term: number; academicYear: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 1 && month <= 4) return { term: 1, academicYear: year };
  if (month >= 5 && month <= 8) return { term: 2, academicYear: year };
  return { term: 3, academicYear: year };
}

export default function MealTimetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [presets, setPresets] = useState<FoodPreset[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const defaultTerm = getCurrentKenyanTerm();
  const [selectedTerm, setSelectedTerm] = useState(defaultTerm.term);
  const [selectedYear, setSelectedYear] = useState(defaultTerm.academicYear);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<MealTemplate[]>("/meal-templates", { term: selectedTerm, academicYear: selectedYear }),
      api.get<FoodPreset[]>("/food-presets"),
    ])
      .then(([tmplts, prst]) => {
        setTemplates(tmplts || []);
        setPresets(prst || []);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [selectedTerm, selectedYear]);

  const grid = useMemo(() => {
    const map = new Map<string, MealTemplate[]>();
    for (const t of templates) {
      const key = `${t.dayOfWeek}:${t.mealType}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [templates]);

  const cellItems = (day: string, meal: string) => grid.get(`${day}:${meal}`) || [];
  const activeItems = activeDay && activeMeal ? cellItems(activeDay, activeMeal) : [];

  function openEdit(day: string, meal: string) {
    if (!isAdmin) return;
    setActiveDay(day);
    setActiveMeal(meal);
    setEditing(true);
    setSelectedPreset("");
    setQuantity(0);
  }

  async function addItem() {
    if (!selectedPreset || quantity <= 0) {
      toast.add("error", "Select a food item and enter quantity");
      return;
    }
    setSaving(true);
    try {
      await api.post("/meal-templates", {
        dayOfWeek: activeDay,
        mealType: activeMeal,
        presetId: selectedPreset,
        fixedQuantity: quantity,
        term: selectedTerm,
        academicYear: selectedYear,
      });
      toast.add("success", "Item added");
      setSelectedPreset("");
      setQuantity(0);
      load();
    } catch (e: any) {
      toast.add("error", e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    setSaving(true);
    try {
      await api.delete(`/meal-templates/${id}`);
      toast.add("success", "Removed");
      load();
    } catch (e: any) {
      toast.add("error", e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    try {
      await api.put(`/meal-templates/${id}`, { isActive: !currentlyActive });
      load();
    } catch (e: any) {
      toast.add("error", e?.message || "Failed");
    }
  }

  const usedPresetIds = new Set(activeItems.map((i) => i.presetId));
  const availablePresets = presets.filter((p) => p.isActive && !usedPresetIds.has(p.id));

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const t of templates) {
      if (!t.isActive) continue;
      const activePreset = presets.find((p) => p.id === t.presetId);
      if (!activePreset) continue;
      totals[t.dayOfWeek] = (totals[t.dayOfWeek] || 0) + Number(t.fixedQuantity) * Number(activePreset.unitPrice);
    }
    return totals;
  }, [templates, presets]);

  const grandTotal = Object.values(dayTotals).reduce((s, v) => s + v, 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Daily Meal Timetable"
        description={isAdmin ? "Set fixed food quantities for each meal, each day. These are auto-consumed by the system daily." : "View the daily food plan for the school."}
      />

      <div className="flex items-center gap-3 mb-6">
        <div>
          <label className="text-xs text-on-surface-variant font-medium mb-1 block">Term</label>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(Number(e.target.value))}
            className="rounded-lg border border-outline px-3 py-2 text-sm bg-surface-container-lowest">
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant font-medium mb-1 block">Year</label>
          <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 rounded-lg border border-outline px-3 py-2 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
      ) : (
        <>
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-3 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider w-20">Meal</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-2 py-3 text-center text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      {DAY_LABELS[d].slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEALS.map((meal) => (
                  <tr key={meal} className="border-b border-outline-variant last:border-0">
                    <td className="px-3 py-2 font-medium text-on-surface">
                      <span className="mr-1.5">{MEAL_ICONS[meal]}</span>
                      {MEAL_LABELS[meal]}
                    </td>
                    {DAYS.map((day) => {
                      const items = cellItems(day, meal);
                      return (
                        <td
                          key={day}
                          onClick={() => openEdit(day, meal)}
                          className={clsx(
                            "px-2 py-2 text-center align-top min-w-[90px]",
                            isAdmin && "cursor-pointer hover:bg-primary-container/50 transition-colors"
                          )}
                        >
                          {items.length === 0 ? (
                            <span className="text-xs text-outline-variant">{isAdmin ? "Click to add" : "—"}</span>
                          ) : (
                            <div className="space-y-1">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={clsx(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    item.isActive
                                      ? "bg-primary-container text-on-primary-container"
                                      : "bg-surface-container-low text-on-surface-variant line-through"
                                  )}
                                >
                                  <span className="font-medium">{item.itemName}</span>
                                  <br />
                                  <span className="text-[10px]">{Number(item.fixedQuantity)}{item.unit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-4">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant px-5 py-3 flex-1">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider">Daily Food Cost (All Meals)</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center">
                    <p className="text-[10px] text-on-surface-variant uppercase">{DAY_LABELS[d].slice(0, 3)}</p>
                    <p className="text-sm font-bold text-on-surface">
                      <Money value={dayTotals[d] || 0} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-container to-primary-container rounded-xl shadow-sm border border-primary/20 px-5 py-3">
              <p className="text-xs text-primary uppercase tracking-wider">Weekly Total</p>
              <p className="text-xl font-bold text-primary mt-1">
                <Money value={grandTotal} />
              </p>
            </div>
          </div>
        </>
      )}

      {editing && activeDay && activeMeal && (
        <Modal
          title={`Edit — ${DAY_LABELS[activeDay]} ${MEAL_LABELS[activeMeal]}`}
          onClose={() => setEditing(false)}
          width="max-w-lg"
        >
          <div className="space-y-4">
            {activeItems.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No items added yet.</p>
            ) : (
              <div className="space-y-2">
                {activeItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2">
                    <div>
                      <span className={clsx("text-sm font-medium", !item.isActive && "line-through text-on-surface-variant")}>
                        {item.itemName}
                      </span>
                      <span className="text-xs text-on-surface-variant ml-2">
                        {Number(item.fixedQuantity)} {item.unit}
                        {" "}· <Money value={Number(item.fixedQuantity) * Number(item.unitPrice)} />
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleActive(item.id, item.isActive)}
                        className={clsx(
                          "text-xs px-2 py-1 rounded-md",
                          item.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        {item.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => removeItem(item.id)} disabled={saving}
                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-outline-variant pt-4">
              <p className="text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-wider">Add Food Item</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full rounded-lg border border-outline px-3 py-2 text-sm bg-surface-container-lowest">
                    <option value="">Select item...</option>
                    {availablePresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.itemName} (KES {Number(p.unitPrice).toLocaleString()}/{p.unit})
                      </option>
                    ))}
                  </select>
                  {availablePresets.length === 0 && activeItems.length > 0 && (
                    <p className="text-xs text-on-surface-variant mt-1">All food items already added to this meal.</p>
                  )}
                </div>
                <div className="w-24">
                  <input type="number" step="0.5" min="0" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder="Qty"
                    className="w-full rounded-lg border border-outline px-3 py-2 text-sm" />
                </div>
                <Button size="sm" onClick={addItem} disabled={saving || !selectedPreset || quantity <= 0}>
                  Add
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <Button variant="secondary" onClick={() => setEditing(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

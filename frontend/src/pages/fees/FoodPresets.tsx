import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { settingsApi } from "../../api/settings";
import { useAuth } from "../../lib/auth";
import { Button, PageHeader, Card, Money, Spinner } from "../../components/ui/Basics";
import { Modal } from "../../components/ui/Modal";
import { DataTable } from "../../components/ui/DataTable";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import type { SchoolSettings } from "../../types";
import clsx from "clsx";

interface FoodPreset {
  id: string;
  itemName: string;
  unitPrice: string;
  unit: string;
  stockQuantity: string;
  reorderLevel: string;
  isActive: boolean;
}

const UNIT_OPTIONS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Litre (L)" },
  { value: "pcs", label: "Piece (pcs)" },
  { value: "bag", label: "Bag" },
];

export default function FoodPresets() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const toast = useToast();

  const [rows, setRows] = useState<FoodPreset[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FoodPreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [collectiveCost, setCollectiveCost] = useState("9000");
  const [savingCost, setSavingCost] = useState(false);
  const [itemName, setItemName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [stockQuantity, setStockQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<FoodPreset[]>("/food-presets"),
      settingsApi.get().catch(() => null),
    ])
      .then(([rows, s]) => {
        setRows(rows || []);
        setSettings(s);
        if (s?.collectiveFoodCost) setCollectiveCost(s.collectiveFoodCost);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    setItemName(""); setUnitPrice(""); setUnit("kg"); setStockQuantity("0"); setReorderLevel("0");
    setIsCreating(true); setEditing(null);
  }

  function openEdit(row: FoodPreset) {
    setItemName(row.itemName); setUnitPrice(row.unitPrice); setUnit(row.unit);
    setStockQuantity(row.stockQuantity); setReorderLevel(row.reorderLevel);
    setEditing(row); setIsCreating(false);
  }

  async function save() {
    if (!itemName || !unitPrice) { toast.add("error", "Item name and price are required"); return; }
    setSaving(true);
    try {
      const payload = { itemName, unitPrice, unit, stockQuantity, reorderLevel, isActive: true };
      if (isCreating) {
        await api.post("/food-presets", payload);
        toast.add("success", "Food preset created");
      } else if (editing) {
        await api.put(`/food-presets/${editing.id}`, payload);
        toast.add("success", "Food preset updated");
      }
      setEditing(null); setIsCreating(false); load();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function saveCollectiveCost() {
    setSavingCost(true);
    try {
      await settingsApi.update({ collectiveFoodCost: collectiveCost });
      toast.add("success", "Collective food cost updated");
      load();
    } catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
    finally { setSavingCost(false); }
  }

  async function remove(id: string) {
    try { await api.delete(`/food-presets/${id}`); toast.add("success", "Preset removed"); load(); }
    catch (e) { toast.add("error", e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageNavigation
        title="Food Presets"
        description={isAdmin ? "Collective food cost (KSH 9000 default) applies to all food items. Manage individual food items below." : "View food items and stock levels."}
        quickSwitchers={[{ label: "Meal Timetable", to: "/fees/meal-timetable" }, { label: "Food Dashboard", to: "/fees/food-dashboard" }, { label: "Parent Contributions", to: "/fees/food-logs" }]}

        activeQuickSwitcher="/fees/food-presets"
        actions={isAdmin && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-200 rounded-xl px-5 py-2.5">
            + New Food Preset
          </Button>
        )}
      />

      {/* Collective Food Cost Setting */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">Collective Food Programme Cost</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              This is the total cost (KSH) for all food items combined — applied collectively, not per-unit.
            </p>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">KES</span>
              <input
                type="number"
                value={collectiveCost}
                onChange={(e) => setCollectiveCost(e.target.value)}
                className="w-28 rounded-lg border border-outline px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <Button size="sm" onClick={saveCollectiveCost} disabled={savingCost}>
                {savingCost ? "Saving..." : "Update"}
              </Button>
            </div>
          ) : (
            <Money value={collectiveCost} className="text-2xl font-bold text-primary" />
          )}
        </div>
        {isAdmin && (
          <div className="mt-3 p-3 bg-primary-container/30 rounded-lg">
            <p className="text-xs text-on-surface-variant">
              Current: <Money value={collectiveCost} /> | All food items in the meal timetable share this collective cost.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <DataTable
          columns={[
            { header: "Item", cell: (r) => <span className="font-semibold">{r.itemName}</span> },
            { header: "In Stock", cell: (r) => {
              const stock = Number(r.stockQuantity || 0);
              const reorder = Number(r.reorderLevel || 0);
              const low = stock > 0 && stock <= reorder;
              const out = stock <= 0;
              return (
                <span className={clsx("font-mono text-sm font-semibold", out ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600")}>
                  {stock} {r.unit}
                </span>
              );
            }},
            { header: "Reorder", cell: (r) => <span className="text-on-surface-variant text-xs font-mono">{r.reorderLevel || "0"} {r.unit}</span> },
            { header: "Status", cell: (r) => r.isActive ? <span className="text-emerald-600 text-xs font-medium">Active</span> : <span className="text-on-surface-variant text-xs">Inactive</span> },
          ]}
          rows={rows}
          loading={loading}
          actions={isAdmin ? (row) => (
            <div className="flex gap-1">
              <button onClick={() => openEdit(row)} className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-container rounded-lg">Edit</button>
              <button onClick={() => remove(row.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
            </div>
          ) : undefined}
        />
      </Card>

      {(editing || isCreating) && (
        <Modal title={isCreating ? "New Food Preset" : "Edit Food Preset"} onClose={() => { setEditing(null); setIsCreating(false); }}>
          <div className="space-y-5">
            <FormField spec={{ name: "itemName", label: "Food Item", required: true, placeholder: "e.g. Rice, Maize Flour" }} value={itemName} onChange={(v) => setItemName(v as string)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField spec={{ name: "unitPrice", label: "Price (KES)", type: "number", step: "0.01", required: true }} value={unitPrice} onChange={(v) => setUnitPrice(v as string)} />
              <FormField spec={{ name: "unit", label: "Unit", type: "select", required: true, options: UNIT_OPTIONS }} value={unit} onChange={(v) => setUnit(v as string)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField spec={{ name: "stockQuantity", label: "Current Stock", type: "number", step: "0.01", helpText: "How many units are in stock now" }} value={stockQuantity} onChange={(v) => setStockQuantity(v as string)} />
              <FormField spec={{ name: "reorderLevel", label: "Reorder At", type: "number", step: "0.01", helpText: "Alert when stock drops to this level" }} value={reorderLevel} onChange={(v) => setReorderLevel(v as string)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <Button variant="ghost" onClick={() => { setEditing(null); setIsCreating(false); }}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

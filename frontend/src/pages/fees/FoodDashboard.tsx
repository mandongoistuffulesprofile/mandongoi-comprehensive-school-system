import { useEffect, useState, useMemo } from "react";
import { api } from "../../lib/api";
import { settingsApi } from "../../api/settings";
import { PageHeader, Spinner, Money } from "../../components/ui/Basics";
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

interface MealTemplate {
  id: string;
  dayOfWeek: string;
  mealType: string;
  presetId: string;
  fixedQuantity: string;
  isActive: boolean;
  term: number;
  academicYear: number;
}

function getCurrentKenyanTerm(): { term: number; academicYear: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 1 && month <= 4) return { term: 1, academicYear: year };
  if (month >= 5 && month <= 8) return { term: 2, academicYear: year };
  return { term: 3, academicYear: year };
}

export default function FoodDashboard() {
  const [presets, setPresets] = useState<FoodPreset[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const defaultTerm = getCurrentKenyanTerm();
  const [selectedTerm] = useState(defaultTerm.term);
  const [selectedYear] = useState(defaultTerm.academicYear);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<FoodPreset[]>("/food-presets"),
      api.get<MealTemplate[]>("/meal-templates", { term: selectedTerm, academicYear: selectedYear }),
      settingsApi.get().catch(() => null),
    ])
      .then(([prst, tmplts, s]) => {
        setPresets(prst || []);
        setTemplates(tmplts || []);
        setSettings(s);
      })
      .finally(() => setLoading(false));
  }, [selectedTerm, selectedYear]);

  const dashboard = useMemo(() => {
    const activeTemplates = templates.filter((t) => t.isActive);

    const dailyByPreset: Record<string, number> = {};
    for (const t of activeTemplates) {
      dailyByPreset[t.presetId] = (dailyByPreset[t.presetId] || 0) + Number(t.fixedQuantity);
    }

    return presets
      .filter((p) => p.isActive)
      .map((p) => {
        const stock = Number(p.stockQuantity);
        const dailyUsage = dailyByPreset[p.id] || 0;
        const weeklyUsage = dailyUsage * 7;
        const daysLeft = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 999;
        const isLow = stock <= Number(p.reorderLevel) && dailyUsage > 0;
        const unitPrice = Number(p.unitPrice || 0);

        return {
          preset: p,
          stock,
          dailyUsage,
          weeklyUsage,
          daysLeft,
          isLow,
          unitPrice,
          weeklyCost: weeklyUsage * unitPrice,
        };
      });
  }, [presets, templates]);

  const collectiveCost = Number(settings?.collectiveFoodCost || 9000);
  const activeTemplates = templates.filter((t) => t.isActive);
  const usedInTimetable = new Set(activeTemplates.map((t) => t.presetId));
  const lowStock = dashboard.filter((d) => d.isLow);
  const unusedInTimetable = dashboard.filter((d) => !usedInTimetable.has(d.preset.id) && d.dailyUsage === 0);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Food Dashboard"
        description="Stock levels, daily usage, and reorder alerts based on the meal timetable."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary-container to-primary-container rounded-2xl p-4 border border-primary/20">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">Collective Food Cost</p>
          <p className="text-2xl font-bold text-primary mt-1">
            <Money value={collectiveCost} />
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active Items</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{dashboard.length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Active Meal Slots</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{activeTemplates.length}</p>
        </div>
        <div className={clsx(
          "rounded-2xl p-4 border",
          lowStock.length > 0 ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200" : "bg-gradient-to-br from-surface-container to-surface-container border-outline-variant"
        )}>
          <p className={clsx("text-xs font-medium uppercase tracking-wider", lowStock.length > 0 ? "text-red-600" : "text-on-surface-variant")}>
            Low Stock Alerts
          </p>
          <p className={clsx("text-2xl font-bold mt-1", lowStock.length > 0 ? "text-red-900" : "text-on-surface-variant")}>
            {lowStock.length}
          </p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 mb-2">Reorder Required</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((d) => (
              <span key={d.preset.id} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {d.preset.itemName}: {d.stock}{d.preset.unit} left ({d.daysLeft}d)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-left text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Food Item</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Daily Use</th>
                <th className="px-4 py-3 font-medium text-right">Weekly Use</th>
                <th className="px-4 py-3 font-medium text-right">Days Left</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {dashboard.map((d) => (
                <tr key={d.preset.id} className={clsx("hover:bg-surface-container-low transition-colors", !usedInTimetable.has(d.preset.id) && d.dailyUsage === 0 && "opacity-60")}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{d.preset.itemName}</p>
                    <p className="text-xs text-on-surface-variant">{d.preset.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx("font-mono text-sm font-semibold", d.stock <= 0 ? "text-red-500" : d.isLow ? "text-amber-500" : "text-emerald-600")}>
                      {d.stock} {d.preset.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">
                    {d.dailyUsage > 0 ? `${d.dailyUsage} ${d.preset.unit}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">
                    {d.weeklyUsage > 0 ? `${d.weeklyUsage} ${d.preset.unit}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.dailyUsage > 0 ? (
                      <span className={clsx("font-semibold", d.daysLeft <= 2 ? "text-red-600" : d.daysLeft <= 7 ? "text-amber-600" : "text-on-surface-variant")}>
                        {d.daysLeft}d
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {d.isLow ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Reorder</span>
                    ) : d.dailyUsage > 0 ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                    ) : (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Not in timetable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      {unusedInTimetable.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">
            {unusedInTimetable.length} food item{unusedInTimetable.length > 1 ? 's' : ''} not in the current meal timetable.
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Add them to the <a href="/fees/meal-timetable" className="underline font-medium">Meal Timetable</a> to enable daily auto-consumption tracking.
          </p>
        </div>
      )}
    </div>
  );
}

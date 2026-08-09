import clsx from "clsx";
import Dropdown from "./Dropdown";

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  badge?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  const activeTab = tabs.find((t) => t.key === value);

  return (
    <>
      {/* Desktop: horizontal tab buttons */}
      <div className={clsx("border-b border-outline-variant", className)}>
        <div className="hidden md:flex gap-1">
          {tabs.map((tab) => {
            const isActive = tab.key === value;
            const hasBadge = tab.badge !== undefined && tab.badge > 0;
            return (
              <button
                key={tab.key}
                onClick={() => onValueChange(tab.key)}
                className={clsx(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant",
                )}
              >
                {tab.icon && <span className="material-symbols-outlined text-base">{tab.icon}</span>}
                {tab.label}
                {hasBadge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-on-surface-variant text-surface-container-lowest rounded-full">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: native select dropdown */}
        <div className="md:hidden">
          <Dropdown
            value={value}
            options={tabs.map((t) => ({
              value: t.key,
              label: t.badge ? `${t.label} (${t.badge})` : t.label,
            }))}
            onChange={onValueChange}
            placeholder={activeTab?.label ?? "Select tab"}
            size="sm"
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}

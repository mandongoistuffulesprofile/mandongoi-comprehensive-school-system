import clsx from "clsx";
import Dropdown from "./Dropdown";

export interface SwitcherItem {
  label: string;
  to: string;
  icon?: string;
  active?: boolean;
}

export interface QuickSwitchersProps {
  items: SwitcherItem[];
  activeKey?: string;
}

export function QuickSwitchers({ items, activeKey }: QuickSwitchersProps) {
  return (
    <>
      {/* Desktop: horizontal button group */}
      <div className="hidden md:flex items-center gap-1.5 mb-4 overflow-x-auto whitespace-nowrap pb-1">
        {items.map((item) => {
          const isActive = activeKey === item.to || item.active;
          return (
            <a
              key={item.to}
              href={item.to}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
              )}
            >
              {item.icon && <span className="material-symbols-outlined text-sm">{item.icon}</span>}
              {item.label}
            </a>
          );
        })}
      </div>

      {/* Mobile: compact dropdown */}
      <div className="md:hidden mb-4">
        <Dropdown
          value={activeKey ?? ""}
          options={items.map((item) => ({ value: item.to, label: item.label }))}
          onChange={(value) => {
            const target = items.find((i) => i.to === value);
            if (target) (window.location.href as any) = target.to;
          }}
          placeholder="Quick Switch"
          size="sm"
          className="w-full"
        />
      </div>
    </>
  );
}

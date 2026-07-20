import { useEffect, useState, useRef } from "react";
import clsx from "clsx";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accent?: boolean;
  size?: "md" | "sm";
  className?: string;
  menuClassName?: string;
}

const sizeMap = {
  md: { button: "px-4 py-2.5 text-sm", menu: "text-sm py-1.5", item: "px-4 py-2" },
  sm: { button: "px-3 py-2 text-xs", menu: "text-xs py-1", item: "px-3 py-1.5" },
};

export default function Dropdown({ value, options, onChange, placeholder, disabled, accent, size = "md", className, menuClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const s = sizeMap[size];

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center gap-2 rounded-2xl border-2 font-medium transition-all duration-150",
          "shadow-sm hover:shadow-lg active:scale-[0.97]",
          "focus:outline-none focus:ring-[3px]",
          s.button,
          accent
            ? value
              ? "bg-white border-brand-300 text-brand-800 hover:border-brand-400 hover:bg-brand-50/40 focus:ring-brand-500/25"
              : "bg-white border-dashed border-brand-300/50 text-brand-500 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-600 focus:ring-brand-500/25"
            : value
              ? "bg-white border-surface-300 text-surface-800 hover:border-surface-400 focus:ring-brand-500/20"
              : "bg-white border-dashed border-surface-300 text-surface-400 hover:border-surface-400 hover:text-surface-500 focus:ring-brand-500/20",
          disabled && "opacity-40 cursor-not-allowed active:scale-100 hover:shadow-sm hover:border-dashed",
        )}
      >
        <span className={clsx(value ? "" : accent ? "text-brand-400" : "text-surface-400")}>
          {value ? selected?.label || placeholder : placeholder}
        </span>
        <svg
          className={clsx(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180",
            accent ? (value ? "text-brand-500" : "text-brand-400") : "text-surface-400",
          )}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={clsx(
          "absolute z-50 mt-2 bg-white rounded-2xl border border-surface-200",
          "shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-150",
          s.menu,
          menuClassName || "min-w-[180px]",
        )}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={clsx(
                "w-full text-left transition-colors duration-100",
                s.item,
                opt.value === value
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-800",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

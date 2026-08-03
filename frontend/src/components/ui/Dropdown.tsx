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
              ? "bg-surface-container-lowest border-primary text-on-surface hover:border-primary/80 focus:ring-primary/25"
              : "bg-surface-container-lowest border-dashed border-primary/50 text-primary hover:border-primary hover:bg-primary/5 hover:text-on-surface focus:ring-primary/25"
            : value
              ? "bg-surface-container-lowest border-outline text-on-surface hover:border-outline-variant focus:ring-primary/20"
              : "bg-surface-container-lowest border-dashed border-outline text-on-surface-variant hover:border-outline-variant hover:text-on-surface focus:ring-primary/20",
          disabled && "opacity-40 cursor-not-allowed active:scale-100 hover:shadow-sm hover:border-dashed",
        )}
      >
        <span className={clsx(value ? "" : accent ? "text-primary/60" : "text-on-surface-variant")}>
          {value ? selected?.label || placeholder : placeholder}
        </span>
        <span className={clsx(
          "material-symbols-outlined text-base transition-transform duration-200",
          open && "rotate-180",
          accent ? (value ? "text-primary" : "text-primary/60") : "text-on-surface-variant",
        )}>
          expand_more
        </span>
      </button>

      {open && (
        <div className={clsx(
          "absolute z-50 mt-2 bg-surface-container-lowest rounded-2xl border border-outline-variant",
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
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
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

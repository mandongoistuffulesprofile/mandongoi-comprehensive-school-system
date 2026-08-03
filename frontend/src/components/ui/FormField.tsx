import { useState, useMemo } from "react";
import Dropdown from "./Dropdown";
import clsx from "clsx";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => String(currentYear - i));

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "checkbox" | "textarea" | "email" | "tel";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  helpText?: string;
};

export function FormField({
  spec,
  value,
  onChange,
  error,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const baseClass =
    "w-full rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder-on-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-surface-container";
  const errorClass = "border-error focus:ring-error/20 focus:border-error";

  if (spec.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 group cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 rounded border-outline text-primary focus:ring-primary/20 focus:ring-2"
        />
        <div>
          <span className="text-sm font-medium text-on-surface">{spec.label}</span>
          {spec.helpText && <p className="text-xs text-on-surface-variant mt-0.5">{spec.helpText}</p>}
        </div>
      </label>
    );
  }

  const inputId = spec.name;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-on-surface mb-1.5 cursor-pointer">
        {spec.label}
        {spec.required && <span className="text-error ml-0.5">*</span>}
      </label>
      {spec.type === "select" ? (
        <Dropdown
          value={(value as string) ?? ""}
          options={spec.options ?? []}
          onChange={onChange}
          placeholder="Select..."
          size="sm"
        />
      ) : spec.type === "textarea" ? (
        <textarea
          id={inputId}
          className={clsx(baseClass, error && errorClass)}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={spec.required}
          rows={4}
          placeholder={spec.placeholder}
        />
      ) : spec.type === "date" ? (
        <DateSelect
          id={inputId}
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
          required={spec.required}
          min={spec.min}
          max={spec.max}
          error={!!error}
        />
      ) : (
        <input
          id={inputId}
          className={clsx(baseClass, error && errorClass)}
          type={spec.type ?? "text"}
          step={spec.step}
          min={spec.min}
          max={spec.max}
          placeholder={spec.placeholder}
          value={(value as string | number) ?? ""}
          onChange={(e) => onChange(spec.type === "number" ? e.target.valueAsNumber : e.target.value)}
          required={spec.required}
        />
      )}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {spec.helpText && !error && <p className="text-xs text-on-surface-variant mt-1">{spec.helpText}</p>}
    </div>
  );
}

function DateSelect({ id, value, onChange, required, min, max, error }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  error: boolean;
}) {
  const parts = value ? value.split("-") : [];
  const [year, setYear] = useState(parts[0] || "");
  const [month, setMonth] = useState(parts[1] || "");
  const [day, setDay] = useState(parts[2] || "");

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);

  const DAYS = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), [daysInMonth]);

  const filteredYears = useMemo(() => {
    let y = YEARS;
    if (max) y = y.filter((yr) => yr <= max.slice(0, 4));
    if (min) y = y.filter((yr) => yr >= min.slice(0, 4));
    return y;
  }, [max, min]);

  const emit = (y: string, m: string, d: string) => {
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const labelClass = "text-xs text-on-surface-variant font-medium";

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className={labelClass}>Day</label>
        <Dropdown
          value={day}
          options={DAYS.map((d) => ({ value: d, label: d }))}
          onChange={(v) => { setDay(v); emit(year, month, v); }}
          placeholder="D"
          size="sm"
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <label className={labelClass}>Month</label>
        <Dropdown
          value={month}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          onChange={(v) => { setMonth(v); emit(year, v, day); }}
          placeholder="M"
          size="sm"
          className="w-full"
        />
      </div>
      <div className="flex-[2]">
        <label className={labelClass}>Year</label>
        <Dropdown
          value={year}
          options={filteredYears.map((y) => ({ value: y, label: y }))}
          onChange={(v) => { setYear(v); emit(v, month, day); }}
          placeholder="YYYY"
          size="sm"
          className="w-full"
        />
      </div>
    </div>
  );
}

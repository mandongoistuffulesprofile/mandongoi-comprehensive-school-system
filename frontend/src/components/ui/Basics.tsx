import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantStyles: Record<string, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary/90 shadow-sm shadow-primary/20",
  secondary: "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container shadow-sm",
  danger: "bg-error text-on-error hover:bg-error/90 shadow-sm shadow-error/20",
  ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
};

export function Button({
  variant = "primary",
  className,
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs rounded-md",
    md: "px-3.5 py-2 text-sm rounded-lg",
    lg: "px-5 py-2.5 text-base rounded-lg",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variantStyles[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "w-5 h-5 rounded-full border-2 border-surface-container-high border-t-primary animate-spin",
        className,
      )}
    />
  );
}

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
      <Spinner className="w-8 h-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  label,
  description,
  action,
}: {
  label: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-surface-500 text-2xl">folder_open</span>
      </div>
      <p className="text-on-surface font-medium">{label}</p>
      {description && <p className="text-on-surface-variant text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-error text-2xl">error_outline</span>
      </div>
      <p className="text-on-surface font-medium">Something went wrong</p>
      <p className="text-on-surface-variant text-sm mt-1">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

export function Money({ value, className }: { value: string | number | undefined | null; className?: string }) {
  const n = Number(value ?? 0);
  return (
    <span className={clsx("tabular font-medium", className)}>
      KES {n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

const badgeColors: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  sending: "bg-amber-50 text-amber-700 border-amber-200",
  halfDay: "bg-amber-50 text-amber-700 border-amber-200",
  leave: "bg-amber-50 text-amber-700 border-amber-200",
  late: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  absent: "bg-red-50 text-red-700 border-red-200",
  withdrawn: "bg-red-50 text-red-700 border-red-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  partiallyFailed: "bg-red-50 text-red-700 border-red-200",
  excused: "bg-blue-50 text-blue-700 border-blue-200",
  male: "bg-blue-50 text-blue-700 border-blue-200",
  female: "bg-pink-50 text-pink-700 border-pink-200",
  teacher: "bg-purple-50 text-purple-700 border-purple-200",
  support: "bg-surface-100 text-surface-700 border-surface-200",
  schoolAdmin: "bg-brand-50 text-brand-700 border-brand-200",
  accountant: "bg-cyan-50 text-cyan-700 border-cyan-200",
  parent: "bg-teal-50 text-teal-700 border-teal-200",
  flatRate: "bg-indigo-50 text-indigo-700 border-indigo-200",
  sessionBased: "bg-orange-50 text-orange-700 border-orange-200",
};

export function EnumBadge({ value }: { value: string | undefined | null }) {
  if (!value) return null;
  const cls = badgeColors[value] ?? "bg-surface-100 text-surface-600 border-surface-200";
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium capitalize",
        cls,
      )}
    >
      {value.replace(/([A-Z])/g, " $1").toLowerCase()}
    </span>
  );
}

export function CompetencyDots({ level, max = 4 }: { level?: number; max?: number }) {
  return (
    <div className="flex gap-1" title={level ? `Level ${level}/${max}` : undefined}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            "w-2.5 h-2.5 rounded-full border transition-colors",
            level && i < level ? "bg-primary border-primary" : "border-outline-variant bg-surface-container-lowest",
          )}
        />
      ))}
    </div>
  );
}

export function StatusIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-600" : "text-on-surface-variant",
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-outline-variant",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm", className)}>
      <div className="h-0.5 bg-gradient-to-r from-primary/30 via-secondary-container/20 to-transparent rounded-t-xl" />
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-primary/80 mt-1 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
          {description && <p className="text-sm text-on-surface-variant mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

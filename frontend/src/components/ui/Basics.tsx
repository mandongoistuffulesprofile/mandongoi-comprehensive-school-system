import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantStyles: Record<string, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200",
  secondary: "bg-white text-surface-700 border border-surface-300 hover:bg-surface-50 hover:border-surface-400 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200",
  ghost: "text-surface-600 hover:bg-surface-100 hover:text-surface-900",
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
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
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
        "w-5 h-5 rounded-full border-2 border-surface-200 border-t-brand-600 animate-spin",
        className,
      )}
    />
  );
}

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-surface-400">
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
      <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-surface-500 font-medium">{label}</p>
      {description && <p className="text-surface-400 text-sm mt-1">{description}</p>}
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
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-red-600 font-medium">Something went wrong</p>
      <p className="text-surface-500 text-sm mt-1">{message}</p>
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
            level && i < level ? "bg-brand-500 border-brand-500" : "border-surface-300 bg-surface-50",
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
        active ? "text-emerald-600" : "text-surface-400",
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-surface-300",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white rounded-xl border border-surface-200 shadow-sm", className)}>
      <div className="h-0.5 bg-gradient-to-r from-brand-500/30 via-accent-500/20 to-transparent rounded-t-xl" />
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
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 mt-1 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{title}</h1>
          {description && <p className="text-sm text-surface-500 mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

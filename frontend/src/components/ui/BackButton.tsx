import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import clsx from "clsx";

const CHEVRON_LEFT_SVG = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const POWER_ICON = (
  <span className="material-symbols-outlined text-base">power_settings_new</span>
);

const ROOT_PATHS = ["/", "/dashboard"];

export interface BackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
  variant?: "back" | "logout";
}

export function BackButton({ to, label = "Back", onClick, className, variant }: BackButtonProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const isRootPath = ROOT_PATHS.includes(pathname);
  const effectiveVariant = variant ?? (isRootPath && !to && !onClick ? "logout" : "back");

  if (effectiveVariant === "logout") {
    return (
      <button
        type="button"
        onClick={onClick ?? logout}
        className={clsx(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          "text-error hover:text-error",
          "bg-error-container hover:bg-error-container/80",
          "px-3 py-1.5 rounded-lg transition-colors",
          className,
        )}
      >
        {POWER_ICON}
        <span>{label || "Log Out"}</span>
      </button>
    );
  }

  if (to) {
    return (
      <Link
        to={to}
        className={clsx(
          "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-on-primary-container",
          "bg-primary-container hover:bg-primary-container/80",
          "px-3 py-1.5 rounded-lg transition-colors",
          className,
        )}
      >
        {CHEVRON_LEFT_SVG}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => navigate(-1))}
      className={clsx(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        "text-primary hover:text-on-primary-container",
        "bg-primary-container hover:bg-primary-container/80",
        "px-3 py-1.5 rounded-lg transition-colors",
        className,
      )}
    >
      {CHEVRON_LEFT_SVG}
      <span>{label}</span>
    </button>
  );
}

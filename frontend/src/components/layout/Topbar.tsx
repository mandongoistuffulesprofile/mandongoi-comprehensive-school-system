import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Basics";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  const { user, logout } = useAuth();

  const roleColors: Record<string, string> = {
    schoolAdmin: "bg-brand-100 text-brand-700",
    teacher: "bg-purple-100 text-purple-700",
    accountant: "bg-cyan-100 text-cyan-700",
    parent: "bg-teal-100 text-teal-700",
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600" />
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-surface-500">
            Signed in as{" "}
            <span className="font-medium text-surface-900">{user?.name}</span>
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              roleColors[user?.role ?? ""] ?? "bg-surface-100 text-surface-600"
            }`}
          >
            {user?.role?.replace(/([A-Z])/g, " $1").toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={logout}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}

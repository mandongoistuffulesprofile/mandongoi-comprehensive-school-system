import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Basics";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  const { user, logout } = useAuth();

  const roleColors: Record<string, string> = {
    schoolAdmin: "bg-primary-container text-on-primary-container",
    teacher: "bg-secondary-container text-on-secondary-container",
    accountant: "bg-tertiary-container text-on-tertiary-container",
    parent: "bg-surface-container text-on-surface",
  };

  return (
    <header className="sticky top-0 z-10 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
      <div className="h-1 bg-primary" />
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-on-surface-variant">
            Signed in as{" "}
            <span className="font-medium text-on-surface">{user?.name}</span>
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              roleColors[user?.role ?? ""] ?? "bg-surface-container text-on-surface-variant"
            }`}
          >
            {user?.role?.replace(/([A-Z])/g, " $1").toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={logout}>
            <span className="material-symbols-outlined text-base">logout</span>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}

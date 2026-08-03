import { useEffect, useState, useRef } from "react";
import { notificationsApi } from "../../api/notifications";
import type { Notification } from "../../types";
import { useAuth } from "../../lib/auth";

const typeIcons: Record<string, string> = {
  payroll: "payments",
  warning: "warning",
  success: "check_circle",
  error: "error",
  info: "info",
};

const typeColors: Record<string, string> = {
  payroll: "bg-amber-50 border-l-4 border-l-amber-400",
  warning: "bg-yellow-50 border-l-4 border-l-yellow-400",
  success: "bg-emerald-50 border-l-4 border-l-emerald-400",
  error: "bg-red-50 border-l-4 border-l-red-400",
  info: "bg-blue-50 border-l-4 border-l-blue-400",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || (user.role !== "schoolAdmin" && user.role !== "accountant" && user.role !== "teacher")) return;
    load();
    const interval = setInterval(load, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user]);

  function load() {
    notificationsApi.list(true).then((r: any) => {
      setNotifications(r.data);
      setUnreadCount(r.unreadCount);
    }).catch(() => {});
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    load();
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    load();
  }

  if (!user || (user.role !== "schoolAdmin" && user.role !== "accountant" && user.role !== "teacher")) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-error text-on-error text-[10px] font-bold rounded-full min-w-[18px] min-h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant z-[200] max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <span className="font-semibold text-sm text-on-surface">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-surface-container ${typeColors[n.type] ?? "bg-surface-container"}`}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base mt-0.5 text-on-surface-variant">{typeIcons[n.type] ?? "info"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{n.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-KE", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {n.type === "payroll" && (
                      <a href={n.link || "/payroll"} className="text-xs text-primary whitespace-nowrap hover:underline mt-0.5" onClick={(e) => e.stopPropagation()}>
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { NavLink } from "react-router-dom";
import type { Role } from "../../types";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { settingsApi } from "../../api/settings";

// Material Symbols icon names (M3-compliant)
const ICONS: Record<string, string> = {
  dashboard: "dashboard",
  students: "school",
  subjects: "menu_book",
  reportCards: "assignment",
  attendance: "how_to_reg",
  timetable: "calendar_month",
  fees: "payments",
  payment: "credit_card",
  report: "bar_chart",
  staff: "groups",
  staffAttendance: "schedule",
  payroll: "account_balance_wallet",
  smsTemplates: "description",
  sendSms: "send",
  autoSms: "auto_fix_high",
  smsLogs: "article",
  leaveNotes: "note_add",
  settings: "settings",
  parents: "family_restroom",
  users: "person_add",
};

function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={clsx("material-symbols-outlined", className)}>{ICONS[name] || "circle"}</span>
  );
}

const GROUP_COLORS: Record<string, string> = {
  "Overview": "text-primary",
  "Students & Academics": "text-secondary",
  "Fees & Billing": "text-emerald-600",
  "Food Programme": "text-rose-600",
  "Accounting": "text-cyan-600",
  "Staff & Payroll": "text-purple-600",
  "SMS & Communication": "text-sky-600",
  "Administration": "text-on-surface-variant",
};

const GROUPS: { label: string; roles: Role[]; items: { to: string; label: string; roles: Role[]; icon: string }[] }[] = [
  {
    label: "Overview", roles: ["schoolAdmin", "teacher", "accountant"],
    items: [{ to: "/", label: "Dashboard", roles: ["schoolAdmin", "teacher", "accountant"], icon: "dashboard" }],
  },
  {
    label: "Students & Academics", roles: ["schoolAdmin", "teacher", "accountant"],
    items: [
      { to: "/students", label: "Students", roles: ["schoolAdmin", "teacher", "accountant"], icon: "students" },
      { to: "/academic/learning-areas", label: "Subjects", roles: ["schoolAdmin", "teacher", "accountant"], icon: "subjects" },
      { to: "/academic/marks-entry", label: "Marks Entry", roles: ["schoolAdmin", "teacher"], icon: "attendance" },
      { to: "/academic/results", label: "Class Results", roles: ["schoolAdmin", "teacher", "accountant"], icon: "report" },
      { to: "/academic/report-cards", label: "Report Cards", roles: ["schoolAdmin", "teacher"], icon: "reportCards" },
      { to: "/attendance", label: "Attendance", roles: ["schoolAdmin", "teacher"], icon: "attendance" },
      { to: "/attendance/leave-notes", label: "Leave Notes", roles: ["schoolAdmin", "teacher"], icon: "leaveNotes" },
    ],
  },
  {
    label: "Fees & Billing", roles: ["schoolAdmin", "accountant"],
    items: [
      { to: "/fees/structures", label: "Set Term Fees", roles: ["schoolAdmin", "accountant"], icon: "fees" },
      { to: "/fees/invoices", label: "Fee Payments", roles: ["schoolAdmin", "accountant"], icon: "payment" },
      { to: "/fees/reconciliation", label: "Reconciliation", roles: ["schoolAdmin", "accountant"], icon: "report" },
      { to: "/fees/payments", label: "Payments Log", roles: ["schoolAdmin", "accountant"], icon: "payment" },
    ],
  },
  {
    label: "Food Programme", roles: ["schoolAdmin", "teacher"],
    items: [
      { to: "/fees/meal-timetable", label: "Meal Timetable", roles: ["schoolAdmin", "teacher"], icon: "timetable" },
      { to: "/fees/food-dashboard", label: "Food Dashboard", roles: ["schoolAdmin", "teacher"], icon: "report" },
      { to: "/fees/food-presets", label: "Food Items & Stock", roles: ["schoolAdmin"], icon: "fees" },
      { to: "/fees/food-logs", label: "Food Logs", roles: ["schoolAdmin", "teacher"], icon: "leaveNotes" },
    ],
  },
  {
    label: "Accounting", roles: ["schoolAdmin", "accountant"],
    items: [
      { to: "/ledger/trial-balance", label: "Income & Expenses", roles: ["schoolAdmin", "accountant"], icon: "report" },
      { to: "/ledger/accounts", label: "Chart of Accounts", roles: ["schoolAdmin", "accountant"], icon: "report" },
      { to: "/ledger/journal", label: "Record Transaction", roles: ["schoolAdmin", "accountant"], icon: "payment" },
    ],
  },
  {
    label: "Staff & Payroll", roles: ["schoolAdmin", "accountant"],
    items: [
      { to: "/staff", label: "Staff Records", roles: ["schoolAdmin", "accountant"], icon: "staff" },
      { to: "/staff/attendance", label: "Staff Attendance", roles: ["schoolAdmin"], icon: "staffAttendance" },
      { to: "/staff/class-teachers", label: "Class Teachers", roles: ["schoolAdmin"], icon: "users" },
      { to: "/staff/session-assignments", label: "Session Assignments", roles: ["schoolAdmin"], icon: "timetable" },
      { to: "/payroll", label: "Salaries & Payroll", roles: ["schoolAdmin", "accountant"], icon: "payroll" },
    ],
  },
  {
    label: "SMS & Communication", roles: ["schoolAdmin", "accountant"],
    items: [
      { to: "/sms/templates", label: "Message Templates", roles: ["schoolAdmin", "accountant"], icon: "smsTemplates" },
      { to: "/sms/campaigns", label: "Send Messages", roles: ["schoolAdmin", "accountant"], icon: "sendSms" },
      { to: "/sms/automated-rules", label: "Auto Messages", roles: ["schoolAdmin"], icon: "autoSms" },
      { to: "/sms/logs", label: "Message History", roles: ["schoolAdmin", "accountant"], icon: "smsLogs" },
    ],
  },
  {
    label: "Administration", roles: ["schoolAdmin"],
    items: [
      { to: "/settings", label: "School Settings", roles: ["schoolAdmin"], icon: "settings" },
      { to: "/parents/links", label: "Parent Accounts", roles: ["schoolAdmin"], icon: "parents" },
      { to: "/admin/users", label: "User Accounts", roles: ["schoolAdmin"], icon: "users" },
      { to: "/settings/paybills", label: "Paybills", roles: ["schoolAdmin"], icon: "payment" },
      { to: "/admin/logs", label: "System Logs", roles: ["schoolAdmin"], icon: "smsLogs" },
    ],
  },
];

export function Sidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const [schoolName, setSchoolName] = useState("School");

  useEffect(() => {
    settingsApi.get().then((s) => setSchoolName(s.schoolName)).catch(() => {});
  }, []);

  return (
    <aside className={clsx(
      "shrink-0 bg-surface-container-lowest border-r border-outline-variant h-screen flex flex-col transition-all duration-300 z-40",
      collapsed ? "w-16" : "w-64",
    )}>
      <div className="px-4 py-4 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary text-sm font-bold shrink-0">S</div>
          {!collapsed && (
            <div className="truncate">
              <div className="font-semibold text-on-surface text-sm truncate">{schoolName}</div>
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Management</div>
            </div>
          )}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant shrink-0">
          <span className={clsx("material-symbols-outlined text-lg transition-transform duration-200", collapsed && "rotate-180")}>
            chevron_left
          </span>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {GROUPS.filter((g) => g.roles.includes(role)).map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className={clsx("px-2 py-1.5 text-[10px] uppercase tracking-widest font-semibold", GROUP_COLORS[group.label] || "text-on-surface-variant")}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.filter((item) => item.roles.includes(role)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => clsx(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    collapsed && "justify-center px-0",
                    isActive ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <MaterialIcon name={item.icon} className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

import { NavLink } from "react-router-dom";
import type { Role } from "../../types";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { settingsApi } from "../../api/settings";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: string;
}

interface NavGroup {
  label: string;
  roles: Role[];
  items: NavItem[];
}

const I = {
  dashboard: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  students: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342",
  subjects: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  reportCards: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z",
  attendance: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  timetable: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  fees: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  payment: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z",
  report: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  staff: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  staffAttendance: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  payroll: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
  smsTemplates: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
  sendSms: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75",
  autoSms: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
  smsLogs: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  leaveNotes: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  settings: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  parents: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  users: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.94-4.41L6.87 7.2a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787a.75.75 0 0 0 0 1.2l-4.064 2.787a2.25 2.25 0 0 0 0 3.6l4.064 2.787",
};

function SvgIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={(I as any)[name] || I.dashboard} />
    </svg>
  );
}

const GROUP_COLORS: Record<string, string> = {
  "Overview": "text-brand-600",
  "Students & Academics": "text-accent-600",
  "Fees & Billing": "text-emerald-600",
  "Food Programme": "text-rose-600",
  "Accounting": "text-cyan-600",
  "Staff & Payroll": "text-purple-600",
  "SMS & Communication": "text-sky-600",
  "Administration": "text-surface-500",
};

const GROUPS: NavGroup[] = [
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
      "shrink-0 bg-white border-r border-surface-200 h-screen flex flex-col transition-all duration-300 z-40",
      collapsed ? "w-16" : "w-64",
    )}>
      <div className="px-4 py-4 border-b border-surface-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">S</div>
          {!collapsed && (
            <div className="truncate">
              <div className="font-semibold text-surface-900 text-sm truncate">{schoolName}</div>
              <div className="text-[10px] uppercase tracking-widest text-surface-400 font-medium">Management</div>
            </div>
          )}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-surface-100 text-surface-400 shrink-0">
          <svg className={clsx("w-4 h-4 transition-transform", collapsed && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {GROUPS.filter((g) => g.roles.includes(role)).map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className={clsx("px-2 py-1.5 text-[10px] uppercase tracking-widest font-semibold", GROUP_COLORS[group.label] || "text-surface-400")}>
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
                    isActive ? "bg-brand-50 text-brand-700" : "text-surface-600 hover:bg-surface-50 hover:text-surface-900",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <SvgIcon name={item.icon} className="w-5 h-5 shrink-0" />
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

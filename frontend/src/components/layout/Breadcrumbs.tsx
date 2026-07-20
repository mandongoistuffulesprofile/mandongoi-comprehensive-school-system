import { Link, useLocation } from "react-router-dom";

const LABEL_MAP: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  students: "Students",
  academic: "Academics",
  "learning-areas": "Subjects",
  "marks-entry": "Marks Entry",
  "report-cards": "Report Cards",
  fees: "Fees",
  structures: "Set Term Fees",
  invoices: "Fee Payments",
  reconciliation: "Reconciliation",
  payments: "Payments Log",
  staff: "Staff",
  attendance: "Attendance",
  "leave-notes": "Leave Notes",
  payroll: "Salaries & Payroll",
  "session-assignments": "Session Assignments",
  sms: "SMS",
  templates: "Message Templates",
  campaigns: "Send Messages",
  logs: "Message History",
  "automated-rules": "Auto Messages",
  ledger: "Finance",
  accounts: "Accounts",
  journal: "Record Transaction",
  "trial-balance": "Income & Expenses",
  settings: "School Settings",
  parents: "Parents",
  links: "Parent Accounts",
  admin: "Admin",
  users: "User Accounts",
  "staff-attendance": "Staff Attendance",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = LABEL_MAP[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, path, isLast: i === segments.length - 1 };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs text-surface-400 mb-4 overflow-x-auto whitespace-nowrap">
      <Link to="/" className="hover:text-brand-600 transition-colors font-medium">
        <svg className="w-3.5 h-3.5 inline-block -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <span className="text-surface-300">/</span>
          {crumb.isLast ? (
            <span className="text-surface-600 font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-brand-600 transition-colors">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

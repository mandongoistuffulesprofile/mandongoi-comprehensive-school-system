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
    <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-4 overflow-x-auto whitespace-nowrap">
      <Link to="/" className="hover:text-primary transition-colors font-medium">
        <span className="material-symbols-outlined text-sm">home</span>
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <span className="text-outline-variant">/</span>
          {crumb.isLast ? (
            <span className="text-on-surface font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-primary transition-colors">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

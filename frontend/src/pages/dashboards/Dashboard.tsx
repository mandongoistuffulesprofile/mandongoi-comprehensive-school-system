import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { invoicesApi } from "../../api/fees";
import { studentsApi } from "../../api/students";
import { staffApi } from "../../api/staff";
import { settingsApi } from "../../api/settings";
import { smsCampaignsApi } from "../../api/sms";
import type { FeeInvoice, Student, Staff, SchoolSettings, SmsCampaign } from "../../types";
import { Money, Spinner, Card } from "../../components/ui/Basics";
import { Link } from "react-router-dom";
import clsx from "clsx";

function StatCard({ label, value, hint, icon, color, trend }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon: React.ReactNode; color: string; trend?: { up: boolean; text: string };
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-on-surface-variant truncate">{label}</p>
          <p className={clsx("text-xl font-bold mt-0.5", color)}>{value}</p>
          {hint && <p className="text-[10px] text-on-surface-variant mt-0.5">{hint}</p>}
          {trend && (
            <p className={clsx("text-[10px] mt-0.5 flex items-center gap-1", trend.up ? "text-emerald-600" : "text-red-500")}>
              <span>{trend.up ? "↑" : "↓"}</span> {trend.text}
            </p>
          )}
        </div>
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2", color.replace("text-", "bg-").replace("-600", "-100").replace("-700", "-100"))}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function QuickLinks() {
  const links = [
    { to: "/sms/campaigns", label: "SMS Campaigns", desc: "Bulk & automated", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", iconBg: "bg-sky-100", hover: "hover:bg-sky-100 hover:border-sky-300 hover:shadow-sm" },
    { to: "/students", label: "Students", desc: "View & manage", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0Z", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", iconBg: "bg-purple-100", hover: "hover:bg-purple-100 hover:border-purple-300 hover:shadow-sm" },
    { to: "/fees/invoices", label: "Fee Payments", desc: "Track collections", icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0Z", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconBg: "bg-emerald-100", hover: "hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm" },
    { to: "/payroll", label: "Salaries", desc: "Manage payroll", icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconBg: "bg-amber-100", hover: "hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm" },
    { to: "/attendance", label: "Attendance", desc: "Mark & view", icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0Z", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", iconBg: "bg-cyan-100", hover: "hover:bg-cyan-100 hover:border-cyan-300 hover:shadow-sm" },
    { to: "/staff/session-assignments", label: "Session Assignments", desc: "Morning, Evening, Weekend", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", iconBg: "bg-indigo-100", hover: "hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-sm" },
    { to: "/staff", label: "Staff", desc: "Staff records", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0Z", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", iconBg: "bg-rose-100", hover: "hover:bg-rose-100 hover:border-rose-300 hover:shadow-sm" },
    { to: "/settings", label: "Settings", desc: "School config", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z M15 12a3 3 0 11-6 0 3 3 0 016 0Z", bg: "bg-surface-container", border: "border-outline-variant", text: "text-on-surface", iconBg: "bg-surface-200", hover: "hover:bg-surface-200 hover:border-outline hover:shadow-sm" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={clsx("flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-150", link.bg, link.border, link.hover)}>
          <div className={clsx("w-7 h-7 rounded-md flex items-center justify-center shrink-0", link.iconBg)}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={clsx("text-xs font-semibold leading-tight", link.text)}>{link.label}</p>
            <p className="text-[10px] text-on-surface-variant leading-tight">{link.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "schoolAdmin": return <AdminDashboard />;
    case "accountant": return <AccountantDashboard />;
    case "teacher": return <TeacherDashboard />;
    default: return null;
  }
}

function AdminDashboard() {
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      studentsApi.list().catch(() => []),
      staffApi.list().catch(() => []),
      invoicesApi.list({}).catch(() => [] as FeeInvoice[]),
      settingsApi.get().catch(() => null),
      smsCampaignsApi.list({}).catch(() => []),
    ])
      .then(([s, st, inv, set, camps]) => {
        setStudents(s);
        setStaff(st);
        setInvoices(inv);
        setSettings(set);
        setCampaigns(camps);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [location]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8" /></div>;
  }

  const activeStudents = students.filter((s) => s.status === "active");
  const activeStaff = staff.filter((s) => s.isActive);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue" || (i.status === "unpaid" && i.dueDate && new Date(i.dueDate) < new Date()));
  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid");
  const partialInvoices = invoices.filter((i) => i.status === "partial");
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
  const totalCollected = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
  const totalExpected = invoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length;

  const grades = [...new Set(students.map((s) => s.grade))].sort();

  return (
    <div className="animate-fade-in space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-on-surface">
            {settings?.schoolName || "School"} Dashboard
          </h1>
          <p className="text-xs text-on-surface-variant">
            {settings?.currentTerm} • {settings?.currentAcademicYear}
            {settings?.termStartDate && ` • ${new Date(settings.termStartDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`}
            {settings?.termEndDate && ` — ${new Date(settings.termEndDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-on-surface-variant font-medium mr-0.5">Students:</span>
          {grades.map((g) => {
            const count = activeStudents.filter((s) => s.grade === g).length;
            return (
              <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-container text-on-primary-container">
                {g.replace("Grade ", "G")}
                <span className="w-4 h-4 rounded-full bg-primary-fixed-dim flex items-center justify-center text-[9px] font-bold text-primary">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Students (Active)"
          value={activeStudents.length}
          color="text-primary"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard
          label="Fee Collection"
          value={`${collectionRate}%`}
          hint={<><Money value={totalCollected} /> / <Money value={totalExpected} /></>}
          color={collectionRate >= 80 ? "text-emerald-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Overdue Fees"
          value={overdueInvoices.length}
          hint={<Money value={overdueTotal} />}
          color="text-red-600"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
        />
        <StatCard
          label="Staff (Active)"
          value={activeStaff.length}
          hint="Teachers & support"
          color="text-purple-600"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-on-surface">Needs Attention</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            {overdueInvoices.length > 0 && (
              <span className="text-red-600">⚠ {overdueInvoices.length} overdue — <Money value={overdueTotal} /></span>
            )}
            {unpaidInvoices.length > 0 && (
              <span className="text-amber-600">📋 {unpaidInvoices.length} unpaid</span>
            )}
            {partialInvoices.length > 0 && (
              <span className="text-amber-600">🔄 {partialInvoices.length} partial</span>
            )}
            {overdueInvoices.length === 0 && unpaidInvoices.length === 0 && (
              <span className="text-emerald-600">✅ All fees up to date</span>
            )}
            <span className="text-on-surface-variant">{sentCampaigns} SMS sent</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span>Term: <strong className="text-on-surface-variant">{settings?.currentTerm || "—"}</strong></span>
            <span>Year: <strong className="text-on-surface-variant">{settings?.currentAcademicYear || "—"}</strong></span>
          </div>
        </div>
        <QuickLinks />
      </Card>
    </div>
  );
}

function AccountantDashboard() {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([invoicesApi.list({}).catch(() => [] as FeeInvoice[])])
      .then(([inv]) => setInvoices(inv))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const paid = invoices.filter((i) => i.status === "paid");
  const unpaid = invoices.filter((i) => i.status === "unpaid" || i.status === "partial");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const totalCollected = paid.reduce((s, i) => s + Number(i.amountPaid || 0), 0);
  const totalOutstanding = unpaid.reduce((s, i) => s + Number(i.balance || 0), 0);
  const totalOverdue = overdue.reduce((s, i) => s + Number(i.balance || 0), 0);

  return (
    <div className="animate-fade-in space-y-2">
      <h1 className="text-lg font-bold text-on-surface">Fee Overview</h1>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Collected" value={<Money value={totalCollected} />} hint={`${paid.length} paid`} color="text-emerald-600" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Outstanding" value={<Money value={totalOutstanding} />} hint={`${unpaid.length} unpaid`} color="text-amber-600" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Overdue" value={<Money value={totalOverdue} />} hint={`${overdue.length} overdue`} color="text-red-600" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>} />
      </div>
      <div className="flex gap-2">
        <Link to="/fees/invoices" className="px-3 py-1.5 rounded text-xs font-medium bg-primary-container text-primary hover:bg-primary-container">View Invoices</Link>
        <Link to="/fees/structures" className="px-3 py-1.5 rounded text-xs font-medium bg-primary-container text-primary hover:bg-primary-container">Set Term Fees</Link>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  return (
    <div className="animate-fade-in space-y-2">
      <div>
        <h1 className="text-lg font-bold text-on-surface">Teacher Dashboard</h1>
        <p className="text-xs text-on-surface-variant">Mark attendance, enter assessments, and manage report cards.</p>
      </div>
      <QuickLinks />
    </div>
  );
}



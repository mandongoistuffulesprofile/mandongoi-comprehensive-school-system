import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { payrollApi, payrollEntriesApi } from "../../api/payroll";
import { staffApi } from "../../api/staff";
import type { PayrollEntry, PayrollRun, Staff } from "../../types";
import { Button, EnumBadge, Money, Spinner, Card, PageHeader } from "../../components/ui/Basics";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import { api } from "../../lib/api";
import clsx from "clsx";

export function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();
  const toast = useToast();

  function load() {
    setLoading(true);
    payrollApi.list().then(setRuns).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create() {
    try {
      const run = await payrollApi.create({ month, year });
      toast.add("success", `Payroll run ${month}/${year} created as draft`);
      setShowCreate(false);
      navigate(`/payroll/${run.id}`);
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to create");
    }
  }

  const draftCount = runs.filter((r) => r.status === "draft").length;
  const approvedCount = runs.filter((r) => r.status === "approved").length;
  const paidCount = runs.filter((r) => r.status === "paid").length;

  return (
    <div>
      <PageHeader
        title="Salaries & Payroll"
        description="Create monthly payroll runs, generate payslips from attendance, approve, and process payments."
        actions={<Button onClick={() => setShowCreate(true)}>+ New Run</Button>}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Draft</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{draftCount}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Paid</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{paidCount}</p>
        </div>
        <div className="bg-gradient-to-br from-surface-50 to-surface-100 rounded-xl p-4 border border-outline-variant">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Total Runs</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{runs.length}</p>
        </div>
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-surface-100 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Draft
            </span>
            <span className="text-outline-variant">→</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Approved
            </span>
            <span className="text-outline-variant">→</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Paid
            </span>
          </div>
          <span className="text-xs text-on-surface-variant ml-auto">Click a run to view details</span>
        </div>
        <DataTable
          columns={[
            { header: "Period", cell: (r) => <span className="font-medium">{r.month}/{r.year}</span> },
            { header: "Status", cell: (r) => <EnumBadge value={r.status} /> },
          ]}
          rows={runs}
          loading={loading}
          emptyDescription="Create your first payroll run to get started."
          onRowClick={(r) => navigate(`/payroll/${r.id}`)}
          actions={(r) => r.status === "draft" ? (
            <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this draft payroll run?")) payrollApi.remove(r.id).then(() => { load(); toast.add("success", "Draft run deleted"); }).catch((e) => toast.add("error", e.message)); }}
              className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors">Delete</button>
          ) : undefined}
        />
      </Card>

      {showCreate && (
        <Modal title="New Payroll Run" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <FormField spec={{ name: "month", label: "Month (1-12)", type: "number", required: true }} value={month} onChange={(v) => setMonth(v as number)} />
            <FormField spec={{ name: "year", label: "Year", type: "number", required: true }} value={year} onChange={(v) => setYear(v as number)} />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              The run will be created in <strong>Draft</strong> status. You can then generate entries from attendance data and add adjustments before approving.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={create}>Create Draft</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ExtraDutyRow {
  staffId: string;
  staffName: string;
  sessionType: string;
  sessions: number;
  rate: number;
  amount: number;
}

function staffCategory(s: Staff | undefined): "bomTeacher" | "tscTeacher" | "supportStaff" | "unknown" {
  if (!s) return "unknown";
  if (s.role === "teacher" && s.teacherType === "bom") return "bomTeacher";
  if (s.role === "teacher" && s.teacherType === "tsc") return "tscTeacher";
  if (s.role === "support") return "supportStaff";
  return "unknown";
}

function displayRole(s: Staff | undefined): string {
  if (!s) return "—";
  if (s.role === "teacher" && s.teacherType === "bom") return "BOM Teacher";
  if (s.role === "teacher" && s.teacherType === "tsc") return "TSC Teacher";
  if (s.role === "support") return "Support Staff";
  return s.role;
}

function displayEmployment(s: Staff | undefined): string {
  if (!s) return "—";
  if (s.employmentType === "flatRate") return "Monthly Salary";
  return "Per Session";
}

function EntryTable({
  entries,
  staff,
  runStatus,
  onAdjust,
  title,
  icon,
}: {
  entries: PayrollEntry[];
  staff: Staff[];
  runStatus: string;
  onAdjust: (e: PayrollEntry) => void;
  title: string;
  icon: string;
}) {
  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const totalGross = entries.reduce((s, e) => s + Number(e.grossPay), 0);
  const totalNet = entries.reduce((s, e) => s + Number(e.netPay), 0);

  if (entries.length === 0) return null;

  return (
    <Card className="p-5 mb-6">
      <h3 className="font-semibold text-on-surface flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        {title}
        <span className="text-sm font-normal text-on-surface-variant ml-1">({entries.length} staff)</span>
      </h3>
      <DataTable
        columns={[
          {
            header: "Staff",
            cell: (e) => {
              const s = staffMap.get(e.staffId);
              return (
                <div>
                  <span className="font-medium">{s?.name ?? e.staffId}</span>
                  <span className="ml-2 text-xs text-on-surface-variant">{displayRole(s)}</span>
                </div>
              );
            },
          },
          {
            header: "Rate",
            cell: (e) => {
              const s = staffMap.get(e.staffId);
              return (
                <div className="text-right">
                  <div><Money value={e.baseRate} /></div>
                  <div className="text-xs text-on-surface-variant">{displayEmployment(s)}</div>
                </div>
              );
            },
          },
          { header: "Sessions", cell: (e) => <div className="text-center">{e.sessionsCounted ?? "—"}</div> },
          { header: "Days", cell: (e) => <div className="text-center">{e.daysPresent ?? "—"}</div> },
          { header: "Gross", cell: (e) => <div className="text-right font-medium"><Money value={e.grossPay} /></div> },
          { header: "Net", cell: (e) => <div className="text-right font-semibold"><Money value={e.netPay} className="text-emerald-600" /></div> },
        ]}
        rows={entries}
        actions={
          runStatus === "draft"
            ? (e) => (
                <button className="text-ochre text-xs hover:underline" onClick={() => onAdjust(e)}>
                  Add Adjustment
                </button>
              )
            : undefined
        }
      />
      <div className="flex justify-end gap-8 mt-3 pt-3 border-t border-outline-variant text-sm">
        <div className="text-right">
          <span className="text-on-surface-variant">Gross Total</span>
          <div className="font-semibold"><Money value={totalGross} /></div>
        </div>
        <div className="text-right">
          <span className="text-on-surface-variant">Net Total</span>
          <div className="font-semibold text-emerald-600"><Money value={totalNet} /></div>
        </div>
      </div>
    </Card>
  );
}

export function PayrollRunDetail() {
  const { id = "" } = useParams();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [adjustingEntry, setAdjustingEntry] = useState<PayrollEntry | null>(null);
  const [extraDuty, setExtraDuty] = useState<ExtraDutyRow[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([payrollApi.list(), payrollEntriesApi.listForRun(id), staffApi.list()]).then(
      async ([runs, ents, staffList]) => {
        const found = runs.find((r) => r.id === id) ?? null;
        setRun(found);
        setEntries(ents);
        setStaff(staffList);
        if (found && found.status === 'draft' && ents.length === 0) {
          try {
            const generated = await payrollApi.generateEntries(id);
            setEntries(generated);
          } catch {}
        }
        if (found) {
          api.get<ExtraDutyRow[]>(`/payroll/${id}/extra-duty`).then(setExtraDuty).catch(() => {});
        }
      }
    ).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const grouped = useMemo(() => {
    const bom: PayrollEntry[] = [];
    const support: PayrollEntry[] = [];
    for (const e of entries) {
      const cat = staffCategory(staffMap.get(e.staffId));
      if (cat === "bomTeacher") bom.push(e);
      else if (cat === "supportStaff") support.push(e);
      else bom.push(e);
    }
    return { bomTeachers: bom, supportStaff: support };
  }, [entries, staffMap]);

  const tscStaff = useMemo(
    () => staff.filter((s) => staffCategory(s) === "tscTeacher" && s.isActive),
    [staff]
  );

  const totalGrossAll = entries.reduce((s, e) => s + Number(e.grossPay), 0);
  const totalNetAll = entries.reduce((s, e) => s + Number(e.netPay), 0);
  const totalExtraDuty = extraDuty.reduce((s, d) => s + Number(d.amount), 0);

  async function loadExtraDuty() {
    setLoadingExtra(true);
    try {
      const data = await api.get<ExtraDutyRow[]>(`/payroll/${id}/extra-duty`);
      setExtraDuty(data);
    } catch {
      toast.add("error", "Failed to load extra duty");
    } finally {
      setLoadingExtra(false);
    }
  }

  async function generateEntries() {
    try {
      await payrollApi.generateEntries(id);
      toast.add("success", "Entries generated from attendance");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to generate entries");
    }
  }
  async function approve() {
    try {
      await payrollApi.approve(id);
      toast.add("success", "Payroll run approved");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to approve");
    }
  }
  async function pay() {
    try {
      await payrollApi.pay(id);
      toast.add("success", "Payroll run marked as paid");
      load();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to mark as paid");
    }
  }
  if (loading) return <Spinner />;
  if (!run) return <p className="text-on-surface-variant">Payroll run not found.</p>;

  const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][run.month - 1] || run.month;

  return (
    <div>
      <Link to="/payroll" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-on-primary-container bg-primary-container hover:bg-primary-container px-3 py-1.5 rounded-lg transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to all runs
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{monthName} {run.year}</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Payroll run · Created as draft</p>
        </div>
        <EnumBadge value={run.status} />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {run.status === "draft" && (
          <>
            <Button variant="secondary" onClick={generateEntries}>Generate from Attendance</Button>
            <Button variant="ghost" onClick={() => setShowAddEntry(true)}>+ Manual Entry</Button>
            <Button onClick={approve}>Approve</Button>
          </>
        )}
        {run.status === "approved" && <Button onClick={pay}>Mark Paid (posts to ledger)</Button>}
        {run.status === "paid" && <span className="text-sm text-sage">Paid on {run.paidAt ? new Date(run.paidAt).toLocaleDateString() : ""}</span>}
      </div>

      {/* Extra Duty Section — for TSC Teachers & eligible staff */}
      <Card className="p-5 mb-6 border-l-4 border-l-amber-400">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Extra Duty / Per Diem — Morning · Evening · Weekend
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              TSC teachers and eligible staff — special classes, morning/evening/weekend sessions, and admin-assigned tasks
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { loadExtraDuty(); load(); }} disabled={loadingExtra}>
            {loadingExtra ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {tscStaff.length > 0 && (
          <div className="mb-3 text-xs text-on-surface-variant bg-amber-50 rounded-lg px-3 py-2">
            <span className="font-medium">TSC Teachers on this run:</span>{" "}
            {tscStaff.map((s) => s.name).join(", ")} — these staff receive extra duty / per diem only
          </div>
        )}

        {extraDuty.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-2">No extra duty sessions found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2 px-3 font-medium">Staff</th>
                  <th className="py-2 px-3 font-medium">Category</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium text-center">Sessions</th>
                  <th className="py-2 px-3 font-medium text-right">Rate (KES)</th>
                  <th className="py-2 px-3 font-medium text-right">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {extraDuty.map((d) => {
                  const s = staffMap.get(d.staffId);
                  return (
                    <tr key={d.staffId + "-" + d.sessionType} className="border-b border-surface-100 hover:bg-surface-container-low">
                      <td className="py-2 px-3 font-medium text-on-surface">{d.staffName}</td>
                      <td className="py-2 px-3 text-xs text-on-surface-variant">{displayRole(s)}</td>
                      <td className="py-2 px-3">
                        <span className={clsx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          d.sessionType === 'morning' ? 'bg-amber-100 text-amber-700' :
                          d.sessionType === 'evening' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                        )}>
                          {d.sessionType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">{d.sessions}</td>
                      <td className="py-2 px-3 text-right"><Money value={d.rate} /></td>
                      <td className="py-2 px-3 text-right font-semibold"><Money value={d.amount} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low font-semibold">
                  <td colSpan={5} className="py-2 px-3 text-right">Total Extra Duty / Per Diem</td>
                  <td className="py-2 px-3 text-right"><Money value={totalExtraDuty} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* BOM Teachers Section */}
      <EntryTable
        entries={grouped.bomTeachers}
        staff={staff}
        runStatus={run.status}
        onAdjust={setAdjustingEntry}
        title="Teachers (BOM — Monthly Salary)"
        icon="👨‍🏫"
      />

      {/* Support Staff Section */}
      <EntryTable
        entries={grouped.supportStaff}
        staff={staff}
        runStatus={run.status}
        onAdjust={setAdjustingEntry}
        title="Support Staff"
        icon="👷"
      />

      {/* Overall Reconciliation */}
      {(grouped.bomTeachers.length > 0 || grouped.supportStaff.length > 0 || extraDuty.length > 0) && (
        <Card className="p-5 mb-6 bg-gradient-to-br from-surface-50 to-white border-2 border-outline-variant">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span>📊</span>
            Payroll Reconciliation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Salary Breakdown</h4>
              {grouped.bomTeachers.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">BOM Teachers</span>
                  <span className="font-medium"><Money value={grouped.bomTeachers.reduce((s, e) => s + Number(e.netPay), 0)} /></span>
                </div>
              )}
              {grouped.supportStaff.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Support Staff</span>
                  <span className="font-medium"><Money value={grouped.supportStaff.reduce((s, e) => s + Number(e.netPay), 0)} /></span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Extra Duty</h4>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Morning / Evening / Weekend</span>
                <span className="font-medium text-amber-600"><Money value={totalExtraDuty} /></span>
              </div>
            </div>
            <div className="space-y-2 border-l border-outline-variant pl-6">
              <h4 className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Grand Total</h4>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Gross Pay</span>
                <span className="font-semibold"><Money value={totalGrossAll} /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Net Pay (Salary)</span>
                <span className="font-semibold text-emerald-600"><Money value={totalNetAll} /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Extra Duty</span>
                <span className="font-semibold text-amber-600"><Money value={totalExtraDuty} /></span>
              </div>
              <div className="border-t border-outline pt-1 flex justify-between text-sm font-bold">
                <span>Total Payout</span>
                <span className="text-lg"><Money value={totalNetAll + totalExtraDuty} /></span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showAddEntry && <AddEntryModal runId={id} staff={staff} onClose={() => setShowAddEntry(false)} onDone={load} />}
      {adjustingEntry && <AdjustmentModal entry={adjustingEntry} onClose={() => setAdjustingEntry(null)} onDone={load} />}
    </div>
  );
}

function AddEntryModal({
  runId,
  staff,
  onClose,
  onDone,
}: {
  runId: string;
  staff: Staff[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [baseRate, setBaseRate] = useState<number | "">("");
  const [sessions, setSessions] = useState<number | "">("");
  const [days, setDays] = useState<number | "">("");

  async function submit() {
    if (!staffId || !baseRate) return;
    await payrollEntriesApi.createManual(runId, {
      staffId,
      baseRate: Number(baseRate),
      sessionsCounted: sessions ? Number(sessions) : undefined,
      daysPresent: days ? Number(days) : undefined,
    });
    onDone();
    onClose();
  }

  return (
    <Modal title="Manual Payroll Entry" onClose={onClose}>
      <div className="space-y-4">
        <FormField
          spec={{ name: "staffId", label: "Staff", type: "select", required: true, options: staff.map((s) => ({ value: s.id, label: `${s.name} (${displayRole(s)})` })) }}
          value={staffId}
          onChange={(v) => setStaffId(v as string)}
        />
        <FormField spec={{ name: "baseRate", label: "Base Rate", type: "number", step: "0.01", required: true }} value={baseRate} onChange={(v) => setBaseRate(v as number)} />
        <FormField spec={{ name: "sessions", label: "Sessions Counted" }} value={sessions} onChange={(v) => setSessions(v as number)} />
        <FormField spec={{ name: "days", label: "Days Present" }} value={days} onChange={(v) => setDays(v as number)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustmentModal({ entry, onClose, onDone }: { entry: PayrollEntry; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  async function submit() {
    if (!reason || !amount) return;
    await payrollEntriesApi.addAdjustment(entry.id, { reason, amount: Number(amount) });
    onDone();
    onClose();
  }

  return (
    <Modal title="Add Adjustment" onClose={onClose}>
      <div className="space-y-4">
        <FormField spec={{ name: "reason", label: "Reason", required: true }} value={reason} onChange={(v) => setReason(v as string)} />
        <FormField spec={{ name: "amount", label: "Amount (+/-)", type: "number", step: "0.01", required: true }} value={amount} onChange={(v) => setAmount(v as number)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}

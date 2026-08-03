import { useEffect, useState, useMemo } from "react";
import { ledgerApi, type JournalEntryRecord } from "../../api/ledger";
import type { LedgerAccount } from "../../types";
import { Button, Money, Card, PageHeader, Spinner } from "../../components/ui/Basics";
import { useAuth } from "../../lib/auth";
import Dropdown from "../../components/ui/Dropdown";
import { useToast } from "../../lib/toast";
import clsx from "clsx";

type ViewMode = "choose" | "supplies" | "donation" | "repair" | "advanced";

type PaidFrom = "cash" | "mpesa" | "bank";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-surface-container text-on-surface-variant" },
  feePayment: { label: "Fee Payment", color: "bg-emerald-100 text-emerald-700" },
  payroll: { label: "Payroll", color: "bg-blue-100 text-blue-700" },
  expense: { label: "Expense", color: "bg-amber-100 text-amber-700" },
  smsCost: { label: "SMS Cost", color: "bg-purple-100 text-purple-700" },
  foodPurchase: { label: "Food Purchase", color: "bg-orange-100 text-orange-700" },
  foodContribution: { label: "Food Contribution", color: "bg-lime-100 text-lime-700" },
};

const PAID_FROM_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa Till" },
  { value: "bank", label: "Bank Account" },
];

function templateMeta(mode: ViewMode) {
  switch (mode) {
    case "supplies":
      return {
        title: "Buy Supplies",
        description: "Stationery, books, equipment, or other school supplies",
        color: "border-l-emerald-500 bg-emerald-50/50",
        badgeColor: "bg-emerald-100 text-emerald-700",
      };
    case "donation":
      return {
        title: "Donation Received",
        description: "Cash or in-kind donation from a donor",
        color: "border-l-purple-500 bg-purple-50/50",
        badgeColor: "bg-purple-100 text-purple-700",
      };
    case "repair":
      return {
        title: "Repair / Maintenance",
        description: "Building, equipment, or vehicle repairs",
        color: "border-l-amber-500 bg-amber-50/50",
        badgeColor: "bg-amber-100 text-amber-700",
      };
    default:
      return { title: "", description: "", color: "", badgeColor: "" };
  }
}

export default function JournalEntry() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [mode, setMode] = useState<ViewMode>("choose");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const toast = useToast();

  const [recent, setRecent] = useState<JournalEntryRecord[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  function loadRecent() {
    ledgerApi.listJournal().then(setRecent).finally(() => setRecentLoading(false));
  }

  useEffect(() => {
    ledgerApi.listAccounts().then(setAccounts);
    loadRecent();
  }, []);

  const accountMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) {
      const key = a.name.toLowerCase();
      m.set(key, a.id);
      m.set(a.code, a.id);
    }
    return m;
  }, [accounts]);

  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense"), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type === "asset"), [accounts]);
  const incomeAccounts = useMemo(() => accounts.filter((a) => a.type === "income"), [accounts]);

  function findAccount(hint: string): string {
    const key = hint.toLowerCase();
    return accountMap.get(key)
      || accountMap.get(key.replace(/[^a-z0-9]/g, ""))
      || "";
  }

  function resolvePaidFromAccount(paidFrom: PaidFrom): string {
    if (paidFrom === "mpesa") return findAccount("M-Pesa") || findAccount("4000");
    if (paidFrom === "bank") return findAccount("bank") || findAccount("Cash");
    return findAccount("Cash") || findAccount("1000");
  }

  function resolveExpenseAccount(nameHint: string): string {
    const exact = findAccount(nameHint);
    if (exact) return exact;
    const similar = expenseAccounts.find((a) => a.name.toLowerCase().includes(nameHint.toLowerCase()));
    return similar?.id || expenseAccounts[0]?.id || "";
  }

  function resolveIncomeAccount(nameHint: string): string {
    const exact = findAccount(nameHint);
    if (exact) return exact;
    const similar = incomeAccounts.find((a) => a.name.toLowerCase().includes(nameHint.toLowerCase()));
    return similar?.id || incomeAccounts[0]?.id || "";
  }

  // ── Template form state ──
  const [supplier, setSupplier] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [suppliesAmount, setSuppliesAmount] = useState<number>(0);
  const [suppliesPaidFrom, setSuppliesPaidFrom] = useState<PaidFrom>("cash");

  const [donorName, setDonorName] = useState("");
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [donationReceivedInto, setDonationReceivedInto] = useState<PaidFrom>("cash");

  const [contractor, setContractor] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [repairAmount, setRepairAmount] = useState<number>(0);
  const [repairPaidFrom, setRepairPaidFrom] = useState<PaidFrom>("cash");

  // ── Advanced form state ──
  const [advDescription, setAdvDescription] = useState("");
  const [advLines, setAdvLines] = useState<{ accountId: string; debit: string; credit: string }[]>([
    { accountId: "", debit: "0", credit: "0" },
    { accountId: "", debit: "0", credit: "0" },
  ]);

  const advTotalDebit = advLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const advTotalCredit = advLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const advBalanced = advTotalDebit === advTotalCredit && advTotalDebit > 0;
  const advUnbalanced = (advTotalDebit > 0 || advTotalCredit > 0) && advTotalDebit !== advTotalCredit;

  const meta = templateMeta(mode);

  function resetTemplate() {
    setSupplier("");
    setItemDescription("");
    setSuppliesAmount(0);
    setSuppliesPaidFrom("cash");
    setDonorName("");
    setDonationAmount(0);
    setDonationReceivedInto("cash");
    setContractor("");
    setRepairDescription("");
    setRepairAmount(0);
    setRepairPaidFrom("cash");
  }

  function goBack() {
    resetTemplate();
    setAdvDescription("");
    setAdvLines([
      { accountId: "", debit: "0", credit: "0" },
      { accountId: "", debit: "0", credit: "0" },
    ]);
    setMode("choose");
  }

  async function submitTemplate(tpl: "supplies" | "donation" | "repair") {
    const amount = tpl === "supplies" ? suppliesAmount : tpl === "donation" ? donationAmount : repairAmount;
    if (!amount || amount <= 0) {
      toast.add("error", "Enter the amount");
      return;
    }

    let paidFrom: PaidFrom;
    let descParts: string[];
    let debitAccountId: string;
    let creditAccountId: string;

    if (tpl === "supplies") {
      paidFrom = suppliesPaidFrom;
      descParts = [`Bought ${itemDescription || "supplies"}`];
      if (supplier) descParts.push(`from ${supplier}`);
      debitAccountId = resolvePaidFromAccount(paidFrom);
      creditAccountId = resolveExpenseAccount("Supplies");
    } else if (tpl === "donation") {
      paidFrom = donationReceivedInto;
      descParts = ["Donation received"];
      if (donorName && donorName !== "Anonymous") descParts.push(`from ${donorName}`);
      debitAccountId = resolveIncomeAccount("Donation") || resolveIncomeAccount("Income");
      creditAccountId = resolvePaidFromAccount(paidFrom);
    } else {
      paidFrom = repairPaidFrom;
      descParts = [`Repair: ${repairDescription || "maintenance work"}`];
      if (contractor) descParts.push(`by ${contractor}`);
      debitAccountId = resolvePaidFromAccount(paidFrom);
      creditAccountId = resolveExpenseAccount("Maintenance") || resolveExpenseAccount("Repair") || expenseAccounts[0]?.id || "";
    }

    if (!debitAccountId || !creditAccountId) {
      toast.add("error", "Required ledger accounts not found. Check your Chart of Accounts.");
      return;
    }

    try {
      await ledgerApi.postJournalEntry({
        entryDate,
        description: descParts.join(" "),
        sourceType: "manual",
        lines: [
          { accountId: debitAccountId, debit: amount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: amount },
        ],
      });
      toast.add("success", `${meta.title} recorded`);
      loadRecent();
      goBack();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to record");
    }
  }

  async function submitAdvanced() {
    if (!advBalanced) {
      toast.add("error", "Total money out must equal total money in.");
      return;
    }
    try {
      await ledgerApi.postJournalEntry({
        entryDate,
        description: advDescription,
        sourceType: "manual",
        lines: advLines.filter((l) => l.accountId),
      });
      toast.add("success", "Transaction recorded");
      loadRecent();
      goBack();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to record");
    }
  }

  function updateAdvLine(i: number, patch: Partial<{ accountId: string; debit: string; credit: string }>) {
    setAdvLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      await ledgerApi.deleteJournalEntry(id);
      toast.add("success", "Transaction deleted and effects reversed");
      loadRecent();
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function addAdvLine() {
    setAdvLines((prev) => [...prev, { accountId: "", debit: "0", credit: "0" }]);
  }

  function removeAdvLine(i: number) {
    setAdvLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Render ──

  if (mode === "choose") {
    return (
      <div>
        <PageHeader title="Record a Transaction" description="Choose what happened, fill in the details — we'll handle the accounting." />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TemplateCard
            icon="🛒"
            title="Buy Supplies"
            desc="Stationery, books, equipment"
            badge="Expense"
            badgeColor="bg-emerald-100 text-emerald-700"
            onClick={() => { resetTemplate(); setMode("supplies"); }}
          />
          <TemplateCard
            icon="🎁"
            title="Donation Received"
            desc="Cash or gift from a donor"
            badge="Income"
            badgeColor="bg-purple-100 text-purple-700"
            onClick={() => { resetTemplate(); setMode("donation"); }}
          />
          <TemplateCard
            icon="🔧"
            title="Repair / Maintenance"
            desc="Building, equipment repairs"
            badge="Expense"
            badgeColor="bg-amber-100 text-amber-700"
            onClick={() => { resetTemplate(); setMode("repair"); }}
          />
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => setMode("advanced")} className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant hover:border-outline transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Advanced Entry
            <span className="text-on-surface-variant font-normal">— for corrections & custom transactions</span>
          </button>
        </div>

        <div className="mt-10">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Recent Transactions</h3>
          {recentLoading ? (
            <div className="flex justify-center py-8"><Spinner className="w-5 h-5" /></div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">No transactions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 8).map((entry) => {
                const total = entry.lines.reduce((s, l) => s + Math.max(Number(l.debit), Number(l.credit)), 0);
                const src = SOURCE_LABELS[entry.sourceType] || { label: entry.sourceType, color: "bg-surface-container text-on-surface-variant" };
                return (
                  <div key={entry.id} className="flex items-center justify-between bg-surface-container-lowest rounded-lg border border-outline-variant px-4 py-3 text-sm hover:border-outline transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-on-surface truncate">{entry.description || entry.sourceType}</p>
                        <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", src.color)}>{src.label}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(entry.entryDate).toLocaleDateString("en-KE")}
                        {entry.createdByName && <> · by {entry.createdByName}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <p className="font-semibold text-on-surface">KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-30"
                          title="Delete this transaction"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "advanced") {
    return (
      <div>
        <PageHeader title="Advanced Entry" description="Manually set which accounts are debited and credited. Use this for corrections or anything that doesn't fit the templates." />

        <Card className="p-6 max-w-3xl">
          <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-on-primary-container bg-primary-container hover:bg-primary-container px-3 py-1.5 rounded-lg transition-colors mb-5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to templates
          </button>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Date</label>
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-on-surface mb-1.5">Description</label>
                <input value={advDescription} onChange={(e) => setAdvDescription(e.target.value)} placeholder="e.g. Correcting fee overpayment" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>

            <div>
              <div className="hidden sm:grid grid-cols-[1fr_140px_140px_32px] gap-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2 px-1">
                <span>Account</span>
                <span className="text-right">Money Out <span className="block text-[10px] font-normal normal-case text-on-surface-variant">leaves this account</span></span>
                <span className="text-right">Money In <span className="block text-[10px] font-normal normal-case text-on-surface-variant">goes to this account</span></span>
                <span />
              </div>
              <div className="space-y-3">
                {advLines.map((line, i) => (
                  <div key={i} className={clsx("pb-3", i < advLines.length - 1 && "border-b border-surface-100")}>
                    <div className="sm:hidden text-xs font-medium text-on-surface-variant mb-2">Line {i + 1}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_32px] gap-2 sm:gap-3 items-start sm:items-center">
                      <Dropdown
                        value={line.accountId}
                        options={accounts.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
                        onChange={(v) => updateAdvLine(i, { accountId: v })}
                        placeholder="Select account..."
                        size="sm"
                      />
                      <div>
                        <label className="sm:hidden text-xs text-on-surface-variant mb-1 block">Money Out (leaves this account)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant font-mono">KES</span>
                          <input type="number" placeholder="0.00" value={line.debit === "0" ? "" : line.debit}
                            onChange={(e) => updateAdvLine(i, { debit: e.target.value || "0", credit: "0" })}
                            className="w-full rounded-lg border border-outline pl-10 pr-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-on-surface-variant mb-1 block">Money In (goes to this account)</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant font-mono">KES</span>
                            <input type="number" placeholder="0.00" value={line.credit === "0" ? "" : line.credit}
                              onChange={(e) => updateAdvLine(i, { credit: e.target.value || "0", debit: "0" })}
                              className="w-full rounded-lg border border-outline pl-10 pr-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                          </div>
                          {advLines.length > 2 && (
                            <button onClick={() => removeAdvLine(i)} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {advLines.length > 2 && (
                        <button onClick={() => removeAdvLine(i)} className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addAdvLine} className="mt-3 text-sm font-medium text-primary hover:text-on-primary-container transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add account line
              </button>
            </div>

            <div className={clsx("flex items-center justify-between pt-4 border-t", advBalanced ? "border-emerald-200" : advUnbalanced ? "border-red-200" : "border-outline-variant")}>
              <div className={clsx("text-sm font-medium", advBalanced ? "text-emerald-600" : advUnbalanced ? "text-red-600" : "text-on-surface-variant")}>
                Total Money Out: <Money value={advTotalDebit} />
              </div>
              <div className={clsx("text-sm font-medium", advBalanced ? "text-emerald-600" : advUnbalanced ? "text-red-600" : "text-on-surface-variant")}>
                Total Money In: <Money value={advTotalCredit} />
              </div>
            </div>
            {advUnbalanced && <p className="text-xs text-red-500 text-center -mt-2">Total money out and total money in must match</p>}

            <Button onClick={submitAdvanced} disabled={!advBalanced} className="w-full">Record Transaction</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Template forms (supplies / donation / repair) ──
  return (
    <div>
      <PageHeader title={meta.title} description={meta.description} />

      <Card className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-on-primary-container bg-primary-container hover:bg-primary-container px-3 py-1.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <span className="text-xs text-on-surface-variant">{meta.title}</span>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Date</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          {mode === "supplies" && (
            <>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Supplier <span className="text-on-surface-variant font-normal">(optional)</span></label>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Kifaru Stationers" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">What was bought?</label>
                <input value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="e.g. Exercise books, pens, chalk" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Amount (KES) *</label>
                  <input type="number" min={1} value={suppliesAmount || ""} onChange={(e) => setSuppliesAmount(Number(e.target.value))} placeholder="0.00" className="w-full rounded-lg border border-outline px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Paid from *</label>
                  <Dropdown value={suppliesPaidFrom} options={PAID_FROM_OPTIONS} onChange={(v) => setSuppliesPaidFrom(v as PaidFrom)} size="sm" />
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant space-y-1">
                <p className="font-medium text-on-surface-variant">This will record:</p>
                <p>Money Out: {PAID_FROM_OPTIONS.find((o) => o.value === suppliesPaidFrom)?.label} → Supplies Expense</p>
              </div>
              <Button onClick={() => submitTemplate("supplies")} disabled={!suppliesAmount || suppliesAmount <= 0} className="w-full">
                Record Purchase — KES {suppliesAmount.toLocaleString("en-KE")}
              </Button>
            </>
          )}

          {mode === "donation" && (
            <>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Donor name <span className="text-on-surface-variant font-normal">(optional, leave blank for Anonymous)</span></label>
                <input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="e.g. John Kariuki Foundation" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Amount (KES) *</label>
                  <input type="number" min={1} value={donationAmount || ""} onChange={(e) => setDonationAmount(Number(e.target.value))} placeholder="0.00" className="w-full rounded-lg border border-outline px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Received into *</label>
                  <Dropdown value={donationReceivedInto} options={PAID_FROM_OPTIONS} onChange={(v) => setDonationReceivedInto(v as PaidFrom)} size="sm" />
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant space-y-1">
                <p className="font-medium text-on-surface-variant">This will record:</p>
                <p>Money Out: Donation Income → {PAID_FROM_OPTIONS.find((o) => o.value === donationReceivedInto)?.label}</p>
              </div>
              <Button onClick={() => submitTemplate("donation")} disabled={!donationAmount || donationAmount <= 0} className="w-full">
                Record Donation — KES {donationAmount.toLocaleString("en-KE")}
              </Button>
            </>
          )}

          {mode === "repair" && (
            <>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Contractor or vendor <span className="text-on-surface-variant font-normal">(optional)</span></label>
                <input value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="e.g. Paul's Plumbing" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">What was repaired?</label>
                <input value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} placeholder="e.g. Leaking roof in Grade 4 classroom" className="w-full rounded-lg border border-outline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Amount (KES) *</label>
                  <input type="number" min={1} value={repairAmount || ""} onChange={(e) => setRepairAmount(Number(e.target.value))} placeholder="0.00" className="w-full rounded-lg border border-outline px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Paid from *</label>
                  <Dropdown value={repairPaidFrom} options={PAID_FROM_OPTIONS} onChange={(v) => setRepairPaidFrom(v as PaidFrom)} size="sm" />
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant space-y-1">
                <p className="font-medium text-on-surface-variant">This will record:</p>
                <p>Money Out: {PAID_FROM_OPTIONS.find((o) => o.value === repairPaidFrom)?.label} → Maintenance Expense</p>
              </div>
              <Button onClick={() => submitTemplate("repair")} disabled={!repairAmount || repairAmount <= 0} className="w-full">
                Record Repair — KES {repairAmount.toLocaleString("en-KE")}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function TemplateCard({ icon, title, desc, badge, badgeColor, onClick }: {
  icon: string; title: string; desc: string; badge: string; badgeColor: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left bg-surface-container-lowest rounded-xl border border-outline-variant p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-4">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-on-surface group-hover:text-on-primary-container transition-colors">{title}</h3>
            <span className={clsx("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider", badgeColor)}>{badge}</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-0.5">{desc}</p>
        </div>
        <svg className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </div>
    </button>
  );
}

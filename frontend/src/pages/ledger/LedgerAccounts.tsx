import { useAuth } from "../../lib/auth";
import { ledgerApi } from "../../api/ledger";
import { ResourcePage } from "../../components/ui/ResourcePage";
import { PageNavigation } from '../../components/ui/PageNavigation';
import { EnumBadge } from "../../components/ui/Basics";
import type { LedgerAccount } from "../../types";

export default function LedgerAccounts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "schoolAdmin";

  return (
      <ResourcePage<LedgerAccount>
      quickSwitchers={[{ label: "Income & Expenses", to: "/ledger/trial-balance" }, { label: "Record Transaction", to: "/ledger/journal" }]}
      activeQuickSwitcher="/ledger/accounts"      title="Chart of Accounts"
      description="Categories where money is recorded — e.g., Cash, Fees Income, Salaries Expense. Every transaction moves money between these accounts."
      canWrite={isAdmin}
      fields={[
        { name: "code", label: "Code", required: true, placeholder: "e.g. 1000" },
        { name: "name", label: "Name", required: true },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "asset", label: "Asset" },
            { value: "liability", label: "Liability" },
            { value: "equity", label: "Equity" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
          ],
        },
      ]}
      columns={[
        { header: "Code", cell: (a) => <span className="tabular">{a.code}</span> },
        { header: "Name", cell: (a) => a.name },
        { header: "Type", cell: (a) => <EnumBadge value={a.type} /> },
      ]}
      fetchList={() => ledgerApi.listAccounts()}
      createItem={isAdmin ? (p) => ledgerApi.createAccount(p) : undefined}
      updateItem={isAdmin ? (id, p) => ledgerApi.updateAccount(id, p) : undefined}
      deleteItem={isAdmin ? (id) => ledgerApi.removeAccount(id) : undefined}
    />
  );
}

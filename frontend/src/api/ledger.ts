import { api } from "../lib/api";
import type { LedgerAccount, LedgerAccountType, LedgerEntry, LedgerLine, TrialBalanceRow } from "../types";

export interface JournalEntryRecord {
  id: string;
  entryDate: string;
  description: string;
  sourceType: string;
  createdAt: string;
  createdByName: string | null;
  lines: { accountId: string; accountName: string; accountCode: string; debit: string; credit: string }[];
}

export const ledgerApi = {
  listAccounts: (type?: LedgerAccountType) => api.get<LedgerAccount[]>("/ledger", { type }),
  createAccount: (payload: Partial<LedgerAccount>) => api.post<LedgerAccount>("/ledger", payload),
  updateAccount: (id: string, payload: Partial<LedgerAccount>) => api.put<LedgerAccount>(`/ledger/${id}`, payload),
  removeAccount: (id: string) => api.delete<void>(`/ledger/${id}`),
  postJournalEntry: (payload: {
    entryDate: string;
    description?: string;
    sourceType: LedgerEntry["sourceType"];
    sourceId?: string;
    lines: LedgerLine[];
  }) => api.post<LedgerEntry>("/ledger/journal", payload),
  trialBalance: () => api.get<TrialBalanceRow[]>("/ledger/trial-balance"),
  listJournal: () => api.get<JournalEntryRecord[]>("/ledger/journal"),
  deleteJournalEntry: (id: string) => api.delete<void>(`/ledger/journal/${id}`),
};

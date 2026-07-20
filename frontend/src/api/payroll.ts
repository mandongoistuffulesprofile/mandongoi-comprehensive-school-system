import { api } from "../lib/api";
import type { PayrollAdjustment, PayrollEntry, PayrollRun, PayrollRunStatus } from "../types";

export const payrollApi = {
  list: (filters?: { status?: PayrollRunStatus; month?: number; year?: number }) =>
    api.get<PayrollRun[]>("/payroll", filters as Record<string, string | number>),
  create: (payload: { month: number; year: number }) => api.post<PayrollRun>("/payroll", payload),
  generateEntries: (runId: string) => api.post<PayrollEntry[]>(`/payroll/${runId}/generate-entries`),
  approve: (runId: string) => api.patch<PayrollRun>(`/payroll/${runId}/approve`),
  pay: (runId: string) => api.patch<PayrollRun>(`/payroll/${runId}/pay`),
  remove: (runId: string) => api.delete<void>(`/payroll/${runId}`),
};

export const payrollEntriesApi = {
  listForRun: (runId: string) => api.get<PayrollEntry[]>(`/payroll-entries/run/${runId}`),
  createManual: (
    runId: string,
    payload: { staffId: string; baseRate: number; sessionsCounted?: number; daysPresent?: number }
  ) => api.post<PayrollEntry>(`/payroll-entries/${runId}/entries`, payload),
  addAdjustment: (entryId: string, payload: { reason: string; amount: number }) =>
    api.post<PayrollAdjustment>(`/payroll-entries/${entryId}/adjustments`, payload),
  listAdjustments: (entryId: string) => api.get<PayrollAdjustment[]>(`/payroll-entries/${entryId}/adjustments`),
};

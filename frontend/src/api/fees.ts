import { api } from "../lib/api";
import type { FeeInvoice, FeeStructure, InvoiceStatus, PaymentMethod, Receipt } from "../types";

export const feeStructuresApi = {
  list: (filters?: { grade?: string; term?: number; academicYear?: number }) =>
    api.get<FeeStructure[]>("/fees", filters as Record<string, string | number>),
  create: (payload: Partial<FeeStructure>) => api.post<FeeStructure>("/fees", payload),
  update: (id: string, payload: Partial<FeeStructure>) => api.put<FeeStructure>(`/fees/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/fees/${id}`),
};

export const invoicesApi = {
  list: (filters?: {
    studentId?: string;
    status?: InvoiceStatus;
    term?: number;
    academicYear?: number;
    balance?: "pending" | "paid" | "overdue";
  }) => api.get<FeeInvoice[]>("/invoices", filters as Record<string, string | number>),
  generate: (payload: { studentId: string; feeStructureId: string; dueDate?: string }) =>
    api.post<FeeInvoice>("/invoices/generate", payload),
  generateBulk: (feeStructureId: string) =>
    api.post<{ created: number; skipped: number; errors: number; total: number }>("/invoices/generate-bulk", { feeStructureId }),
  recordPayment: (
    id: string,
    payload: { amount: number; paymentMethod: PaymentMethod; mpesaTransactionId?: string }
  ) => api.post<{ invoice: FeeInvoice; receipt: Receipt }>(`/invoices/${id}/payment`, payload),
  receipts: (id: string) => api.get<Receipt[]>(`/invoices/${id}/receipts`),
  stkPush: (payload: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    description?: string;
  }) => api.post<{ checkoutRequestId?: string; status: string }>("/invoices/mpesa/stk-push", payload),
};
export const paymentsApi = {
  list: (filters?: { type?: string; matchStatus?: string }) =>
    api.get<PaymentRecord[]>("/payments", filters as Record<string, string>),
  unmatched: () => api.get<PaymentRecord[]>("/invoices/mpesa/unmatched"),
  matchTransaction: (transactionId: string, invoiceId: string) =>
    api.post<PaymentRecord>("/invoices/mpesa/match", { transactionId, invoiceId }),
};

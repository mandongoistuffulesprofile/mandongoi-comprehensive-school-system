import { api } from "../lib/api";

export interface DashboardKpis {
  active_students: number;
  active_staff: number;
  pending_invoices: number;
  total_balance: string;
  total_collected: string;
  total_expected: string;
  sent_campaigns: number;
}

export const dashboardApi = {
  kpis: () => api.get<DashboardKpis>("/dashboard/kpis"),
};

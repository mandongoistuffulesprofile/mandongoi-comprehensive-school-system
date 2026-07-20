import { api } from "../lib/api";

export interface FoodLog {
  id: string;
  studentId: string;
  presetId?: string;
  itemName: string;
  type: "consumption" | "contribution" | "purchase" | "wastage";
  quantity: string;
  unit: string;
  estimatedValue: string;
  loggedAt: string;
  notes: string | null;
  term: number;
  academicYear: number;
  studentName?: string;
  studentGrade?: string;
}

export const foodLogsApi = {
  list: (filters?: { studentId?: string; term?: number; academicYear?: number; type?: string }) =>
    api.get<FoodLog[]>("/food-logs", filters as Record<string, string | number>),
  create: (payload: { studentId?: string; itemName: string; type?: string; quantity?: number; unit?: string; notes?: string; term: number; academicYear: number }) =>
    api.post<FoodLog>("/food-logs", payload),
  remove: (id: string) => api.delete<void>(`/food-logs/${id}`),
};

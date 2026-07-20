import { api } from "../lib/api";
import type { Staff, StaffAttendance, StaffAttendanceStatus, StaffRole } from "../types";

export const staffApi = {
  list: (filters?: { role?: StaffRole; isActive?: boolean }) =>
    api.get<Staff[]>("/staff", filters as Record<string, string | boolean>),
  create: (payload: Partial<Staff>) => api.post<Staff>("/staff", payload),
  update: (id: string, payload: Partial<Staff>) => api.put<Staff>(`/staff/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/staff/${id}`),
};

export const staffAttendanceApi = {
  mark: (payload: { staffId: string; date: string; status: StaffAttendanceStatus; sessionsTaught?: number }) =>
    api.post<StaffAttendance>("/staff-attendance", payload),
  listForStaff: (staffId: string, filters?: { startDate?: string; endDate?: string }) =>
    api.get<StaffAttendance[]>(`/staff-attendance/staff/${staffId}`, filters),
};

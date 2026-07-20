import { api } from "../lib/api";
import type { StudentAttendance, AttendanceStatus } from "../types";

export const attendanceApi = {
  mark: (payload: { studentId: string; date: string; status: AttendanceStatus }) =>
    api.post<StudentAttendance>("/attendance", payload),
  listForStudent: (studentId: string) =>
    api.get<StudentAttendance[]>(`/attendance/student/${studentId}`),
  summary: (studentId: string) =>
    api.get<{ total: number; present: number; absent: number; late: number; excused: number }>(
      `/attendance/summary/${studentId}`,
    ),
};

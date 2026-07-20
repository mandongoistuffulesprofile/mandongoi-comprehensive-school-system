import { api } from "../lib/api";
import type { Student, StudentStatus, PaginationInfo } from "../types";

export interface PaginatedStudents {
  data: Student[];
  pagination: PaginationInfo;
}

export const studentsApi = {
  list: (filters?: { grade?: string; status?: StudentStatus }) =>
    api.get<Student[]>("/students", filters as Record<string, string>),
  listPaginated: (filters?: { grade?: string; status?: StudentStatus; page?: number; limit?: number }) =>
    api.getPaginated<Student>("/students", filters as Record<string, string | number>),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (payload: Partial<Student>) => api.post<Student>("/students", payload),
  update: (id: string, payload: Partial<Student>) => api.put<Student>(`/students/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/students/${id}`),
};

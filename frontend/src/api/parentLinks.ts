import { api } from "../lib/api";
import type { ParentStudentLink } from "../types";

export const parentLinksApi = {
  list: (filters?: { userId?: string; studentId?: string }) =>
    api.get<ParentStudentLink[]>("/parent-links", filters as Record<string, string>),
  create: (payload: { userId: string; studentId: string }) =>
    api.post<ParentStudentLink>("/parent-links", payload),
  remove: (id: string) => api.delete<void>(`/parent-links/${id}`),
};

import { api } from "../lib/api";
import type { Paybill } from "../types";

export const paybillsApi = {
  list: () => api.get<Paybill[]>("/paybills"),
  create: (payload: Partial<Paybill>) => api.post<Paybill>("/paybills", payload),
  update: (id: string, payload: Partial<Paybill>) => api.put<Paybill>(`/paybills/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/paybills/${id}`),
};

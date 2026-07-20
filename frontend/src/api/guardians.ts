import { api } from "../lib/api";
import type { Guardian } from "../types";

export const guardiansApi = {
  list: (studentId?: string) =>
    api.get<Guardian[]>("/guardians", { studentId }),
  create: (payload: Partial<Guardian>) =>
    api.post<Guardian>("/guardians", payload),
  createBulk: (studentId: string, guardians: Partial<Guardian>[]) =>
    api.post<Guardian[]>("/guardians/bulk", { studentId, guardians }),
  byPhone: (phone: string) =>
    api.get<Guardian>(`/guardians/phone/${phone}`),
};

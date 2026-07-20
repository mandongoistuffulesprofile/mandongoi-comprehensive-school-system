import { api } from "../lib/api";
import type { SchoolSettings } from "../types";

export const settingsApi = {
  get: () => api.get<SchoolSettings>("/settings"),
  update: (data: Partial<SchoolSettings>) => api.put("/settings", data),
};

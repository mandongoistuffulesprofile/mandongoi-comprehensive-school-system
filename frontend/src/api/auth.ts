import { api } from "../lib/api";
import type { Role, User } from "../types";

export const authApi = {
  register: (payload: { name: string; email: string; phone: string; password: string; role: Role }) =>
    api.post<User>("/auth/register", payload),
};

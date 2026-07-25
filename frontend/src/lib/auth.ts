import { create } from "zustand";
import { api, setToken } from "./api";
import type { User } from "../types";

interface LoginResponse {
  user: User;
  token: string;
}

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "ready";
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "idle",

  login: async (username, password) => {
    const data = await api.post<LoginResponse>("/auth/login", { username, password });
    setToken(data.token);
    set({ user: data.user, status: "ready" });
  },

  logout: () => {
    setToken(null);
    set({ user: null, status: "ready" });
  },

  hydrate: async () => {
    const token = localStorage.getItem("cbc_token");
    if (!token) {
      set({ status: "ready" });
      return;
    }
    set({ status: "loading" });
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, status: "ready" });
    } catch {
      setToken(null);
      set({ user: null, status: "ready" });
    }
  },
}));

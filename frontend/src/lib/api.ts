import type { Envelope, PaginatedResponse } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getToken(): string | null {
  return localStorage.getItem("cbc_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("cbc_token", token);
  else localStorage.removeItem("cbc_token");
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function requestInner<T>(
  path: string,
  options: RequestInit & { query?: Query } = {}
): Promise<{ body: Envelope<T> | PaginatedResponse<T>; res: Response }> {
  const { query, ...rest } = options;
  const token = getToken();
  const isFormData = rest.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && rest.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}/api${path}${buildQuery(query)}`, {
    ...rest,
    headers,
  });

  let body: Envelope<T> | PaginatedResponse<T> | undefined;
  try {
    body = await res.json();
  } catch {
    // no body (e.g. 204)
  }

  if (!res.ok || body?.success === false) {
    if (res.status === 401) {
      setToken(null);
    }
    throw new ApiError((body as any)?.error ?? res.statusText, res.status);
  }

  return { body: body!, res };
}

export const api = {
  get: <T>(path: string, query?: Query) =>
    requestInner<T>(path, { method: "GET", query }).then((r) => (r.body as Envelope<T>).data as T),
  
  getPaginated: <T>(path: string, query?: Query): Promise<PaginatedResult<T>> =>
    requestInner<T[]>(path, { method: "GET", query }).then((r) => {
      const body = r.body as PaginatedResponse<T>;
      return { data: body.data as T[], pagination: body.pagination! };
    }),

  post: <T>(path: string, body?: unknown) =>
    requestInner<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }).then(
      (r) => (r.body as Envelope<T>).data as T
    ),
  upload: <T>(path: string, formData: FormData) =>
    requestInner<T>(path, { method: "POST", body: formData, headers: {} }).then(
      (r) => (r.body as Envelope<T>).data as T
    ),
  
  put: <T>(path: string, body?: unknown) =>
    requestInner<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }).then(
      (r) => (r.body as Envelope<T>).data as T
    ),
  
  patch: <T>(path: string, body?: unknown) =>
    requestInner<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }).then(
      (r) => (r.body as Envelope<T>).data as T
    ),
  
  delete: <T>(path: string) =>
    requestInner<T>(path, { method: "DELETE" }).then((r) => (r.body as Envelope<T>).data as T),
};

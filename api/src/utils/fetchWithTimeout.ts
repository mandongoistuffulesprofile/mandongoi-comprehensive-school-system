import { logger } from './logger';

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  attempt = 1,
): Promise<Response> {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  if (res.ok) return res;
  if (res.status < 500 || attempt >= MAX_RETRIES) return res;
  const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
  logger.warn(`fetchWithRetry: attempt ${attempt} failed (${res.status}), retrying in ${Math.round(delay)}ms`);
  await new Promise((r) => setTimeout(r, delay));
  return fetchWithRetry(url, options, timeoutMs, attempt + 1);
}

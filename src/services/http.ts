/*
 * HTTP client for the admin backend (backend/, /api/v1).
 *
 * - Base URL from VITE_API_BASE_URL (default /api/v1; the Vite dev server proxies /api to the backend).
 * - Sends the JWT as `Authorization: Bearer <token>`; the token lives in sessionStorage (per tab).
 * - Unwraps the backend envelope { success, message, data, meta } and turns failures into ApiError.
 * - A 401 on any authenticated call clears the token and notifies the app (onUnauthorized).
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const TOKEN_KEY = 'amrut_admin_access_token';

export const tokenStore = {
  get: (): string | null => {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token: string) => {
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
  },
  clear: () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
  },
};

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface ErrorDetail { field?: string; message: string }

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /* Human-readable message including field details, for toasts. */
  get fullMessage(): string {
    return this.details.length ? `${this.message}: ${this.details.map((d) => d.message).join('; ')}` : this.message;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export const onUnauthorized = (fn: (() => void) | null) => { unauthorizedHandler = fn; };

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
  error?: { code: string; details?: ErrorDetail[] };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /* Login itself must not trigger the global 401 handler. */
  skipAuthHandling?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: PageMeta; message: string }> {
  const qs = opts.query
    ? '?' + Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : '';
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path + (qs.length > 1 ? qs : ''), {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0, 'NETWORK_ERROR');
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    if (res.status === 401 && !opts.skipAuthHandling) {
      tokenStore.clear();
      unauthorizedHandler?.();
    }
    throw new ApiError(json?.message || res.statusText || 'Request failed', res.status, json?.error?.code ?? 'ERROR', json?.error?.details ?? []);
  }
  return { data: json.data, meta: json.meta, message: json.message };
}

/* Fetch every page of a list endpoint (admin lists are small; capped for safety). */
export async function requestAll<T>(path: string, query: RequestOptions['query'] = {}, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, meta } = await request<T[]>(path, { query: { ...query, page, limit: 100 } });
    out.push(...data);
    if (!meta || page >= meta.totalPages) break;
  }
  return out;
}

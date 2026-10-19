/*
 * The single HTTP client for the admin backend (ADR-0003, ADR-0004). Every API call goes through here.
 *
 * - Base URL from VITE_API_BASE_URL (default /api/v1; the Vite dev server proxies /api to the backend).
 * - Authentication is the backend's HttpOnly session cookie: no token is ever readable by page scripts,
 *   nothing is kept in localStorage or sessionStorage. Requests are sent with credentials.
 * - State-changing requests carry X-CSRF-Token. The CSRF token comes from POST /auth/login or
 *   GET /auth/me and is held in memory only.
 * - Unwraps the envelope { success, message, data, meta } and turns failures into ApiError.
 * - A 401 on an authenticated call notifies the app (onUnauthorized), which shows the login page.
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

let csrfToken: string | null = null;
/* Called by the auth module with the token from login or /auth/me; cleared on logout. */
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface ErrorDetail {
  field?: string;
  message: string;
}

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
export const onUnauthorized = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
  error?: { code: string; details?: ErrorDetail[] };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /* Optional Idempotency-Key for retryable creates (ADR-0005). */
  idempotencyKey?: string;
  /* Login and the initial session check must not trigger the global 401 handler. */
  skipAuthHandling?: boolean;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
  message: string;
}

const queryString = (q?: RequestOptions['query']) => {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const method = opts.method ?? 'GET';
  const isForm = opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path + queryString(opts.query), {
      method,
      credentials: 'include',
      signal: opts.signal,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      /* FormData (file uploads) is sent as multipart; the browser sets its boundary. */
      body: isForm ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0, 'NETWORK_ERROR');
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    if (res.status === 401 && !opts.skipAuthHandling) unauthorizedHandler?.();
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

/* Authenticated file download (e.g. CSV templates): fetched with the session cookie and saved via a temporary link. */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const res = await fetch(API_BASE_URL + path, { credentials: 'include' });
  if (res.status === 401) unauthorizedHandler?.();
  if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status, 'DOWNLOAD_FAILED');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* A fresh key per user action, reused if that action is retried. */
export const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

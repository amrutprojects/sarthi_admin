import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, onUnauthorized, request, requestBlob, setCsrfToken } from '../src/services/api-client';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) } as Response);

afterEach(() => {
  setCsrfToken(null);
  onUnauthorized(null);
  vi.unstubAllGlobals();
});

describe('api-client', () => {
  it('sends the session cookie (credentials) and unwraps the envelope', async () => {
    const fetchMock = respond(200, { success: true, message: 'ok', data: [1, 2], meta: { page: 1, limit: 10, total: 2, totalPages: 1 } });
    vi.stubGlobal('fetch', fetchMock);
    const res = await request<number[]>('/users', { query: { page: 1, search: '', isActive: undefined } });
    expect(res).toEqual({ data: [1, 2], meta: { page: 1, limit: 10, total: 2, totalPages: 1 }, message: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/users?page=1');
    expect(init.credentials).toBe('include');
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('adds X-CSRF-Token and Idempotency-Key on writes, never on reads', async () => {
    const fetchMock = respond(201, { success: true, message: 'created', data: {} });
    vi.stubGlobal('fetch', fetchMock);
    setCsrfToken('csrf-123');
    await request('/roles', { method: 'POST', body: { name: 'x' }, idempotencyKey: 'key-12345678' });
    await request('/roles');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      'X-CSRF-Token': 'csrf-123',
      'Idempotency-Key': 'key-12345678',
      'Content-Type': 'application/json',
    });
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('turns error envelopes into ApiError with code and details', async () => {
    vi.stubGlobal(
      'fetch',
      respond(422, {
        success: false,
        message: 'Validation failed',
        error: { code: 'VALIDATION_ERROR', details: [{ field: 'email', message: 'bad' }] },
      }),
    );
    const err = (await request('/users', { method: 'POST', body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(err.fullMessage).toBe('Validation failed: bad');
  });

  it('notifies the app on 401 (sign out), except when told not to', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    vi.stubGlobal('fetch', respond(401, { success: false, message: 'Authentication required', error: { code: 'UNAUTHORIZED' } }));
    await request('/users').catch(() => undefined);
    await request('/auth/me', { skipAuthHandling: true }).catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/users')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('requestBlob: reads a binary body with the session cookie; 401 notifies the app; errors carry the envelope', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(blob) } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestBlob('/lms/branding/e1/logo', { accept: 'image/png' })).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/lms/branding/e1/logo', expect.objectContaining({ credentials: 'include', headers: { Accept: 'image/png' } }));

    const handler = vi.fn();
    onUnauthorized(handler);
    vi.stubGlobal('fetch', respond(401, { success: false, message: 'Authentication required', error: { code: 'UNAUTHORIZED' } }));
    await expect(requestBlob('/lms/branding/e1/logo')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(handler).toHaveBeenCalledTimes(1);

    vi.stubGlobal('fetch', respond(404, { success: false, message: 'No logo uploaded', error: { code: 'NOT_FOUND' } }));
    await expect(requestBlob('/lms/branding/e1/logo')).rejects.toMatchObject({ status: 404, message: 'No logo uploaded' });
  });
});

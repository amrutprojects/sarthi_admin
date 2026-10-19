import { newIdempotencyKey, request, type PageMeta } from '../../../services/api-client';
import type { MasterConfig } from '../config';
import type { MasterInput, MasterListParams, MasterOption, MasterRecord } from '../types';

/* Master endpoints (backend /api/v1/<regions|castes|document-types|education>). Thin and typed: no state, no UI concerns. */
export const masterApi = {
  async list(m: MasterConfig, params: MasterListParams, signal?: AbortSignal): Promise<{ items: MasterRecord[]; meta: PageMeta }> {
    const { data, meta } = await request<MasterRecord[]>(`/${m.path}`, { query: { ...params }, signal });
    return { items: data, meta: meta ?? { page: 1, limit: params.limit, total: data.length, totalPages: 1 } };
  },

  async options(m: MasterConfig, signal?: AbortSignal): Promise<MasterOption[]> {
    return (await request<MasterOption[]>(`/${m.path}/options`, { signal })).data;
  },

  async get(m: MasterConfig, id: string): Promise<MasterRecord> {
    return (await request<MasterRecord>(`/${m.path}/${id}`)).data;
  },

  /* The idempotency key makes a retried "Create" safe: the record is created once. */
  async create(m: MasterConfig, input: MasterInput, idempotencyKey = newIdempotencyKey()): Promise<MasterRecord> {
    return (await request<MasterRecord>(`/${m.path}`, { method: 'POST', body: input, idempotencyKey })).data;
  },

  async update(m: MasterConfig, id: string, input: MasterInput): Promise<MasterRecord> {
    return (await request<MasterRecord>(`/${m.path}/${id}`, { method: 'PATCH', body: input })).data;
  },

  async setStatus(m: MasterConfig, id: string, isActive: boolean): Promise<MasterRecord> {
    return (await request<MasterRecord>(`/${m.path}/${id}/status`, { method: 'PATCH', body: { isActive } })).data;
  },

  async remove(m: MasterConfig, id: string): Promise<void> {
    await request<null>(`/${m.path}/${id}`, { method: 'DELETE' });
  },
};

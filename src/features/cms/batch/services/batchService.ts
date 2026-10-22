/* Batch Master API (backend /api/v1/cms/batches). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiBatch, BatchOption, CreateBatchInput, UpdateBatchInput } from '../types/batch.types';

const enc = encodeURIComponent;

export interface BatchQuery extends MasterQuery {
  /* '' = no filter. */
  centreId: string;
  batchStatus: string;
  deliveryMode: string;
}

const listParams = (q: BatchQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  centreId: q.centreId || undefined,
  batchStatus: q.batchStatus || undefined,
  deliveryMode: q.deliveryMode || undefined,
});

export interface BatchPage {
  items: ApiBatch[];
  meta?: PageMeta;
}

export interface BatchCountFilters {
  isActive?: 'true' | 'false';
  centreId?: string;
  batchStatus?: string;
}

export const batchService = {
  list: async (q: BatchQuery): Promise<BatchPage> => {
    const { data, meta } = await request<ApiBatch[]>('/cms/batches', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiBatch> => (await request<ApiBatch>(`/cms/batches/${enc(id)}`)).data,

  create: async (input: CreateBatchInput): Promise<ApiBatch> =>
    (await request<ApiBatch>('/cms/batches', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateBatchInput): Promise<ApiBatch> =>
    (await request<ApiBatch>(`/cms/batches/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiBatch> =>
    (await request<ApiBatch>(`/cms/batches/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/batches/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiBatch> =>
    (await request<ApiBatch>(`/cms/batches/${enc(id)}/restore`, { method: 'POST' })).data,

  /*
   * The batches Assign Batch can put a student into: active, lifecycle Open, centre active (the same feed
   * the Assign Batch form uses). Each row carries its centre code.
   */
  assignable: async (): Promise<BatchOption[]> =>
    (await request<BatchOption[]>('/cms/batches/options', { query: { assignable: 'true' } })).data,

  /* How many batches match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: BatchCountFilters = {}): Promise<number> => {
    const { meta } = await request<ApiBatch[]>('/cms/batches', {
      query: {
        page: 1,
        limit: 1,
        isActive: filters.isActive,
        centreId: filters.centreId || undefined,
        batchStatus: filters.batchStatus || undefined,
      },
    });
    return meta?.total ?? 0;
  },
};

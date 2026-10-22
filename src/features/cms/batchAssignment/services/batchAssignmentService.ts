/* Assign Batch API (backend /api/v1/cms/batch-assignments). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { BatchOption } from '../../batch/types/batch.types';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiBatchAssignment, CreateBatchAssignmentInput, StudentOption, UpdateBatchAssignmentInput,
} from '../types/batchAssignment.types';

const enc = encodeURIComponent;

/* The most students the search feed returns (the backend's cap); a result of that size may be cut off. */
export const STUDENT_SEARCH_LIMIT = 20;

export interface BatchAssignmentQuery extends MasterQuery {
  /* '' = no filter. */
  batchId: string;
  centreId: string;
  reasonCode: string;
}

const listParams = (q: BatchAssignmentQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  batchId: q.batchId || undefined,
  centreId: q.centreId || undefined,
  reasonCode: q.reasonCode || undefined,
});

export interface BatchAssignmentPage {
  items: ApiBatchAssignment[];
  meta?: PageMeta;
}

export const batchAssignmentService = {
  list: async (q: BatchAssignmentQuery): Promise<BatchAssignmentPage> => {
    const { data, meta } = await request<ApiBatchAssignment[]>('/cms/batch-assignments', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiBatchAssignment> => (await request<ApiBatchAssignment>(`/cms/batch-assignments/${enc(id)}`)).data,

  create: async (input: CreateBatchAssignmentInput): Promise<ApiBatchAssignment> =>
    (await request<ApiBatchAssignment>('/cms/batch-assignments', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateBatchAssignmentInput): Promise<ApiBatchAssignment> =>
    (await request<ApiBatchAssignment>(`/cms/batch-assignments/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiBatchAssignment> =>
    (await request<ApiBatchAssignment>(`/cms/batch-assignments/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/batch-assignments/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiBatchAssignment> =>
    (await request<ApiBatchAssignment>(`/cms/batch-assignments/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many assignments match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: { isActive?: 'true' | 'false'; batchId?: string; centreId?: string } = {}): Promise<number> => {
    const { meta } = await request<ApiBatchAssignment[]>('/cms/batch-assignments', {
      query: { page: 1, limit: 1, isActive: filters.isActive, batchId: filters.batchId || undefined, centreId: filters.centreId || undefined },
    });
    return meta?.total ?? 0;
  },

  /*
   * Batches a student can be put into: active, lifecycle Open, centre active. masterOptions.batches() is the
   * unfiltered feed (all active batches), so the form asks the same endpoint with ?assignable=true. Each row
   * carries its centre code, so the form knows before saving whether a reason is required.
   */
  assignableBatches: async (): Promise<BatchOption[]> =>
    (await request<BatchOption[]>('/cms/batches/options', { query: { assignable: 'true' } })).data,

  /* Student search for the form: code or name, at least 2 characters, at most STUDENT_SEARCH_LIMIT matches. */
  searchStudents: async (search: string): Promise<StudentOption[]> =>
    (await request<StudentOption[]>('/cms/batch-assignments/student-options', { query: { search } })).data,
};

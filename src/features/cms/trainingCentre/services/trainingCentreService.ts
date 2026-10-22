/* Training Centre Master API (backend /api/v1/cms/training-centres). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiTrainingCentre, CentreCodeSuggestion, CreateTrainingCentreInput, UpdateTrainingCentreInput,
} from '../types/trainingCentre.types';

const enc = encodeURIComponent;

export interface TrainingCentreQuery extends MasterQuery {
  /* '' = no filter. centreTypeId is also the deep link from the Training Centre Type view. */
  centreTypeId: string;
  stateId: string;
  districtId: string;
}

export interface TrainingCentreFilters {
  isActive?: 'true' | 'false';
  centreTypeId?: string;
  stateId?: string;
  districtId?: string;
}

const filterParams = (f: TrainingCentreFilters) => ({
  isActive: f.isActive,
  centreTypeId: f.centreTypeId || undefined,
  stateId: f.stateId || undefined,
  districtId: f.districtId || undefined,
});

/* MasterQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: TrainingCentreQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({ isActive: q.status === '' ? undefined : q.status, centreTypeId: q.centreTypeId, stateId: q.stateId, districtId: q.districtId }),
});

export interface TrainingCentrePage {
  items: ApiTrainingCentre[];
  meta?: PageMeta;
}

export const trainingCentreService = {
  list: async (q: TrainingCentreQuery): Promise<TrainingCentrePage> => {
    const { data, meta } = await request<ApiTrainingCentre[]>('/cms/training-centres', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiTrainingCentre> => (await request<ApiTrainingCentre>(`/cms/training-centres/${enc(id)}`)).data,

  create: async (input: CreateTrainingCentreInput): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>('/cms/training-centres', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateTrainingCentreInput): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(`/cms/training-centres/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(`/cms/training-centres/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/training-centres/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(`/cms/training-centres/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many centres match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: TrainingCentreFilters = {}): Promise<number> => {
    const { meta } = await request<ApiTrainingCentre[]>('/cms/training-centres', { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /*
   * Codes suggested on the form's Centre Code input: the student-import course centres (NAS / Nashik…).
   * Assign Batch asks for a reason whenever a student's preferred centre differs from the batch's centre
   * code, so a centre serving one of these course centres should use its code. Readable by whoever may
   * create or edit a centre.
   */
  codeSuggestions: async (): Promise<CentreCodeSuggestion[]> =>
    (await request<CentreCodeSuggestion[]>('/cms/training-centres/code-suggestions')).data,
};

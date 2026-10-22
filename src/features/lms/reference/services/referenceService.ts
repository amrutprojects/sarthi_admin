/* Reference Data API (backend /api/v1/lms/reference) — read-only: there are no write calls. */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type { ApiReferenceCentre, ApiReferenceDistrict, ApiReferenceTrack, ReferenceSummary } from '../types/reference.types';

export interface ReferencePage<T> {
  items: T[];
  meta?: PageMeta;
}

const listParams = (q: MasterQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
});

const list = async <T>(path: string, q: MasterQuery): Promise<ReferencePage<T>> => {
  const { data, meta } = await request<T[]>(`/lms/reference/${path}`, { query: listParams(q) });
  return { items: data, meta };
};

export const referenceService = {
  /* Per-dataset counts, the Admin Panel's last change of each, and how the data reaches the LMS. */
  summary: async (): Promise<ReferenceSummary> => (await request<ReferenceSummary>('/lms/reference/summary')).data,

  districts: (q: MasterQuery) => list<ApiReferenceDistrict>('districts', q),

  centres: (q: MasterQuery) => list<ApiReferenceCentre>('centres', q),

  tracks: (q: MasterQuery) => list<ApiReferenceTrack>('tracks', q),
};

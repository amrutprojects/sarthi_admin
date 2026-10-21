/* Track Variant Master API (backend /api/v1/lms/track-variants) and the option feeds its screens use. */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import { lmsOptions } from '../../options';
import type {
  ApiOftCard, ApiTrackVariant, CreateTrackVariantInput, CurriculumStatus, ItemPath, ItemRowMap, TrackVariantFormOptions,
  UpdateTrackVariantInput, VariantCourseOption, VariantModuleOption, VariantTrackOption,
} from '../types/trackVariant.types';

const enc = encodeURIComponent;
const BASE = '/lms/track-variants';

export type CompletenessFilter = '' | 'complete' | 'incomplete';

export interface TrackVariantQuery extends MasterQuery {
  /* '' = no filter. `status` (MasterQuery) is the active flag; `variantStatus` the curriculum lifecycle. */
  courseId: string;
  trackId: string;
  variantStatus: '' | CurriculumStatus;
  completeness: CompletenessFilter;
  /* true: ONLY the soft-deleted variants (?deleted=true, the "Show deleted" view, restored from the list). */
  deleted: boolean;
}

export interface TrackVariantFilters {
  isActive?: 'true' | 'false';
  courseId?: string;
  courseModuleId?: string;
  trackId?: string;
  status?: '' | CurriculumStatus;
  completeness?: CompletenessFilter;
}

const filterParams = (f: TrackVariantFilters) => ({
  isActive: f.isActive,
  courseId: f.courseId || undefined,
  courseModuleId: f.courseModuleId || undefined,
  trackId: f.trackId || undefined,
  status: f.status || undefined,
  completeness: f.completeness || undefined,
});

/* MasterQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: TrackVariantQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({
    isActive: q.status === '' ? undefined : q.status,
    courseId: q.courseId,
    trackId: q.trackId,
    status: q.variantStatus,
    completeness: q.completeness,
  }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface TrackVariantPage {
  items: ApiTrackVariant[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

const item = (id: string, path: ItemPath, itemId?: string) => `${BASE}/${enc(id)}/${path}${itemId ? `/${enc(itemId)}` : ''}`;

export const trackVariantService = {
  list: async (q: TrackVariantQuery): Promise<TrackVariantPage> => {
    const { data, meta } = await request<ApiTrackVariant[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  /* The variant with its course, module, track and completeness check. */
  get: async (id: string): Promise<ApiTrackVariant> => (await request<ApiTrackVariant>(`${BASE}/${enc(id)}`)).data,

  create: async (input: CreateTrackVariantInput): Promise<ApiTrackVariant> =>
    (await request<ApiTrackVariant>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateTrackVariantInput): Promise<ApiTrackVariant> =>
    (await request<ApiTrackVariant>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiTrackVariant> =>
    (await request<ApiTrackVariant>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* DRAFT / PUBLISHED → PUBLISHED with its draft OFT cards; 409 with the missing items while incomplete. */
  publish: async (id: string): Promise<ApiTrackVariant> => (await request<ApiTrackVariant>(`${BASE}/${enc(id)}/publish`, { method: 'POST' })).data,

  /* PUBLISHED → RETIRED. */
  retire: async (id: string): Promise<ApiTrackVariant> => (await request<ApiTrackVariant>(`${BASE}/${enc(id)}/retire`, { method: 'POST' })).data,

  /* Archive (soft delete) of a DRAFT variant; its curriculum is kept for a restore. */
  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  /* Brings an archived variant back, inactive. */
  restore: async (id: string): Promise<ApiTrackVariant> => (await request<ApiTrackVariant>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many variants match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: TrackVariantFilters = {}): Promise<number> => {
    const { meta } = await request<ApiTrackVariant[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /* The Module 3 shape and the fixed value lists. */
  formOptions: async (): Promise<TrackVariantFormOptions> => (await request<TrackVariantFormOptions>(`${BASE}/form-options`)).data,

  /* Every variant of one course module (a module has at most one per track, so one page of 100 holds them all). */
  variantsOfModule: async (courseModuleId: string): Promise<ApiTrackVariant[]> =>
    (await request<ApiTrackVariant[]>(BASE, { query: { page: 1, limit: 100, courseModuleId } })).data,

  /* ---- option feeds (src/features/lms/options.ts), typed as the backend answers them ---- */

  /* Active, non-retired courses: { id, code, title, entityId }. */
  courseOptions: (): Promise<VariantCourseOption[]> => lmsOptions.courses(),

  /* The course's Module 3 (active, not retired): { id, courseId, moduleNumber, title }. */
  moduleThreeOptions: (courseId: string): Promise<VariantModuleOption[]> => lmsOptions.modules(courseId, '3'),

  /* Active technology tracks of the Admin Panel (list filter). */
  trackOptions: async (): Promise<VariantTrackOption[]> => lmsOptions.tracks(),

  /*
   * The tracks a variant of this entity's course may use (F-LMS-07-03): the active tracks enabled for the entity
   * (GET /lms/reference/options/tracks?entityId=, readable with lms-track-variants.view).
   */
  tracksForEntity: async (entityId: string): Promise<VariantTrackOption[]> => lmsOptions.tracks(entityId),

  /* ---- curriculum items ---- */

  listItems: async <P extends ItemPath>(id: string, path: P): Promise<ItemRowMap[P][]> => (await request<ItemRowMap[P][]>(item(id, path))).data,

  createItem: async <P extends ItemPath>(id: string, path: P, body: object): Promise<ItemRowMap[P]> =>
    (await request<ItemRowMap[P]>(item(id, path), { method: 'POST', body })).data,

  updateItem: async <P extends ItemPath>(id: string, path: P, itemId: string, body: object): Promise<ItemRowMap[P]> =>
    (await request<ItemRowMap[P]>(item(id, path, itemId), { method: 'PATCH', body })).data,

  removeItem: async (id: string, path: ItemPath, itemId: string): Promise<void> => {
    await request<null>(item(id, path, itemId), { method: 'DELETE' });
  },

  /* F-LMS-29-12: a PUBLISHED card becomes RETIRED (kept, no longer counted). */
  retireOftCard: async (id: string, itemId: string): Promise<ApiOftCard> =>
    (await request<ApiOftCard>(`${item(id, 'oft-cards', itemId)}/retire`, { method: 'POST' })).data,
};

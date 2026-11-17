/* Contact Page Management API (backend /api/v1/cms/contact). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiContactPage,
  ApiCoordinator,
  ApiDistrictOffice,
  CreateCoordinatorInput,
  CreateDistrictOfficeInput,
  UpdateContactPageInput,
  UpdateCoordinatorInput,
  UpdateDistrictOfficeInput,
} from '../types/contact.types';

const enc = encodeURIComponent;

/* MasterQuery to request parameters. An empty status means "any", so it is left off entirely. */
const listParams = (q: MasterQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
});

export interface ContactListPage<T> {
  items: T[];
  meta?: PageMeta;
}

const list = async <T>(path: string, q: MasterQuery): Promise<ContactListPage<T>> => {
  const { data, meta } = await request<T[]>(path, { query: listParams(q) });
  return { items: data, meta };
};

/*
 * Every row of a list, page by page at the backend's largest page size. The pickers need the whole
 * list (which districts are already taken), not the page on screen.
 */
const all = async <T>(path: string, sortBy: string): Promise<T[]> => {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await request<T[]>(path, { query: { page, limit: 100, sortBy, sortOrder: 'asc' } });
    rows.push(...data);
    if (!meta || page >= meta.totalPages || data.length === 0) return rows;
  }
};

const COORDINATORS = '/cms/contact/coordinators';
const OFFICES = '/cms/contact/district-offices';

/*
 * The banner and the two cards are a singleton, so there is no list, no id in the path and no create
 * for them: the row is written once by the database seed and edited from then on. PUT replaces the
 * banner and both cards in one backend transaction. The coordinators and the district offices are
 * records of their own, listed, created, changed and deleted one at a time.
 */
export const contactService = {
  get: async (): Promise<ApiContactPage> => (await request<ApiContactPage>('/cms/contact')).data,

  update: async (input: UpdateContactPageInput): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact', { method: 'PUT', body: input })).data,

  /* Visibility has its own endpoint so it can be toggled without resubmitting the content. */
  setPublished: async (isPublished: boolean): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact/status', { method: 'PATCH', body: { isPublished } })).data,

  /* The "District offices" section's "Show on website" switch, on its own endpoint like publishing. */
  setDistrictOfficesSection: async (show: boolean): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact/district-offices-section', { method: 'PATCH', body: { show } })).data,

  /* ---------------- Division / cluster coordinators ---------------- */

  listCoordinators: (q: MasterQuery) => list<ApiCoordinator>(COORDINATORS, q),

  allCoordinators: () => all<ApiCoordinator>(COORDINATORS, 'displayOrder'),

  getCoordinator: async (id: string): Promise<ApiCoordinator> => (await request<ApiCoordinator>(`${COORDINATORS}/${enc(id)}`)).data,

  createCoordinator: async (input: CreateCoordinatorInput): Promise<ApiCoordinator> =>
    (await request<ApiCoordinator>(COORDINATORS, { method: 'POST', body: input })).data,

  updateCoordinator: async (id: string, input: UpdateCoordinatorInput): Promise<ApiCoordinator> =>
    (await request<ApiCoordinator>(`${COORDINATORS}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setCoordinatorStatus: async (id: string, isActive: boolean): Promise<ApiCoordinator> =>
    (await request<ApiCoordinator>(`${COORDINATORS}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  removeCoordinator: async (id: string): Promise<void> => {
    await request<null>(`${COORDINATORS}/${enc(id)}`, { method: 'DELETE' });
  },

  /* ---------------- District offices ---------------- */

  listDistrictOffices: (q: MasterQuery) => list<ApiDistrictOffice>(OFFICES, q),

  allDistrictOffices: () => all<ApiDistrictOffice>(OFFICES, 'district'),

  getDistrictOffice: async (id: string): Promise<ApiDistrictOffice> => (await request<ApiDistrictOffice>(`${OFFICES}/${enc(id)}`)).data,

  createDistrictOffice: async (input: CreateDistrictOfficeInput): Promise<ApiDistrictOffice> =>
    (await request<ApiDistrictOffice>(OFFICES, { method: 'POST', body: input })).data,

  updateDistrictOffice: async (id: string, input: UpdateDistrictOfficeInput): Promise<ApiDistrictOffice> =>
    (await request<ApiDistrictOffice>(`${OFFICES}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setDistrictOfficeStatus: async (id: string, isActive: boolean): Promise<ApiDistrictOffice> =>
    (await request<ApiDistrictOffice>(`${OFFICES}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  removeDistrictOffice: async (id: string): Promise<void> => {
    await request<null>(`${OFFICES}/${enc(id)}`, { method: 'DELETE' });
  },
};

/* Approved training centres of Contact Page Management (backend /api/v1/cms/contact/training-centres). */
import { request } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiContactPage } from '../types/contact.types';
import type { ApiTrainingCentre, CreateTrainingCentreInput, UpdateTrainingCentreInput } from '../types/trainingCentre.types';
import type { ContactListPage } from './contactService';

const enc = encodeURIComponent;
const CENTRES = '/cms/contact/training-centres';

export const trainingCentreService = {
  /* One page of centres; an empty status means "any". `districtId` narrows it to one district. */
  list: async (q: MasterQuery, districtId = ''): Promise<ContactListPage<ApiTrainingCentre>> => {
    const { data, meta } = await request<ApiTrainingCentre[]>(CENTRES, {
      query: {
        page: q.page,
        limit: q.limit,
        search: q.search || undefined,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        isActive: q.status === '' ? undefined : q.status,
        districtId: districtId || undefined,
      },
    });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiTrainingCentre> => (await request<ApiTrainingCentre>(`${CENTRES}/${enc(id)}`)).data,

  create: async (input: CreateTrainingCentreInput): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(CENTRES, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateTrainingCentreInput): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(`${CENTRES}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiTrainingCentre> =>
    (await request<ApiTrainingCentre>(`${CENTRES}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`${CENTRES}/${enc(id)}`, { method: 'DELETE' });
  },

  /* The "Approved training centres" card's "Show on website" switch, on its own endpoint like publishing. */
  setSection: async (show: boolean): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact/training-centres-section', { method: 'PATCH', body: { show } })).data,
};

/* Advisory Committee Management API (backend /api/v1/cms/advisory-committee). */
import { API_BASE_URL, request } from '../../../../services/api-client';
import type {
  AdvisoryGroupInput,
  AdvisoryMemberInput,
  ApiAdvisoryGroup,
  ApiAdvisoryMember,
  ApiAdvisorySection,
  UpdateAdvisorySectionInput,
} from '../types/advisory.types';

const BASE = '/cms/advisory-committee';
const enc = encodeURIComponent;

/*
 * With a photo the request is multipart: the photo in `photo` and the same JSON in `data`. Without
 * one it is plain JSON. The server accepts either shape on both create and update. The profile lists
 * travel as JSON arrays of items ({ mr: string[], en: string[] }) in both shapes.
 */
const bodyOf = (input: AdvisoryMemberInput, photo: File | null): AdvisoryMemberInput | FormData => {
  if (!photo) return input;
  const form = new FormData();
  form.append('data', JSON.stringify(input));
  form.append('photo', photo, photo.name);
  return form;
};

/* A photo URL from the API is relative to the API base; this makes it loadable by an <img>. */
export const photoSrc = (photoUrl: string | null): string | null => (photoUrl ? API_BASE_URL + photoUrl : null);

export const advisoryService = {
  /* Every Advisory Committee member, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiAdvisoryMember[]> => (await request<ApiAdvisoryMember[]>(BASE)).data,

  get: async (id: string): Promise<ApiAdvisoryMember> => (await request<ApiAdvisoryMember>(`${BASE}/${enc(id)}`)).data,

  create: async (input: AdvisoryMemberInput, photo: File | null): Promise<ApiAdvisoryMember> =>
    (await request<ApiAdvisoryMember>(BASE, { method: 'POST', body: bodyOf(input, photo) })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: AdvisoryMemberInput, photo: File | null): Promise<ApiAdvisoryMember> =>
    (await request<ApiAdvisoryMember>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: bodyOf(input, photo) })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiAdvisoryMember> =>
    (await request<ApiAdvisoryMember>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted an Advisory Committee member meanwhile. */
  reorder: async (ids: string[]): Promise<ApiAdvisoryMember[]> =>
    (await request<ApiAdvisoryMember[]>(`${BASE}/order`, { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiAdvisorySection> => (await request<ApiAdvisorySection>(`${BASE}/settings`)).data,

  updateSection: async (input: UpdateAdvisorySectionInput): Promise<ApiAdvisorySection> =>
    (await request<ApiAdvisorySection>(`${BASE}/settings`, { method: 'PUT', body: input })).data,

  /* Groups — the headings Advisory Committee members are listed under on the website. Every group, hidden ones included, in display order. */
  listGroups: async (): Promise<ApiAdvisoryGroup[]> => (await request<ApiAdvisoryGroup[]>(`${BASE}/groups`)).data,

  createGroup: async (input: AdvisoryGroupInput): Promise<ApiAdvisoryGroup> =>
    (await request<ApiAdvisoryGroup>(`${BASE}/groups`, { method: 'POST', body: input })).data,

  /* Partial, like the Advisory Committee member update, with the version the form was opened at. */
  updateGroup: async (id: string, input: AdvisoryGroupInput): Promise<ApiAdvisoryGroup> =>
    (await request<ApiAdvisoryGroup>(`${BASE}/groups/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setGroupStatus: async (id: string, isActive: boolean): Promise<ApiAdvisoryGroup> =>
    (await request<ApiAdvisoryGroup>(`${BASE}/groups/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* The group's Advisory Committee members are kept, without a group; the server says how many that was. */
  removeGroup: async (id: string): Promise<{ membersUngrouped: number }> =>
    (await request<{ membersUngrouped: number }>(`${BASE}/groups/${enc(id)}`, { method: 'DELETE' })).data,

  /* Every group in its new order, by id; a 409 means a group was added or deleted meanwhile. */
  reorderGroups: async (ids: string[]): Promise<ApiAdvisoryGroup[]> =>
    (await request<ApiAdvisoryGroup[]>(`${BASE}/groups/order`, { method: 'PUT', body: { ids } })).data,
};

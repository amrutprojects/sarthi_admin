/* Announcements API (backend /api/v1/cms/announcements). */
import { request } from '../../../../services/api-client';
import type {
  AnnouncementInput,
  ApiAnnouncement,
  ApiAnnouncementsSection,
  UpdateAnnouncementsSectionInput,
} from '../types/announcements.types';

const enc = encodeURIComponent;

export const announcementsService = {
  /* Every announcement, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiAnnouncement[]> => (await request<ApiAnnouncement[]>('/cms/announcements')).data,

  get: async (id: string): Promise<ApiAnnouncement> => (await request<ApiAnnouncement>(`/cms/announcements/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the announcement twice.
   */
  create: async (input: AnnouncementInput, idempotencyKey: string): Promise<ApiAnnouncement> =>
    (await request<ApiAnnouncement>('/cms/announcements', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: AnnouncementInput): Promise<ApiAnnouncement> =>
    (await request<ApiAnnouncement>(`/cms/announcements/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiAnnouncement> =>
    (await request<ApiAnnouncement>(`/cms/announcements/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/announcements/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted an announcement meanwhile. */
  reorder: async (ids: string[]): Promise<ApiAnnouncement[]> =>
    (await request<ApiAnnouncement[]>('/cms/announcements/order', { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiAnnouncementsSection> => (await request<ApiAnnouncementsSection>('/cms/announcements/settings')).data,

  updateSection: async (input: UpdateAnnouncementsSectionInput): Promise<ApiAnnouncementsSection> =>
    (await request<ApiAnnouncementsSection>('/cms/announcements/settings', { method: 'PUT', body: input })).data,
};

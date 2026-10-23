/* Board Members Management API (backend /api/v1/cms/board-members). */
import { API_BASE_URL, request } from '../../../../services/api-client';
import type { ApiBoardMember, ApiBoardSection, BoardMemberInput, UpdateBoardSectionInput } from '../types/board.types';

const enc = encodeURIComponent;

/*
 * With a photo the request is multipart: the photo in `photo` and the same JSON in `data`. Without
 * one it is plain JSON. The server accepts either shape on both create and update.
 */
const bodyOf = (input: BoardMemberInput, photo: File | null): BoardMemberInput | FormData => {
  if (!photo) return input;
  const form = new FormData();
  form.append('data', JSON.stringify(input));
  form.append('photo', photo, photo.name);
  return form;
};

/* A photo URL from the API is relative to the API base; this makes it loadable by an <img>. */
export const photoSrc = (photoUrl: string | null): string | null => (photoUrl ? API_BASE_URL + photoUrl : null);

export const boardService = {
  /* Every member, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiBoardMember[]> => (await request<ApiBoardMember[]>('/cms/board-members')).data,

  get: async (id: string): Promise<ApiBoardMember> => (await request<ApiBoardMember>(`/cms/board-members/${enc(id)}`)).data,

  create: async (input: BoardMemberInput, photo: File | null): Promise<ApiBoardMember> =>
    (await request<ApiBoardMember>('/cms/board-members', { method: 'POST', body: bodyOf(input, photo) })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: BoardMemberInput, photo: File | null): Promise<ApiBoardMember> =>
    (await request<ApiBoardMember>(`/cms/board-members/${enc(id)}`, { method: 'PATCH', body: bodyOf(input, photo) })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiBoardMember> =>
    (await request<ApiBoardMember>(`/cms/board-members/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/board-members/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a member meanwhile. */
  reorder: async (ids: string[]): Promise<ApiBoardMember[]> =>
    (await request<ApiBoardMember[]>('/cms/board-members/order', { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiBoardSection> => (await request<ApiBoardSection>('/cms/board-members/settings')).data,

  updateSection: async (input: UpdateBoardSectionInput): Promise<ApiBoardSection> =>
    (await request<ApiBoardSection>('/cms/board-members/settings', { method: 'PUT', body: input })).data,
};

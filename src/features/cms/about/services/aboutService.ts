/* About AMRUT Management API (backend /api/v1/cms/about). */
import { request } from '../../../../services/api-client';
import { KINDS } from '../constants';
import type {
  AboutItem,
  AboutKind,
  ApiAbout,
  ApiAboutCard,
  ApiAboutFact,
  ApiAboutSection,
  Bilingual,
  UpdateAboutSectionInput,
} from '../types/about.types';

const enc = encodeURIComponent;

/* A row or a card in the shape the shared form and list edit. */
export const toItem = (kind: AboutKind, r: ApiAboutFact | ApiAboutCard): AboutItem =>
  kind === 'facts'
    ? { ...base(r), first: (r as ApiAboutFact).label, second: (r as ApiAboutFact).value, isRequired: false }
    : {
        ...base(r),
        first: (r as ApiAboutCard).heading,
        second: (r as ApiAboutCard).description,
        isRequired: (r as ApiAboutCard).isRequired,
      };
const base = (r: ApiAboutFact | ApiAboutCard) => ({
  id: r.id,
  displayOrder: r.displayOrder,
  isActive: r.isActive,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

/* The request body for a row or card: the two texts under the names the API uses (label/value, heading/description). */
export interface ItemInput {
  first?: Bilingual;
  second?: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
  expectedUpdatedAt?: string;
}
const bodyOf = (kind: AboutKind, { first, second, ...rest }: ItemInput) => ({
  ...(first ? { [KINDS[kind].first.key]: first } : {}),
  ...(second ? { [KINDS[kind].second.key]: second } : {}),
  ...rest,
});

export const aboutService = {
  /* The section with every row and card, hidden ones included, in display order. */
  get: async (): Promise<ApiAbout> => (await request<ApiAbout>('/cms/about')).data,

  /* A partial update: only the keys sent change. */
  updateSection: async (input: UpdateAboutSectionInput): Promise<ApiAboutSection> =>
    (await request<ApiAboutSection>('/cms/about/settings', { method: 'PATCH', body: input })).data,

  getItem: async (kind: AboutKind, id: string): Promise<AboutItem> =>
    toItem(kind, (await request<ApiAboutFact | ApiAboutCard>(`/cms/about/${kind}/${enc(id)}`)).data),

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of it (a double click, a lost
   * response) is answered with the first result instead of adding the record twice.
   */
  createItem: async (kind: AboutKind, input: ItemInput, idempotencyKey: string): Promise<AboutItem> =>
    toItem(
      kind,
      (await request<ApiAboutFact | ApiAboutCard>(`/cms/about/${kind}`, { method: 'POST', body: bodyOf(kind, input), idempotencyKey }))
        .data,
    ),

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  updateItem: async (kind: AboutKind, id: string, input: ItemInput): Promise<AboutItem> =>
    toItem(
      kind,
      (await request<ApiAboutFact | ApiAboutCard>(`/cms/about/${kind}/${enc(id)}`, { method: 'PATCH', body: bodyOf(kind, input) })).data,
    ),

  setItemStatus: async (kind: AboutKind, id: string, isActive: boolean): Promise<void> => {
    await request(`/cms/about/${kind}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } });
  },

  removeItem: async (kind: AboutKind, id: string): Promise<void> => {
    await request<null>(`/cms/about/${kind}/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a record meanwhile. */
  reorder: async (kind: AboutKind, ids: string[]): Promise<void> => {
    await request(`/cms/about/${kind}/order`, { method: 'PUT', body: { ids } });
  },
};

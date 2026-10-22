/* Branding and Settings API (backend /api/v1/lms/branding/:entityId). View and update only: no create, no delete. */
import { request, requestAll, requestBlob } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import type {
  ApiBranding, BrandingEntityChoice, BrandingLanguageOptions, BrandingQuery, UpdateBrandingInput,
} from '../types/branding.types';

const enc = encodeURIComponent;
const BASE = '/lms/branding';

interface EntityRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export const brandingService = {
  /* The entity's settings, each with its value, effective value and catalogue metadata (lms-branding.view). */
  get: async (entityId: string, q: BrandingQuery = {}): Promise<ApiBranding> =>
    (await request<ApiBranding>(`${BASE}/${enc(entityId)}`, { query: { search: q.search || undefined, group: q.group || undefined } })).data,

  /* Any subset of the catalogue keys (lms-branding.update). Answers with the whole updated view. */
  update: async (entityId: string, input: UpdateBrandingInput): Promise<ApiBranding> =>
    (await request<ApiBranding>(`${BASE}/${enc(entityId)}`, { method: 'PATCH', body: input })).data,

  /* F-LMS-04-02: one PNG in the multipart field "file"; nothing else is accepted in the form. */
  uploadLogo: async (entityId: string, file: File): Promise<ApiBranding> => {
    const fd = new FormData();
    fd.append('file', file);
    return (await request<ApiBranding>(`${BASE}/${enc(entityId)}/logo`, { method: 'PUT', body: fd })).data;
  },

  /* Back to the platform default logo. */
  removeLogo: async (entityId: string): Promise<ApiBranding> =>
    (await request<ApiBranding>(`${BASE}/${enc(entityId)}/logo`, { method: 'DELETE' })).data,

  /*
   * The logo file, streamed only to authenticated viewers, through the client's binary read (session cookie, the
   * app-wide 401 handling, the server's JSON error on failure). The page shows it through an object URL: a plain
   * <img src> to the API would not be allowed to carry the session in every deployment.
   */
  logoBlob: (entityId: string, signal?: AbortSignal): Promise<Blob> =>
    requestBlob(`${BASE}/${enc(entityId)}/logo`, { signal, accept: 'image/png' }),

  /* The platform languages (To Be Confirmed, OQ-023); open to lms-branding.view / .update. */
  languages: async (): Promise<BrandingLanguageOptions> => {
    const { data } = await request<BrandingLanguageOptions>('/lms/entities/form-options');
    return { languages: data.languages, languagesConfirmed: data.languagesConfirmed };
  },

  /*
   * The entities whose branding can be opened, A to Z. With Entity Master view access the full list is read
   * (inactive entities can be configured before they are activated); otherwise the entity picker feed, which
   * the backend opens to lms-branding.view and which offers active entities only.
   */
  entities: async (includeInactive: boolean): Promise<BrandingEntityChoice[]> => {
    if (includeInactive) {
      const rows = await requestAll<EntityRow>('/lms/entities', { sortBy: 'name', sortOrder: 'asc' });
      return rows.map((e) => ({ id: e.id, name: e.name, code: e.code, isActive: e.isActive }));
    }
    const rows = await lmsOptions.entities();
    return rows.map((e) => ({ id: e.id, name: e.name, code: e.code ?? '', isActive: true }));
  },
};

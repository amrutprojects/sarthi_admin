/* Document Master API (backend /api/v1/cms/documents). Create and update are multipart: the file travels with the metadata. */
import { downloadFile, request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiDocument, CreateDocumentInput, DocumentCategory, UpdateDocumentInput, VerificationStatus, VerifyDocumentInput,
} from '../types/document.types';

const enc = encodeURIComponent;

export interface DocumentQuery extends MasterQuery {
  /* '' = any. */
  category: '' | DocumentCategory;
  verificationStatus: '' | VerificationStatus;
  /* Documents linked to a district of this state. */
  stateId: string;
  districtId: string;
  centreId: string;
}

const listParams = (q: DocumentQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  category: q.category || undefined,
  verificationStatus: q.verificationStatus || undefined,
  stateId: q.stateId || undefined,
  districtId: q.districtId || undefined,
  centreId: q.centreId || undefined,
});

export interface DocumentPage {
  items: ApiDocument[];
  meta?: PageMeta;
}

/*
 * Multipart body. Only defined values are appended (an absent key leaves the column alone on update);
 * null is sent as '' so the server clears that optional value; booleans travel as 'true' / 'false'.
 */
function toFormData(input: Record<string, string | boolean | File | null | undefined>): FormData {
  const fd = new FormData();
  let file: File | undefined;
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (value instanceof File) file = value;
    else if (typeof value === 'boolean') fd.append(key, value ? 'true' : 'false');
    else fd.append(key, value ?? '');
  }
  /* The file goes last, after the text fields it is described by. */
  if (file) fd.append('file', file, file.name);
  return fd;
}

export const documentService = {
  list: async (q: DocumentQuery): Promise<DocumentPage> => {
    const { data, meta } = await request<ApiDocument[]>('/cms/documents', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiDocument> => (await request<ApiDocument>(`/cms/documents/${enc(id)}`)).data,

  create: async (input: CreateDocumentInput): Promise<ApiDocument> =>
    (await request<ApiDocument>('/cms/documents', { method: 'POST', body: toFormData({ ...input }) })).data,

  update: async (id: string, input: UpdateDocumentInput): Promise<ApiDocument> =>
    (await request<ApiDocument>(`/cms/documents/${enc(id)}`, { method: 'PATCH', body: toFormData({ ...input }) })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiDocument> =>
    (await request<ApiDocument>(`/cms/documents/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /*
   * Verify or reject (cms-documents.approve). The server refuses it for the person who uploaded the current
   * file, and with 409 when input.sha256 is no longer the current file.
   */
  verify: async (id: string, input: VerifyDocumentInput): Promise<ApiDocument> =>
    (await request<ApiDocument>(`/cms/documents/${enc(id)}/verification`, { method: 'PATCH', body: input })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/documents/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiDocument> =>
    (await request<ApiDocument>(`/cms/documents/${enc(id)}/restore`, { method: 'POST' })).data,

  /* The private file, fetched with the session cookie and saved under its original name. */
  download: (id: string, fileName: string): Promise<void> => downloadFile(`/cms/documents/${enc(id)}/file`, fileName),

  /* How many documents match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (
    filters: {
      verificationStatus?: VerificationStatus;
      stateId?: string;
      districtId?: string;
      centreId?: string;
      isActive?: 'true' | 'false';
    } = {},
  ): Promise<number> => {
    const { meta } = await request<ApiDocument[]>('/cms/documents', {
      query: {
        page: 1,
        limit: 1,
        verificationStatus: filters.verificationStatus,
        stateId: filters.stateId || undefined,
        districtId: filters.districtId || undefined,
        centreId: filters.centreId || undefined,
        isActive: filters.isActive,
      },
    });
    return meta?.total ?? 0;
  },
};

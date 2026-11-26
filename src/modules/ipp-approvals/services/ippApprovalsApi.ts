import { downloadFile, request, requestAll, requestBlob, type PageMeta, type RequestOptions } from '../../../services/api-client';
import type {
  ApplicationDetail,
  ApplicationListQuery,
  ApplicationRow,
  ApprovalSummary,
  ApproveResult,
  BatchListQuery,
  BatchRow,
  District,
  HeadOfficeChange,
  HeadOfficeState,
  LinkState,
  Officer,
  OfficersResult,
} from '../types/ippApprovals.types';

/* Every call of the IPP approvals (sarthi-api docs/ipp-approvals.md). Thin and typed: no state, no UI concerns. */
const BASE = '/ipp-approvals';
/* The batch filter offers at most this many pages of 100 batches. */
const BATCH_OPTION_PAGES = 10;

const documentPath = (id: string, code: string) => `${BASE}/applications/${id}/documents/${encodeURIComponent(code)}`;

async function list<T>(path: string, query: NonNullable<RequestOptions['query']> & { limit: number }, signal?: AbortSignal) {
  const { data, meta } = await request<T[]>(path, { query, signal });
  const fallback: PageMeta = { page: 1, limit: query.limit, total: data.length, totalPages: 1 };
  return { items: data, meta: meta ?? fallback };
}

/* The body of an approval: the reason only when there is one. */
const withReason = (reason: string | null) => (reason ? { reason } : {});

export const ippApprovalsApi = {
  summary: async () => (await request<ApprovalSummary>(`${BASE}/summary`)).data,
  districts: async () => (await request<District[]>(`${BASE}/districts`)).data,

  applications: (query: ApplicationListQuery, signal?: AbortSignal) => list<ApplicationRow>(`${BASE}/applications`, { ...query }, signal),
  application: async (id: string) => (await request<ApplicationDetail>(`${BASE}/applications/${id}`)).data,
  /* Streamed from IPP: 502 while IPP cannot be reached, 503 while the link is not configured. */
  documentBlob: (id: string, code: string, signal?: AbortSignal) => requestBlob(documentPath(id, code), { signal }),
  downloadDocument: (id: string, code: string, fileName: string) => downloadFile(documentPath(id, code), fileName),

  /*
   * A second approval needs its reason (3–500 characters; 422 without it), one for all the applications approved together;
   * null = none (a first approval).
   */
  approve: async (ids: string[], reason: string | null) =>
    (await request<ApproveResult>(`${BASE}/approve`, { method: 'POST', body: { ids, ...withReason(reason) } })).data,
  approveBatch: async (batchId: string, reason: string | null) =>
    (await request<ApproveResult>(`${BASE}/batches/${batchId}/approve`, { method: 'POST', body: withReason(reason) })).data,
  /* Both answer 409 NOT_YOURS_TO_DECIDE when the application has moved on in the meantime. */
  approveOne: async (id: string, reason: string | null) =>
    (await request<ApplicationDetail>(`${BASE}/applications/${id}/approve`, { method: 'POST', body: withReason(reason) })).data,
  reject: async (id: string, reason: string) =>
    (await request<ApplicationDetail>(`${BASE}/applications/${id}/reject`, { method: 'POST', body: { reason } })).data,

  batches: (query: BatchListQuery, signal?: AbortSignal) => list<BatchRow>(`${BASE}/batches`, { ...query }, signal),
  batch: async (id: string) => (await request<BatchRow>(`${BASE}/batches/${id}`)).data,
  batchOptions: (districtId?: string) =>
    requestAll<BatchRow>(`${BASE}/batches`, { districtId, sortBy: 'receivedAt', sortOrder: 'DESC' }, BATCH_OPTION_PAGES),

  officers: async () => (await request<OfficersResult>(`${BASE}/officers`)).data,
  setOfficerDistricts: async (userId: string, districtIds: string[]) =>
    (await request<Officer>(`${BASE}/officers/${userId}/districts`, { method: 'PUT', body: { districtIds } })).data,

  headOffice: async () => (await request<HeadOfficeState>(`${BASE}/head-office`)).data,
  setHeadOffice: async (enabled: boolean) =>
    (await request<HeadOfficeChange>(`${BASE}/head-office`, { method: 'PUT', body: { enabled } })).data,

  link: async () => (await request<LinkState>(`${BASE}/link`)).data,
  /* No ids = every failed decision. */
  retryLink: async (ids?: string[]) =>
    (await request<{ retried: number }>(`${BASE}/link/retry`, { method: 'POST', body: ids ? { ids } : {} })).data,
  testLink: async () => (await request<{ ok: boolean; message: string }>(`${BASE}/link/test`, { method: 'POST' })).data,
};

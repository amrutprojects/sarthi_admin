import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiClientModule from '../../../services/api-client';
import { downloadFile, request, requestAll, requestBlob } from '../../../services/api-client';
import { eventLabel, plural, stageAfterApproval, stageAfterRejection, stageMove, whoLabel } from '../labels';
import { officerDistrictsSchema, rejectSchema } from '../schemas/ippApprovalsSchema';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import { fieldText, fileSize, fmtDay } from '../utils';
import { event } from './fixtures';

vi.mock('../../../services/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  request: vi.fn(),
  requestAll: vi.fn(),
  requestBlob: vi.fn(),
  downloadFile: vi.fn(),
}));
const call = () => vi.mocked(request).mock.lastCall;

beforeEach(() => {
  vi.mocked(request).mockReset().mockResolvedValue({ data: [], message: '' });
});

describe('ippApprovalsApi — paths and bodies of the specification', () => {
  it('reads lists with their query and meta', async () => {
    const meta = { page: 2, limit: 25, total: 60, totalPages: 3 };
    vi.mocked(request).mockResolvedValue({ data: [{ id: 'a' }], meta, message: '' });
    const signal = new AbortController().signal;
    const query = { page: 2, limit: 25, view: 'TO_DECIDE' as const, search: 'asha' };
    expect(await ippApprovalsApi.applications(query, signal)).toEqual({ items: [{ id: 'a' }], meta });
    expect(call()).toEqual(['/ipp-approvals/applications', { query, signal }]);
    vi.mocked(request).mockResolvedValue({ data: [], message: '' });
    expect((await ippApprovalsApi.batches({ page: 1, limit: 25 })).meta).toEqual({ page: 1, limit: 25, total: 0, totalPages: 1 });
    expect(call()?.[0]).toBe('/ipp-approvals/batches');
  });

  it.each([
    ['summary', () => ippApprovalsApi.summary(), ['/ipp-approvals/summary']],
    ['districts', () => ippApprovalsApi.districts(), ['/ipp-approvals/districts']],
    ['one application', () => ippApprovalsApi.application('a'), ['/ipp-approvals/applications/a']],
    ['one batch', () => ippApprovalsApi.batch('b'), ['/ipp-approvals/batches/b']],
    [
      'bulk approve',
      () => ippApprovalsApi.approve(['a', 'b'], 'why'),
      ['/ipp-approvals/approve', { method: 'POST', body: { ids: ['a', 'b'], reason: 'why' } }],
    ],
    [
      'batch approve',
      () => ippApprovalsApi.approveBatch('b', 'why'),
      ['/ipp-approvals/batches/b/approve', { method: 'POST', body: { reason: 'why' } }],
    ],
    [
      'approve one',
      () => ippApprovalsApi.approveOne('a', 'why'),
      ['/ipp-approvals/applications/a/approve', { method: 'POST', body: { reason: 'why' } }],
    ],
    [
      'approve one, a first approval',
      () => ippApprovalsApi.approveOne('a', null),
      ['/ipp-approvals/applications/a/approve', { method: 'POST', body: {} }],
    ],
    [
      'bulk approve, first approvals',
      () => ippApprovalsApi.approve(['a'], null),
      ['/ipp-approvals/approve', { method: 'POST', body: { ids: ['a'] } }],
    ],
    [
      'reject one',
      () => ippApprovalsApi.reject('a', 'why'),
      ['/ipp-approvals/applications/a/reject', { method: 'POST', body: { reason: 'why' } }],
    ],
    ['officers', () => ippApprovalsApi.officers(), ['/ipp-approvals/officers']],
    [
      'officer districts',
      () => ippApprovalsApi.setOfficerDistricts('u', ['d']),
      ['/ipp-approvals/officers/u/districts', { method: 'PUT', body: { districtIds: ['d'] } }],
    ],
    ['head office', () => ippApprovalsApi.headOffice(), ['/ipp-approvals/head-office']],
    [
      'head office switch',
      () => ippApprovalsApi.setHeadOffice(false),
      ['/ipp-approvals/head-office', { method: 'PUT', body: { enabled: false } }],
    ],
    ['link', () => ippApprovalsApi.link(), ['/ipp-approvals/link']],
    ['retry some', () => ippApprovalsApi.retryLink(['x']), ['/ipp-approvals/link/retry', { method: 'POST', body: { ids: ['x'] } }]],
    ['retry all', () => ippApprovalsApi.retryLink(), ['/ipp-approvals/link/retry', { method: 'POST', body: {} }]],
    ['test', () => ippApprovalsApi.testLink(), ['/ipp-approvals/link/test', { method: 'POST' }]],
  ])('%s', async (_name, run, expected) => {
    await run();
    expect(call()).toEqual(expected);
  });

  it('streams documents by their code, encoded', async () => {
    const signal = new AbortController().signal;
    await ippApprovalsApi.documentBlob('a', 'CASTE CERT', signal);
    expect(requestBlob).toHaveBeenCalledWith('/ipp-approvals/applications/a/documents/CASTE%20CERT', { signal });
    await ippApprovalsApi.downloadDocument('a', 'PHOTO', 'photo.png');
    expect(downloadFile).toHaveBeenCalledWith('/ipp-approvals/applications/a/documents/PHOTO', 'photo.png');
  });

  it('offers the batches of a district, newest first', async () => {
    await ippApprovalsApi.batchOptions('d');
    expect(requestAll).toHaveBeenCalledWith('/ipp-approvals/batches', { districtId: 'd', sortBy: 'receivedAt', sortOrder: 'DESC' }, 10);
  });
});

describe('wording and rules', () => {
  it('knows where a decision sends an application', () => {
    expect(stageAfterApproval('DIVISION', true)).toBe('COEP');
    expect(stageAfterApproval('COEP', true)).toBe('HEAD_OFFICE');
    expect(stageAfterApproval('COEP', false)).toBe('SUPER_ADMIN');
    expect(stageAfterApproval('HEAD_OFFICE', true)).toBe('APPROVED');
    expect(stageAfterApproval('SUPER_ADMIN', false)).toBe('APPROVED');
    expect(stageAfterApproval('AUDITOR', true)).toBeNull();
    expect(stageAfterRejection('DIVISION')).toBe('AUDITOR');
    expect(stageAfterRejection('COEP')).toBe('DIVISION');
    expect(stageAfterRejection('HEAD_OFFICE')).toBe('COEP');
    expect(stageAfterRejection('SUPER_ADMIN')).toBe('COEP');
    expect(stageAfterRejection('APPROVED')).toBeNull();
  });

  it('words events, moves, people and counts', () => {
    expect(eventLabel('MOVED')).toBe('Moved: Head Office approval was switched');
    expect(eventLabel('SOMETHING_NEW')).toBe('Something New');
    expect(stageMove(event({ from: 'HEAD_OFFICE', to: 'SUPER_ADMIN' }))).toBe('Head Office → Super Admin');
    expect(stageMove(event())).toBe('Divisional Officer');
    expect(whoLabel({ by: 'IPP', role: null })).toBe('IPP');
    expect(whoLabel({ by: 'Meera', role: 'COEP' })).toBe('Meera (COEP)');
    expect(plural(1, 'application')).toBe('1 application');
    expect(plural(1500, 'application')).toBe('1,500 applications');
  });

  it('reads field texts, days and file sizes', () => {
    expect(fieldText({ type: 'TEXT', text: '2024-06' })).toBe('2024-06');
    expect(fieldText({ type: 'MONTH', text: 'not a month' })).toBe('not a month');
    expect(fieldText({ type: 'DATE', text: '' })).toBe('—');
    expect(fmtDay('soon')).toBe('soon');
    expect(fileSize(100)).toBe('1 KB');
  });

  it('wants a reason of 3 to 500 characters after trimming', () => {
    expect(rejectSchema.safeParse({ reason: '  ab  ' }).success).toBe(false);
    expect(rejectSchema.parse({ reason: '  abc  ' })).toEqual({ reason: 'abc' });
    expect(rejectSchema.safeParse({ reason: 'x'.repeat(500) }).success).toBe(true);
    expect(rejectSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });

  it('takes 0 to 200 districts', () => {
    const ids = (n: number) => ({ districtIds: Array.from({ length: n }, (_, i) => String(i)) });
    expect(officerDistrictsSchema.safeParse(ids(0)).success).toBe(true);
    expect(officerDistrictsSchema.safeParse(ids(200)).success).toBe(true);
    expect(officerDistrictsSchema.safeParse(ids(201)).success).toBe(false);
  });
});

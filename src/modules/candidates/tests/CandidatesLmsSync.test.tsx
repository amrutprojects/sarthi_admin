import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { request } from '../../../services/api-client';
import { studentApi, type StudentListItem } from '../../students';
import CandidatesPage from '../pages/CandidatesPage';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));
/* The lms-sync module's calls all go through request(); answer them per path. */
vi.mock('../../../services/api-client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  request: vi.fn(),
}));

const row = (over: Partial<StudentListItem> = {}): StudentListItem => ({
  id: 's1',
  code: 'STU-000001',
  sourceRecordId: 'MA-0001',
  name: 'Asha Patil',
  centreCode: 'PUN',
  centreName: 'Pune',
  trackCode: 'T07',
  trackName: 'Data Analytics',
  trackToBeConfirmed: false,
  status: 'RECEIVED',
  mobile: '******3210',
  email: 'a***@example.com',
  aadhaar: 'XXXX XXXX 1234',
  approvedAt: '2026-10-01T05:00:00.000Z',
  importBatchId: 'b1',
  createdAt: '2026-10-20T05:00:00.000Z',
  source: 'IMPORT',
  registrationNumber: null,
  enrolled: false,
  batch: null,
  lmsSync: { status: 'FAILED', lmsLearnerCode: null, lastSyncedAt: null },
  ...over,
});
const rows = [row(), row({ id: 's2', code: 'STU-000002', name: 'Ravi Kale', lmsSync: null })];

let statusAnswer: () => unknown;
const bulk = vi.fn();
beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  granted = new Set(['viewLmsSync', 'pushLmsSync']);
  statusAnswer = () => ({ data: { enabled: true, lmsTenantCode: 'AMRUT', counts: { FAILED: 4, SYNCED: 10 } }, message: '' });
  bulk.mockReset().mockResolvedValue({ data: { queued: 2, skipped: [] }, message: '' });
  vi.mocked(request).mockImplementation(async (path: string, opts?: { body?: unknown }) => {
    if (path === '/lms-sync/status') return statusAnswer() as never;
    if (path === '/lms-sync/push') return bulk(opts?.body) as never;
    throw new Error('unexpected ' + path);
  });
  vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
  vi.spyOn(studentApi, 'list').mockResolvedValue({ items: rows, meta: { page: 1, limit: 25, total: 2, totalPages: 1 } });
});
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/candidates" element={<CandidatesPage />} />
    </Routes>,
    { route },
  );
const lastList = () => vi.mocked(studentApi.list).mock.lastCall?.[0];

describe('CandidatesPage — M1 LMS sync', () => {
  it('adds the sync flag column and a flag filter with counts', async () => {
    renderAt('/candidates');
    expect(await screen.findByRole('columnheader', { name: 'LMS sync' })).toBeInTheDocument();
    const asha = (await screen.findByText('Asha Patil')).closest('tr')!;
    expect(within(asha).getByText('Failed')).toBeInTheDocument();
    expect(within(screen.getByText('Ravi Kale').closest('tr')!).getByText('Not synced')).toBeInTheDocument();

    const filter = screen.getByLabelText('LMS sync');
    expect(within(filter).getByRole('option', { name: 'Failed (4)' })).toBeInTheDocument();
    await userEvent.selectOptions(filter, 'FAILED');
    await waitFor(() => expect(lastList()).toMatchObject({ lmsSyncStatus: 'FAILED' }));
  });

  it('reads the flag filter from the URL', async () => {
    renderAt('/candidates?sync=REVIEW');
    await waitFor(() => expect(lastList()).toMatchObject({ lmsSyncStatus: 'REVIEW' }));
  });

  it('pushes the selected students to the LMS after a confirmation', async () => {
    renderAt('/candidates');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select STU-000001' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select STU-000002' }));
    const bar = screen.getByRole('group', { name: 'LMS bulk actions' });
    expect(within(bar).getByText('2')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Push to LMS' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Push to LMS' }));
    await waitFor(() => expect(bulk).toHaveBeenCalledWith({ studentIds: ['s1', 's2'] }));
    await waitFor(() => expect(within(bar).getByText('0')).toBeInTheDocument());
  });

  it('shows flags but no selection or push without lms-sync.update', async () => {
    granted = new Set(['viewLmsSync']);
    renderAt('/candidates');
    expect(await screen.findByRole('columnheader', { name: 'LMS sync' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'LMS bulk actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('leaves the register unchanged when the server has no LMS sync', async () => {
    statusAnswer = () => {
      throw Object.assign(new Error('Not found'), { status: 404 });
    };
    renderAt('/candidates?sync=FAILED');
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledWith('/lms-sync/status'));
    expect(screen.queryByRole('columnheader', { name: 'LMS sync' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('LMS sync')).not.toBeInTheDocument();
    expect(lastList()?.lmsSyncStatus).toBeUndefined();
  });
});

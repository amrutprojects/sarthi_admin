import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { request } from '../../../services/api-client';
import { studentApi } from '../../students';
import CandidatesPage from '../pages/CandidatesPage';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));
/* The lms-sync module's calls all go through request(); answer them per path (sarthi-api docs/lms-sync/admin-api.md). */
vi.mock('../../../services/api-client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  request: vi.fn(),
}));

const syncRow = (over: Record<string, unknown> = {}) => ({
  studentId: 's1',
  code: 'STU-000001',
  firstName: 'Asha',
  lastName: 'Example',
  centreCode: 'NAG',
  trackCode: 'T03',
  studentStatus: 'RECEIVED',
  eligible: true,
  syncStatus: 'FAILED',
  lmsStatus: 'INVALID',
  lmsLearnerCode: null,
  attempts: 2,
  lastErrorCode: 'LMS_REJECTED_FIELDS',
  lastSentAt: '2026-11-21T07:02:11.481Z',
  lastSyncedAt: null,
  nextAttemptAt: null,
  ...over,
});
const syncRows = [
  syncRow(),
  syncRow({
    studentId: 's2',
    code: 'STU-000002',
    firstName: 'Ravi',
    syncStatus: 'NOT_SYNCED',
    lmsStatus: null,
    attempts: 0,
    lastErrorCode: null,
  }),
];

let summaryAnswer: () => unknown;
const calls = (path: string) => vi.mocked(request).mock.calls.filter(([p]) => p === path);
beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  vi.mocked(request).mockReset();
  granted = new Set(['viewLmsSync', 'pushLmsSync']);
  summaryAnswer = () => ({
    data: {
      tenantCode: 'AMRUT',
      syncEnabled: true,
      eligible: 14,
      byStatus: { NOT_SYNCED: 3, PENDING: 0, SENT: 0, SYNCED: 10, FAILED: 1, REVIEW: 0 },
    },
    message: '',
  });
  vi.mocked(request).mockImplementation(async (path: string, opts?: { body?: unknown }) => {
    if (path === '/lms-sync/summary') return summaryAnswer() as never;
    if (path === '/lms-sync/students')
      return { data: syncRows, meta: { page: 1, limit: 25, total: 2, totalPages: 1 }, message: '' } as never;
    if (path === '/lms-sync/students/push')
      return {
        data: { syncEnabled: true, queued: (opts?.body as { studentIds?: string[] } | undefined)?.studentIds ?? [], skipped: [] },
        message: '',
      } as never;
    if (path === '/lms-sync/students/retry') return { data: { syncEnabled: true, queued: ['s1'] }, message: '' } as never;
    throw new Error('unexpected ' + path);
  });
  vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
  vi.spyOn(studentApi, 'list').mockResolvedValue({ items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } });
});
function Where() {
  const { search } = useLocation();
  return <div data-testid="where">{search}</div>;
}
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/candidates"
        element={
          <>
            <CandidatesPage />
            <Where />
          </>
        }
      />
    </Routes>,
    { route },
  );
const lastListQuery = () => calls('/lms-sync/students').slice(-1)[0]?.[1]?.query;

describe('CandidatesPage — M1 LMS sync view', () => {
  it('switches to the LMS sync view with its flag column and counts', async () => {
    renderAt('/candidates');
    const views = await screen.findByRole('group', { name: 'Register view' });
    await userEvent.click(within(views).getByRole('button', { name: 'LMS sync' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?view=lms');
    expect(await screen.findByRole('columnheader', { name: 'LMS sync' })).toBeInTheDocument();
    const asha = (await screen.findByText('Asha Example')).closest('tr')!;
    expect(within(asha).getByText('Failed')).toBeInTheDocument();
    expect(within(asha).getByText('LMS_REJECTED_FIELDS')).toBeInTheDocument();
    expect(within(screen.getByText('Ravi Example').closest('tr')!).getByText('Not synced')).toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Sync flags' });
    expect(within(chips).getByRole('button', { name: 'Synced 10' })).toBeInTheDocument();
  });

  it('filters by several flags, sent comma-separated', async () => {
    renderAt('/candidates?view=lms');
    const chips = await screen.findByRole('group', { name: 'Sync flags' });
    await userEvent.click(within(chips).getByRole('button', { name: /^Failed/ }));
    await userEvent.click(within(chips).getByRole('button', { name: /^In review/ }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ syncStatus: 'FAILED,REVIEW', scope: 'eligible' }));
    expect(screen.getByTestId('where')).toHaveTextContent('sync=FAILED%2CREVIEW');
  });

  it('pushes the selected students after a confirmation, and retries them', async () => {
    renderAt('/candidates?view=lms');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select STU-000001' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select STU-000002' }));
    const bar = screen.getByRole('group', { name: 'LMS bulk actions' });
    expect(within(bar).getByText('2')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Push to LMS' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Push to LMS' }));
    await waitFor(() =>
      expect(calls('/lms-sync/students/push')[0]?.[1]).toMatchObject({ method: 'POST', body: { studentIds: ['s1', 's2'] } }),
    );
    await waitFor(() => expect(within(bar).getByText('0')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select STU-000001' }));
    await userEvent.click(within(bar).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(calls('/lms-sync/students/retry')[0]?.[1]).toMatchObject({ body: { studentIds: ['s1'] } }));
  });

  it('shows flags but no selection or actions without imports.update', async () => {
    granted = new Set(['viewLmsSync']);
    renderAt('/candidates?view=lms');
    expect(await screen.findByRole('columnheader', { name: 'LMS sync' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'LMS bulk actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('leaves the register unchanged when the server has no LMS sync', async () => {
    summaryAnswer = () => {
      throw Object.assign(new Error('Not found'), { status: 404 });
    };
    renderAt('/candidates?view=lms');
    await waitFor(() => expect(calls('/lms-sync/summary').length).toBeGreaterThan(0));
    expect(await screen.findByRole('group', { name: 'Student buckets' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Register view' })).not.toBeInTheDocument();
    expect(calls('/lms-sync/students')).toHaveLength(0);
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { LmsSyncCard } from '../components/LmsSyncCard';
import { lmsSyncApi } from '../services/lmsSyncApi';
import type { LmsSyncDetail, LmsSyncSummary } from '../types/lmsSync.types';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));

const summary = (over: Partial<LmsSyncSummary> = {}): LmsSyncSummary => ({
  tenantCode: 'AMRUT',
  syncEnabled: true,
  eligible: 2,
  byStatus: { NOT_SYNCED: 1, PENDING: 0, SENT: 0, SYNCED: 0, FAILED: 1, REVIEW: 0 },
  ...over,
});
/* Shape of GET /lms-sync/students/:id (sarthi-api docs/lms-sync/admin-api.md); synthetic values. */
const detail = (over: Partial<LmsSyncDetail> = {}): LmsSyncDetail => ({
  studentId: 's1',
  code: 'STU-000123',
  firstName: 'Asha',
  lastName: 'Example',
  studentStatus: 'RECEIVED',
  eligible: true,
  tenantCode: 'AMRUT',
  syncEnabled: true,
  syncStatus: 'FAILED',
  lmsLearnerId: null,
  lmsLearnerCode: null,
  lmsRequestId: 'req-1',
  lmsStatus: 'INVALID',
  lmsReasonCodes: ['PIN_FORMAT'],
  attempts: 2,
  lastErrorCode: 'LMS_REJECTED_FIELDS',
  lastErrorDetails: [{ field: 'pin_code', code: 'format' }],
  queuedAt: '2026-11-21T06:00:00.000Z',
  lastSentAt: '2026-11-21T07:02:11.481Z',
  lastCheckedAt: '2026-11-21T07:10:00.000Z',
  lastSyncedAt: null,
  nextAttemptAt: null,
  linkCreatedAt: '2026-11-21T06:00:00.000Z',
  payload: {
    fields: ['external_student_id'],
    missingRequiredFields: [],
    checksum: 'a'.repeat(64),
    lastSentChecksum: null,
    changedSinceLastSend: false,
  },
  ...over,
});

beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  granted = new Set(['viewLmsSync', 'pushLmsSync']);
  vi.spyOn(lmsSyncApi, 'summary').mockResolvedValue(summary());
});

describe('LmsSyncCard', () => {
  it('shows the flag, LMS status and reasons, attempts, last error with field codes and the history', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect((await screen.findAllByText('LMS_REJECTED_FIELDS')).length).toBeGreaterThan(0);
    expect(screen.getByText(/The LMS rejected some fields/)).toBeInTheDocument();
    expect(screen.getByText('pin_code')).toBeInTheDocument();
    expect(screen.getByText('INVALID')).toBeInTheDocument();
    expect(screen.getByText('PIN_FORMAT')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sent to the LMS')).toBeInTheDocument();
    expect(lmsSyncApi.detail).toHaveBeenCalledWith('s1');
  });

  it('retries a failed student and pushes with the student id list', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    const retry = vi.spyOn(lmsSyncApi, 'retry').mockResolvedValue({ syncEnabled: true, queued: ['s1'] });
    const push = vi.spyOn(lmsSyncApi, 'push').mockResolvedValue({ syncEnabled: true, queued: ['s1'], skipped: [] });
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledWith(['s1']);
    await userEvent.click(screen.getByRole('button', { name: 'Push to LMS' }));
    expect(push).toHaveBeenCalledWith(['s1']);
    /* Both refresh the detail. */
    await waitFor(() => expect(vi.mocked(lmsSyncApi.detail).mock.calls.length).toBeGreaterThan(1));
  });

  it('lists missing required fields and offers no Retry unless FAILED', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(
      detail({
        syncStatus: 'NOT_SYNCED',
        lastErrorCode: null,
        lastErrorDetails: [],
        payload: { ...detail().payload, missingRequiredFields: ['landmark', 'pin_code'] },
      }),
    );
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText('landmark, pin_code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push to LMS' })).toBeEnabled();
  });

  it('disables Push for a student that is not eligible', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(
      detail({ eligible: false, studentStatus: 'REGISTRATION_PENDING', syncStatus: 'NOT_SYNCED' }),
    );
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText(/Only approved, active students are sent/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push to LMS' })).toBeDisabled();
  });

  it('keeps Push available while the sync is switched off (the API still queues)', async () => {
    vi.mocked(lmsSyncApi.summary).mockResolvedValue(summary({ syncEnabled: false }));
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail({ syncEnabled: false, syncStatus: 'NOT_SYNCED' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText(/LMS sync is switched off/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push to LMS' })).toBeEnabled();
  });

  it('hides the actions without imports.update, and shows the review hint', async () => {
    granted = new Set(['viewLmsSync']);
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail({ syncStatus: 'REVIEW' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText(/Held for review/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push to LMS' })).not.toBeInTheDocument();
  });

  it('renders nothing without read access or on a server without the sync', async () => {
    granted = new Set();
    const d = vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    const { container, unmount } = renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(container).toBeEmptyDOMElement();
    expect(lmsSyncApi.summary).not.toHaveBeenCalled();
    unmount();

    granted = new Set(['viewLmsSync']);
    vi.mocked(lmsSyncApi.summary).mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
    const second = renderWithProviders(<LmsSyncCard studentId="s1" />);
    await waitFor(() => expect(lmsSyncApi.summary).toHaveBeenCalled());
    expect(second.container).toBeEmptyDOMElement();
    expect(d).not.toHaveBeenCalled();
  });
});

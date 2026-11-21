import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { LmsSyncCard } from '../components/LmsSyncCard';
import { lmsSyncApi } from '../services/lmsSyncApi';
import type { LmsSyncDetail } from '../types/lmsSync.types';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));

const detail = (over: Partial<LmsSyncDetail> = {}): LmsSyncDetail => ({
  studentId: 's1',
  lmsTenantCode: 'AMRUT',
  status: 'FAILED',
  lmsLearnerId: null,
  lmsLearnerCode: null,
  attempts: 3,
  lastAttemptAt: '2026-11-20T05:00:00.000Z',
  lastSyncedAt: null,
  nextAttemptAt: '2026-11-21T05:00:00.000Z',
  lastErrorCodes: ['LMS_UNAVAILABLE'],
  lastErrorMessage: 'The LMS did not answer in time',
  timeline: [
    { id: 'e2', at: '2026-11-20T05:00:00.000Z', type: 'FAILED', status: 'FAILED', message: 'Timeout', actorName: null },
    { id: 'e1', at: '2026-11-19T05:00:00.000Z', type: 'MANUAL_PUSH', status: 'PENDING', message: null, actorName: 'Priya Admin' },
  ],
  ...over,
});

beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  granted = new Set(['viewLmsSync', 'pushLmsSync']);
  vi.spyOn(lmsSyncApi, 'status').mockResolvedValue({ enabled: true, lmsTenantCode: 'AMRUT', counts: {} });
});

describe('LmsSyncCard', () => {
  it('shows the flag, learner ids, attempts, last error and the history', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText('The LMS did not answer in time')).toBeInTheDocument();
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/LMS_UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.getByText('Manual push · Queued')).toBeInTheDocument();
    expect(screen.getByText(/Priya Admin/)).toBeInTheDocument();
    expect(lmsSyncApi.detail).toHaveBeenCalledWith('s1');
  });

  it('retries a failed sync and pushes again', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    const retry = vi
      .spyOn(lmsSyncApi, 'retry')
      .mockResolvedValue(detail({ status: 'PENDING', lastErrorCodes: [], lastErrorMessage: null }));
    const push = vi.spyOn(lmsSyncApi, 'push').mockResolvedValue(detail({ status: 'PENDING' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledWith('s1');
    /* The answer replaces the detail: queued, so neither Retry nor Push is offered. */
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Push to LMS' })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('pushes a student that was never synced', async () => {
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(
      detail({ status: 'NOT_SYNCED', attempts: 0, lastErrorCodes: [], lastErrorMessage: null, timeline: [] }),
    );
    const push = vi.spyOn(lmsSyncApi, 'push').mockResolvedValue(detail({ status: 'PENDING' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText('No sync activity yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Push to LMS' }));
    expect(push).toHaveBeenCalledWith('s1');
  });

  it('hides the actions without lms-sync.update, and shows the review hint', async () => {
    granted = new Set(['viewLmsSync']);
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail({ status: 'REVIEW' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText(/Held for review/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push to LMS' })).not.toBeInTheDocument();
  });

  it('disables Push while the server sync is switched off', async () => {
    vi.mocked(lmsSyncApi.status).mockResolvedValue({ enabled: false, lmsTenantCode: 'AMRUT', counts: {} });
    vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail({ status: 'NOT_SYNCED' }));
    renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(await screen.findByText(/LMS sync is switched off/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push to LMS' })).toBeDisabled();
  });

  it('renders nothing without lms-sync.view or on a server without the sync', async () => {
    granted = new Set();
    const d = vi.spyOn(lmsSyncApi, 'detail').mockResolvedValue(detail());
    const { container, unmount } = renderWithProviders(<LmsSyncCard studentId="s1" />);
    expect(container).toBeEmptyDOMElement();
    expect(lmsSyncApi.status).not.toHaveBeenCalled();
    unmount();

    granted = new Set(['viewLmsSync']);
    vi.mocked(lmsSyncApi.status).mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
    const second = renderWithProviders(<LmsSyncCard studentId="s1" />);
    await waitFor(() => expect(lmsSyncApi.status).toHaveBeenCalled());
    expect(second.container).toBeEmptyDOMElement();
    expect(d).not.toHaveBeenCalled();
  });
});

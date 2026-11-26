import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { HeadOfficeApprovalCard, IppConnectionCard } from '..';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { LinkItem } from '../types/ippApprovals.types';
import { linkState, resetToasts, toasts } from './fixtures';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (action: string) => granted.has(action) }));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: { headOffice: vi.fn(), setHeadOffice: vi.fn(), link: vi.fn(), retryLink: vi.fn(), testLink: vi.fn() },
}));
const api = vi.mocked(ippApprovalsApi);
const settled = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  granted = new Set(['editSettings']);
  resetToasts();
  api.headOffice.mockResolvedValue({ enabled: true, updatedAt: '2026-11-20T05:00:00.000Z', updatedBy: 'Asha Admin' });
  api.link.mockResolvedValue(linkState());
});

describe('Head Office approval card', () => {
  const theSwitch = () => screen.findByRole('switch', { name: 'Head Office approval' });

  it('shows the state, what it means and who changed it', async () => {
    renderWithProviders(<HeadOfficeApprovalCard />);
    expect(await theSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Off: the Super Admin gives the final approval/)).toBeInTheDocument();
    expect(screen.getByText(/Last changed .* by Asha Admin\./)).toBeInTheDocument();
  });

  it('switches off after a confirmation and shows how many applications moved', async () => {
    api.setHeadOffice.mockResolvedValue({ enabled: false, updatedAt: '2026-11-25T05:00:00.000Z', updatedBy: 'Me', moved: 3 });
    renderWithProviders(<HeadOfficeApprovalCard />);
    await userEvent.click(await theSwitch());
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('the Super Admin gives the final approval');
    expect(dialog).toHaveTextContent('wait for Head Office move to the Super Admin now');
    expect(api.setHeadOffice).not.toHaveBeenCalled();
    api.headOffice.mockResolvedValue({ enabled: false, updatedAt: '2026-11-25T05:00:00.000Z', updatedBy: 'Me' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Switch off' }));
    expect(api.setHeadOffice).toHaveBeenCalledWith(false);
    expect(await screen.findByText('Head Office approval is off. 3 waiting applications moved to the Super Admin.')).toBeInTheDocument();
    expect(await theSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches on again', async () => {
    api.headOffice.mockResolvedValue({ enabled: false, updatedAt: null, updatedBy: null });
    api.setHeadOffice.mockResolvedValue({ enabled: true, updatedAt: null, updatedBy: null, moved: 0 });
    renderWithProviders(<HeadOfficeApprovalCard />);
    await userEvent.click(await theSwitch());
    expect(screen.getByRole('dialog')).toHaveTextContent('wait for the Super Admin move to Head Office now');
    await userEvent.click(screen.getByRole('button', { name: 'Switch on' }));
    expect(await screen.findByText('Head Office approval is on. No application was waiting for the final approval.')).toBeInTheDocument();
  });

  it('changes nothing when cancelled, and shows a refusal', async () => {
    renderWithProviders(<HeadOfficeApprovalCard />);
    await userEvent.click(await theSwitch());
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.setHeadOffice).not.toHaveBeenCalled();
    api.setHeadOffice.mockRejectedValue(new ApiError('Service unavailable', 503, 'ERROR'));
    await userEvent.click(await theSwitch());
    await userEvent.click(screen.getByRole('button', { name: 'Switch off' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not saved. Service unavailable');
    expect(await theSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('cannot be switched without settings.update', async () => {
    granted = new Set();
    renderWithProviders(<HeadOfficeApprovalCard />);
    expect(await theSwitch()).toBeDisabled();
  });
});

describe('IPP connection card', () => {
  const item = (over: Partial<LinkItem> = {}): LinkItem => ({
    id: 'd-1',
    application: { id: 'app-1', registrationId: 'IPP-000001', name: 'Asha Patil' },
    action: 'REJECT',
    from: 'DIVISION',
    to: 'AUDITOR',
    status: 'FAILED',
    attempts: 5,
    nextAttemptAt: null,
    lastError: 'STAGE_MISMATCH: the form is with COEP',
    createdAt: '2026-11-24T05:00:00.000Z',
    ...over,
  });
  const waiting = item({
    id: 'd-2',
    application: { id: 'app-2', registrationId: 'IPP-000002', name: 'Ravi Kale' },
    action: 'APPROVE',
    to: 'COEP',
    status: 'PENDING',
    attempts: 1,
    nextAttemptAt: '2026-11-25T06:00:00.000Z',
    lastError: 'IPP cannot be reached',
  });

  it('shows the status and that everything is sent', async () => {
    renderWithProviders(<IppConnectionCard />);
    expect(await screen.findByText('ippapi.example.invalid')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Every decision has been sent.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
  });

  it.each([
    [{ enabled: false, configured: false }, 'Switched off', /switched off on the server.*decisions wait here/],
    [{ enabled: true, configured: false, host: null }, 'Not configured', /not configured on the server.*documents cannot be opened/],
  ])('explains a connection that does not work (%o)', async (over, label, note) => {
    api.link.mockResolvedValue(linkState(over));
    renderWithProviders(<IppConnectionCard />);
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it('lists what waits and what failed, with the reason, and sends again', async () => {
    api.link.mockResolvedValue(linkState({ pending: 1, failed: 1, items: [item(), waiting] }));
    api.retryLink.mockResolvedValue({ retried: 1 });
    renderWithProviders(<IppConnectionCard />);
    const table = await screen.findByRole('table', { name: 'Decisions not sent to IPP yet' });
    const failed = within(table).getByText('Asha Patil').closest('tr') as HTMLElement;
    expect(failed).toHaveTextContent('IPP-000001');
    expect(failed).toHaveTextContent('Divisional Officer → IPP Auditor');
    expect(failed).toHaveTextContent('Failed');
    expect(failed).toHaveTextContent('5 attempts');
    expect(failed).toHaveTextContent('STAGE_MISMATCH: the form is with COEP');
    const other = within(table).getByText('Ravi Kale').closest('tr') as HTMLElement;
    expect(other).toHaveTextContent('Waiting');
    expect(other).toHaveTextContent('Next attempt');
    /* A waiting one is sent by itself. */
    expect(within(other).queryByRole('button')).not.toBeInTheDocument();

    await userEvent.click(within(failed).getByRole('button', { name: 'Retry IPP-000001' }));
    expect(api.retryLink).toHaveBeenLastCalledWith(['d-1']);
    await waitFor(() => expect(toasts()).toHaveTextContent('1 decision will be sent again'));
    await userEvent.click(screen.getByRole('button', { name: 'Retry all failed (1)' }));
    expect(api.retryLink).toHaveBeenLastCalledWith(undefined);
    await waitFor(() => expect(api.link.mock.calls.length).toBeGreaterThan(1));
  });

  it('tests the connection and shows the answer, also a bad one', async () => {
    api.testLink.mockResolvedValueOnce({ ok: true, message: 'Reached in 120 ms' });
    renderWithProviders(<IppConnectionCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('IPP answered.')).toBeInTheDocument();
    expect(screen.getByText(/Reached in 120 ms/)).toBeInTheDocument();
    api.testLink.mockResolvedValueOnce({ ok: false, message: 'The shared secret does not match' });
    await userEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('IPP did not answer. The shared secret does not match');
  });

  it('is read-only without settings.update', async () => {
    granted = new Set();
    api.link.mockResolvedValue(linkState({ failed: 1, items: [item()] }));
    renderWithProviders(<IppConnectionCard />);
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('both cards', () => {
  it.each([403, 404])('are hidden when the API answers %i', async (status) => {
    api.headOffice.mockRejectedValue(new ApiError('No', status, 'NO'));
    api.link.mockRejectedValue(new ApiError('No', status, 'NO'));
    const { container } = renderWithProviders(
      <>
        <HeadOfficeApprovalCard />
        <IppConnectionCard />
      </>,
    );
    await settled();
    expect(api.headOffice).toHaveBeenCalled();
    expect(api.link).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('show another error with Retry', async () => {
    api.headOffice.mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<HeadOfficeApprovalCard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the Head Office approval setting. Database unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('switch')).toBeInTheDocument();
  });
});

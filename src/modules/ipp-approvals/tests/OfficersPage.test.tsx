import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { ApiError } from '../../../services/api-client';
import OfficersPage from '../pages/OfficersPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { Officer } from '../types/ippApprovals.types';
import { PUNE, SATARA, resetToasts, toasts } from './fixtures';

let granted = new Set<string>();
let me = 'u-admin';
vi.mock('../../auth', () => ({
  useCanOpen: () => () => true,
  useCan: () => (action: string) => granted.has(action),
  useAuth: () => ({ user: { id: me } }),
}));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: { officers: vi.fn(), districts: vi.fn(), setOfficerDistricts: vi.fn() },
}));
/* An officer's account (status, roles) is the users module's: its API client is replaced at that boundary. */
const users = vi.hoisted(() => ({ get: vi.fn(), setStatus: vi.fn() }));
vi.mock('../../users/services/userApi', () => ({ userApi: users }));
const api = vi.mocked(ippApprovalsApi);

const NAGPUR = { id: '33333333-3333-4333-8333-333333333333', name: 'Nagpur' };
const officer = (over: Partial<Officer> = {}): Officer => ({
  id: 'u-1',
  name: 'Anil Rao',
  email: 'anil@example.invalid',
  isActive: true,
  districts: [PUNE],
  ...over,
});
const meera = officer({ id: 'u-2', name: 'Meera Shah', email: 'meera@example.invalid', isActive: false, districts: [] });
const open = async () => userEvent.click(await screen.findByRole('button', { name: 'Edit the districts of Anil Rao' }));
/* The name cell (the row buttons repeat the name for screen readers). */
const NAME_CELL = { selector: 'td > b' };

beforeEach(() => {
  granted = new Set(['updateIppOfficers']);
  me = 'u-admin';
  users.get.mockReset();
  users.setStatus.mockReset();
  api.setOfficerDistricts.mockReset();
  resetToasts();
  api.officers.mockResolvedValue({ officers: [officer(), meera], withoutOfficer: [] });
  api.districts.mockResolvedValue([
    { ...PUNE, code: 'PUN' },
    { ...SATARA, code: 'SAT' },
    { ...NAGPUR, code: 'NAG' },
  ]);
});

describe('Divisional Officer Mapping', () => {
  it('lists the Divisional Officers with their districts', async () => {
    renderWithProviders(<OfficersPage />);
    expect(screen.getByLabelText('Loading officers')).toBeInTheDocument();
    const anil = (await screen.findByText('Anil Rao', NAME_CELL)).closest('tr') as HTMLElement;
    expect(within(anil).getByText('Pune')).toBeInTheDocument();
    expect(within(anil).getByText('Active')).toBeInTheDocument();
    const second = screen.getByText('Meera Shah', NAME_CELL).closest('tr') as HTMLElement;
    expect(within(second).getByText('Inactive')).toBeInTheDocument();
    expect(within(second).getByText('No district')).toBeInTheDocument();
    expect(document.title).toBe('Divisional Officer Mapping — SARTHI Admin');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns of districts with waiting applications and no officer', async () => {
    api.officers.mockResolvedValue({
      officers: [officer()],
      withoutOfficer: [
        { ...NAGPUR, waiting: 4 },
        { ...SATARA, waiting: 1 },
      ],
    });
    renderWithProviders(<OfficersPage />);
    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('Districts with waiting applications and no officer');
    expect(
      within(warning)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Nagpur: 4 applications waiting', 'Satara: 1 application waiting']);
  });

  it('changes the districts in the drawer: search, select all, select none, save', async () => {
    api.officers.mockResolvedValue({
      officers: [officer(), officer({ id: 'u-3', name: 'Lata More', districts: [SATARA] })],
      withoutOfficer: [{ ...NAGPUR, waiting: 4 }],
    });
    api.setOfficerDistricts.mockResolvedValue(officer({ districts: [PUNE, NAGPUR] }));
    renderWithProviders(<OfficersPage />);
    await open();
    expect(await screen.findByLabelText(/Pune/)).toBeChecked();
    expect(screen.getByLabelText(/Satara/)).not.toBeChecked();
    expect(screen.getByLabelText(/Satara/)).toBeDisabled();
    /* Who else a district is with, and where nobody is. */
    expect(screen.getByText(/with Lata More/)).toBeInTheDocument();
    expect(screen.getByText(/4 applications waiting, no officer/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText('2 selected · 2 available')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByText('0 selected · 2 available')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Search districts…'), 'nag');
    expect(screen.queryByLabelText(/Satara/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Nagpur/));
    await userEvent.clear(screen.getByPlaceholderText('Search districts…'));
    await userEvent.click(screen.getByLabelText(/Pune/));

    const reads = api.officers.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.setOfficerDistricts).toHaveBeenCalledWith('u-1', [NAGPUR.id, PUNE.id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Districts of Anil Rao saved'));
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    await waitFor(() => expect(api.officers.mock.calls.length).toBeGreaterThan(reads));
  });

  it('can take every district away', async () => {
    api.setOfficerDistricts.mockResolvedValue(officer({ districts: [] }));
    renderWithProviders(<OfficersPage />);
    await open();
    await userEvent.click(await screen.findByLabelText(/Pune/));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.setOfficerDistricts).toHaveBeenCalledWith('u-1', []));
  });

  it('shows a district of the officer that is no longer active, to take it away', async () => {
    api.officers.mockResolvedValue({ officers: [officer({ districts: [{ id: 'old', name: 'Old District' }] })], withoutOfficer: [] });
    renderWithProviders(<OfficersPage />);
    await open();
    expect(await screen.findByLabelText(/Old District \(inactive\)/)).toBeChecked();
  });

  it.each([
    [422, 'Unknown district'],
    [409, 'Anil Rao is not a Divisional Officer'],
  ])('keeps the drawer open with the message of a %i', async (status, message) => {
    api.setOfficerDistricts.mockRejectedValue(new ApiError(message, status, 'REFUSED'));
    renderWithProviders(<OfficersPage />);
    await open();
    await screen.findByLabelText(/Pune/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`Not saved. ${message}`);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('cannot save while the districts are not loaded, and loads them again', async () => {
    api.districts.mockRejectedValueOnce(new ApiError('Service unavailable', 503, 'ERROR'));
    renderWithProviders(<OfficersPage />);
    await open();
    expect(await screen.findByText(/Service unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText(/Pune/)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('is read-only without ipp-officers.update and users.update: View only', async () => {
    granted = new Set();
    renderWithProviders(<OfficersPage />);
    const anil = (await screen.findByText('Anil Rao', NAME_CELL)).closest('tr') as HTMLElement;
    expect(
      within(anil)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['View Anil Rao']);
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove districts/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activate/i })).not.toBeInTheDocument();
  });

  describe('View', () => {
    it('shows the officer read-only from the list, without reading the account when users.view is missing', async () => {
      granted = new Set();
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'View Anil Rao' }));
      const drawer = screen.getByRole('heading', { name: 'Divisional Officer — Anil Rao' }).closest('aside') as HTMLElement;
      const rows = within(drawer)
        .getAllByText(/./, { selector: '.kv > span' })
        .map((label) => [label.textContent, label.nextElementSibling?.textContent]);
      expect(rows).toEqual([
        ['Name', 'Anil Rao'],
        ['Email', 'anil@example.invalid'],
        ['Roles', 'Divisional Officer'],
        ['Status', 'Active'],
        ['Districts', 'Pune'],
      ]);
      expect(within(drawer).queryByRole('button', { name: /Save|Edit|Delete/ })).not.toBeInTheDocument();
      expect(users.get).not.toHaveBeenCalled();
      await userEvent.click(within(drawer).getByRole('button', { name: '✕' }));
      expect(screen.queryByRole('heading', { name: /Divisional Officer — / })).not.toBeInTheDocument();
    });

    it('adds the account (GET /users/:id) for a user with users.view', async () => {
      granted = new Set(['viewUsers']);
      users.get.mockResolvedValue({
        id: 'u-2',
        name: 'Meera Shah',
        email: 'meera@example.invalid',
        isActive: false,
        lastLoginAt: null,
        createdAt: '2026-11-01T05:00:00.000Z',
        updatedAt: '2026-11-20T05:00:00.000Z',
        roles: [{ id: 'r-1', name: 'District Officer', code: 'DISTRICT_OFFICER' }],
      });
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'View Meera Shah' }));
      expect(await screen.findByText('District Officer')).toBeInTheDocument();
      expect(users.get).toHaveBeenCalledWith('u-2');
      expect(screen.getByText(fmtDateTime('2026-11-01T05:00:00.000Z'))).toBeInTheDocument();
      expect(screen.queryByLabelText('Loading account details')).not.toBeInTheDocument();
    });
  });

  describe('Activate / Deactivate', () => {
    it('is there only with users.update, and never for the signed-in officer', async () => {
      const first = renderWithProviders(<OfficersPage />);
      await screen.findByText('Anil Rao', NAME_CELL);
      expect(screen.queryByRole('button', { name: /activate/i })).not.toBeInTheDocument();
      first.unmount();

      granted = new Set(['updateUser']);
      me = 'u-1';
      renderWithProviders(<OfficersPage />);
      await screen.findByText('Anil Rao', NAME_CELL);
      expect(screen.queryByRole('button', { name: 'Deactivate Anil Rao' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Activate Meera Shah' })).toBeInTheDocument();
    });

    it('asks first, then deactivates the account (PATCH /users/:id/status) and reads the list again', async () => {
      granted = new Set(['updateUser']);
      users.setStatus.mockResolvedValue({ id: 'u-1', isActive: false });
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Anil Rao' }));
      const confirm = screen.getByRole('dialog');
      expect(confirm).toHaveTextContent('Deactivate officer');
      expect(confirm).toHaveTextContent('A deactivated officer cannot sign in or decide on forms.');

      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(users.setStatus).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Deactivate Anil Rao' }));
      const reads = api.officers.mock.calls.length;
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }));
      await waitFor(() => expect(users.setStatus).toHaveBeenCalledWith('u-1', false));
      await waitFor(() => expect(toasts()).toHaveTextContent('Anil Rao deactivated'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(api.officers.mock.calls.length).toBeGreaterThan(reads));
    });

    it('activates an inactive officer', async () => {
      granted = new Set(['updateUser']);
      users.setStatus.mockResolvedValue({ id: 'u-2', isActive: true });
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'Activate Meera Shah' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('The officer can sign in again');
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate' }));
      await waitFor(() => expect(users.setStatus).toHaveBeenCalledWith('u-2', true));
      await waitFor(() => expect(toasts()).toHaveTextContent('Meera Shah activated'));
    });

    it('keeps the question open with the reason of a refusal', async () => {
      granted = new Set(['updateUser']);
      users.setStatus.mockRejectedValue(new ApiError('The last Super Admin cannot be deactivated', 409, 'CONFLICT'));
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Anil Rao' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }));
      await waitFor(() => expect(toasts()).toHaveTextContent('The last Super Admin cannot be deactivated'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Remove districts', () => {
    it('is there with ipp-officers.update for an officer who has districts', async () => {
      renderWithProviders(<OfficersPage />);
      expect(await screen.findByRole('button', { name: 'Remove districts of Anil Rao' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove districts of Meera Shah' })).not.toBeInTheDocument();
    });

    it('asks first, then unmaps every district (PUT /officers/:id/districts with []) and reads the list again', async () => {
      api.setOfficerDistricts.mockResolvedValue(officer({ districts: [] }));
      renderWithProviders(<OfficersPage />);
      await userEvent.click(await screen.findByRole('button', { name: 'Remove districts of Anil Rao' }));
      const confirm = screen.getByRole('dialog');
      expect(confirm).toHaveTextContent('Remove every district (Pune) from Anil Rao?');
      expect(confirm).toHaveTextContent('The user account stays');
      expect(confirm).toHaveTextContent(
        'Forms waiting at the Divisional Officer stage for these districts will wait until another officer is mapped to them.',
      );

      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      expect(api.setOfficerDistricts).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Remove districts of Anil Rao' }));
      const reads = api.officers.mock.calls.length;
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove districts' }));
      await waitFor(() => expect(api.setOfficerDistricts).toHaveBeenCalledWith('u-1', []));
      await waitFor(() => expect(toasts()).toHaveTextContent('Districts of Anil Rao removed'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(api.officers.mock.calls.length).toBeGreaterThan(reads));
      expect(users.setStatus).not.toHaveBeenCalled();
    });
  });

  it('shows empty, error and 403 states', async () => {
    api.officers.mockResolvedValue({ officers: [], withoutOfficer: [] });
    const empty = renderWithProviders(<OfficersPage />);
    expect(await screen.findByText(/No Divisional Officers yet/)).toBeInTheDocument();
    empty.unmount();

    api.officers.mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'));
    const failed = renderWithProviders(<OfficersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No Divisional Officers yet/)).toBeInTheDocument();
    failed.unmount();

    api.officers.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderWithProviders(<OfficersPage />);
    expect(await screen.findByText(/You do not have permission to see the officers/)).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import OfficersPage from '../pages/OfficersPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { Officer } from '../types/ippApprovals.types';
import { PUNE, SATARA, resetToasts, toasts } from './fixtures';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (action: string) => granted.has(action) }));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: { officers: vi.fn(), districts: vi.fn(), setOfficerDistricts: vi.fn() },
}));
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

beforeEach(() => {
  granted = new Set(['updateIppOfficers']);
  resetToasts();
  api.officers.mockResolvedValue({ officers: [officer(), meera], withoutOfficer: [] });
  api.districts.mockResolvedValue([
    { ...PUNE, code: 'PUN' },
    { ...SATARA, code: 'SAT' },
    { ...NAGPUR, code: 'NAG' },
  ]);
});

describe('Officer districts', () => {
  it('lists the Divisional Officers with their districts', async () => {
    renderWithProviders(<OfficersPage />);
    expect(screen.getByLabelText('Loading officers')).toBeInTheDocument();
    const anil = (await screen.findByText('Anil Rao')).closest('tr') as HTMLElement;
    expect(within(anil).getByText('Pune')).toBeInTheDocument();
    expect(within(anil).getByText('Active')).toBeInTheDocument();
    const second = screen.getByText('Meera Shah').closest('tr') as HTMLElement;
    expect(within(second).getByText('Inactive')).toBeInTheDocument();
    expect(within(second).getByText('No district')).toBeInTheDocument();
    expect(document.title).toBe('Officer districts — AMRUT × SUMAGO Admin');
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
    /* Who else a district is with, and where nobody is. */
    expect(screen.getByText(/with Lata More/)).toBeInTheDocument();
    expect(screen.getByText(/4 applications waiting, no officer/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText('3 selected · 3 available')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByText('0 selected · 3 available')).toBeInTheDocument();
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

  it('is read-only without ipp-officers.update', async () => {
    granted = new Set();
    renderWithProviders(<OfficersPage />);
    await screen.findByText('Anil Rao');
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
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

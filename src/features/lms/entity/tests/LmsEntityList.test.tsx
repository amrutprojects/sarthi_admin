import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import LmsEntityList from '../pages/LmsEntityList';
import { lmsEntityService } from '../services/entityService';
import { centreOptions, ensureToastRoot, entity, page, trackOptions } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module, the API service, the option feeds. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/entityService', () => ({
  lmsEntityService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(), count: vi.fn(),
    formOptions: vi.fn(),
  },
}));
vi.mock('../../options', () => ({ lmsOptions: { centres: vi.fn(), tracks: vi.fn(), entities: vi.fn(), courses: vi.fn(), modules: vi.fn() } }));

describe('<LmsEntityList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(lmsEntityService.list).mockReset().mockResolvedValue(page([entity(), entity({ id: 'e2', name: 'Pilot Entity', code: 'PILOT', enabledCentres: [], enabledTracks: [], isActive: false })]));
    vi.mocked(lmsEntityService.count).mockReset().mockImplementation(async (f = {}) => (f.isActive === 'true' ? 1 : 2));
    vi.mocked(lmsEntityService.setStatus).mockReset();
    vi.mocked(lmsEntityService.remove).mockReset();
    vi.mocked(lmsOptions.centres).mockReset().mockResolvedValue(centreOptions);
    vi.mocked(lmsOptions.tracks).mockReset().mockResolvedValue(trackOptions);
  });

  it('lists the entities with their selections, status and Sr. No., and the KPI totals', async () => {
    renderWithProviders(<LmsEntityList />);
    const row = (await screen.findByText('Amrut Kalash')).closest('tr') as HTMLTableRowElement;
    /* Sr. No., name, code, centres, tracks, language · time zone, status. */
    expect(row.cells[0]).toHaveTextContent('1');
    expect(row.cells[2]).toHaveTextContent('AMK');
    /* Two centres, one of them deactivated in the Admin Panel since. */
    expect(row.cells[3]).toHaveTextContent('2 (1 inactive)');
    expect(row.cells[4]).toHaveTextContent('1');
    expect(row.cells[5]).toHaveTextContent('mr · Asia/Kolkata');
    expect(within(row.cells[6]).getByText('Active')).toBeInTheDocument();
    const pilot = screen.getByText('Pilot Entity').closest('tr') as HTMLTableRowElement;
    expect(pilot.cells[0]).toHaveTextContent('2');
    expect(within(pilot).getAllByText('None')).toHaveLength(2);
    expect(within(pilot.cells[6]).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Total entities').closest('.kpi')).toHaveTextContent('2');
    expect(screen.getByText('Entity Master', { selector: 'h1' })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    vi.mocked(lmsEntityService.list).mockResolvedValue(page([]));
    renderWithProviders(<LmsEntityList />);
    expect(await screen.findByText(/No entities have been added yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(lmsEntityService.list).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<LmsEntityList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(lmsEntityService.list).mockResolvedValue(page([entity()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Amrut Kalash')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held', async () => {
    const { unmount } = renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');
    expect(screen.queryByRole('button', { name: /Add Entity/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Amrut Kalash' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Amrut Kalash/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Amrut Kalash' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Amrut Kalash' })).toBeInTheDocument();
    unmount();

    permissions.add('createLmsEntity');
    permissions.add('updateLmsEntity');
    permissions.add('deleteLmsEntity');
    renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');
    expect(screen.getByRole('button', { name: /Add Entity/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Amrut Kalash' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Amrut Kalash: active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Amrut Kalash' })).toBeInTheDocument();
  });

  it('asks for confirmation before deactivating and deleting', async () => {
    permissions.add('updateLmsEntity');
    permissions.add('deleteLmsEntity');
    vi.mocked(lmsEntityService.setStatus).mockResolvedValue(entity({ isActive: false }));
    vi.mocked(lmsEntityService.remove).mockResolvedValue();
    renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');

    await userEvent.click(screen.getByRole('switch', { name: 'Amrut Kalash: active' }));
    expect(screen.getByText('Are you sure you want to deactivate the entity Amrut Kalash?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(lmsEntityService.setStatus).toHaveBeenCalledWith('e1', false));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Amrut Kalash' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(lmsEntityService.remove).toHaveBeenCalledWith('e1'));
  });

  it('sends the status, centre and track filters to the API', async () => {
    renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');
    await screen.findByRole('option', { name: 'Pune Main Centre (TC0003)' });
    await userEvent.selectOptions(screen.getByLabelText('Enabled Centre'), 'c3');
    await waitFor(() => expect(lmsEntityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ centreId: 'c3', page: 1 })));
    await userEvent.selectOptions(screen.getByLabelText('Enabled Track'), 't3');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'false');
    await waitFor(() =>
      expect(lmsEntityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ centreId: 'c3', trackId: 't3', status: 'false' })),
    );
  });

  it('offers Show deleted only with the delete permission', async () => {
    permissions.add('viewLmsEntities');
    permissions.add('updateLmsEntity');
    const { unmount } = renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsEntity');
    renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists the deleted entities with a Deleted badge; Restore asks first, shows a 409 answer, then restores and reloads', async () => {
    permissions.add('viewLmsEntities');
    permissions.add('updateLmsEntity');
    permissions.add('deleteLmsEntity');
    const gone = entity({ id: 'e9', name: 'Old Entity', code: 'OLD', isActive: false });
    vi.mocked(lmsEntityService.list).mockImplementation(async (q) => (q.deleted ? { ...page([gone]), deleted: true } : page([entity()])));
    vi.mocked(lmsEntityService.restore)
      .mockReset()
      .mockRejectedValueOnce(new ApiError('An entity with this code already exists', 409, 'CONFLICT', [{ field: 'code', message: 'This code is already used.' }]))
      .mockResolvedValueOnce(gone);
    renderWithProviders(<LmsEntityList />);
    await screen.findByText('Amrut Kalash');

    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    expect(lmsEntityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1 }));
    const row = (await screen.findByText('Old Entity')).closest('tr') as HTMLTableRowElement;
    expect(within(row).getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Deleted entities')).toBeInTheDocument();
    /* A deleted record is only restored: no View / Edit / status / Delete. */
    expect(within(row).queryByRole('button', { name: 'Edit Old Entity' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete Old Entity' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Restore Old Entity' }));
    expect(lmsEntityService.restore).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Restore the entity Old Entity (OLD)?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/An entity with this code already exists/)).toBeInTheDocument();
    expect(lmsEntityService.restore).toHaveBeenCalledWith('e9');

    const loads = vi.mocked(lmsEntityService.list).mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(lmsEntityService.restore).toHaveBeenCalledTimes(2);
    expect(vi.mocked(lmsEntityService.list).mock.calls.length).toBeGreaterThan(loads);
  });
});

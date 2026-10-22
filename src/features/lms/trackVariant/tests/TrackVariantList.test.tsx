import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import TrackVariantList from '../pages/TrackVariantList';
import { trackVariantService } from '../services/trackVariantService';
import { complete, courseOptions, ensureToastRoot, page, trackOptions, variant } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service (which wraps the option feeds). */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/trackVariantService', () => ({
  trackVariantService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), publish: vi.fn(), retire: vi.fn(), remove: vi.fn(),
    restore: vi.fn(), count: vi.fn(), formOptions: vi.fn(), variantsOfModule: vi.fn(), courseOptions: vi.fn(), moduleThreeOptions: vi.fn(),
    trackOptions: vi.fn(), tracksForEntity: vi.fn(), listItems: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn(),
    retireOftCard: vi.fn(),
  },
}));

const svc = vi.mocked(trackVariantService);
const published = () =>
  variant({ id: 'v2', trackId: 't1', track: { id: 't1', code: 'T01', name: 'Data Analytics', isActive: false }, status: 'PUBLISHED', completeness: complete(), isActive: false });

describe('<TrackVariantList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.list.mockReset().mockResolvedValue(page([variant(), published()]));
    svc.count.mockReset().mockImplementation(async (f = {}) => (f.status === 'PUBLISHED' ? 1 : f.status === 'DRAFT' ? 1 : f.completeness ? 1 : 2));
    svc.courseOptions.mockReset().mockResolvedValue(courseOptions);
    svc.trackOptions.mockReset().mockResolvedValue(trackOptions);
    svc.setStatus.mockReset();
    svc.remove.mockReset();
    svc.restore.mockReset();
  });

  it('lists track, course / module, stage, completeness and status with Sr. No., and the KPI totals', async () => {
    renderWithProviders(<TrackVariantList />);
    const row = (await screen.findByText('Cyber Security')).closest('tr') as HTMLTableRowElement;
    expect(row.cells[0]).toHaveTextContent('1');
    expect(row.cells[1]).toHaveTextContent('T07 Cyber Security');
    expect(row.cells[2]).toHaveTextContent('AK-DIP · Amrut Kalash Diploma');
    expect(row.cells[2]).toHaveTextContent('Module 3 · Track Specialisation');
    expect(within(row.cells[3]).getByText('Draft')).toBeInTheDocument();
    /* Incomplete, with the counts against the Module 3 shape. */
    expect(within(row.cells[4]).getByText('Incomplete · 3 missing')).toBeInTheDocument();
    expect(row.cells[4]).toHaveTextContent('Phases 2/7 · Modules 1/22 · OFT 1/12 · Gates 0/6 · Assessment 0/10');
    expect(within(row.cells[5]).getByText('Active')).toBeInTheDocument();

    const other = screen.getByText('Data Analytics', { selector: 'span' }).closest('tr') as HTMLTableRowElement;
    expect(other.cells[0]).toHaveTextContent('2');
    expect(within(other.cells[3]).getByText('Published')).toBeInTheDocument();
    expect(within(other.cells[4]).getByText('Complete')).toBeInTheDocument();
    expect(other.cells[1]).toHaveTextContent('Track inactive in the Admin Panel');
    expect(screen.getByText('Total variants').closest('.kpi')).toHaveTextContent('2');
    expect(screen.getByText('Incomplete', { selector: '.kpi-t' }).closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Track Variant Master', { selector: 'h1' })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    svc.list.mockResolvedValue(page([]));
    renderWithProviders(<TrackVariantList />);
    expect(await screen.findByText(/No track variants have been added yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    svc.list.mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<TrackVariantList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    svc.list.mockResolvedValue(page([variant()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Cyber Security')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held; Delete only for a draft', async () => {
    const { unmount } = renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');
    expect(screen.queryByRole('button', { name: /Add Track Variant/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit T07 · Cyber Security' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /T07 · Cyber Security/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete T07 · Cyber Security' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View T07 · Cyber Security' })).toBeInTheDocument();
    unmount();

    permissions.add('createLmsTrackVariant');
    permissions.add('updateLmsTrackVariant');
    permissions.add('deleteLmsTrackVariant');
    renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');
    expect(screen.getByRole('button', { name: /Add Track Variant/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit T07 · Cyber Security' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'T07 · Cyber Security: active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete T07 · Cyber Security' })).toBeInTheDocument();
    /* A published variant is retired from its page, never deleted. */
    expect(screen.queryByRole('button', { name: 'Delete T01 · Data Analytics' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting, then offers Restore', async () => {
    permissions.add('deleteLmsTrackVariant');
    svc.remove.mockResolvedValue();
    svc.restore.mockResolvedValue(variant({ isActive: false }));
    renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');

    await userEvent.click(screen.getByRole('button', { name: 'Delete T07 · Cyber Security' }));
    expect(screen.getByText(/Delete the draft track variant T07 · Cyber Security of AK-DIP\?/)).toBeInTheDocument();
    expect(svc.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('v1'));

    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(svc.restore).toHaveBeenCalledWith('v1'));
  });

  it('asks for confirmation before deactivating', async () => {
    permissions.add('updateLmsTrackVariant');
    svc.setStatus.mockResolvedValue(variant({ isActive: false }));
    renderWithProviders(<TrackVariantList />);
    await userEvent.click(await screen.findByRole('switch', { name: 'T07 · Cyber Security: active' }));
    expect(screen.getByText('Are you sure you want to deactivate the track variant T07 · Cyber Security?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(svc.setStatus).toHaveBeenCalledWith('v1', false));
  });

  it('sends the completeness, track, course and stage filters to the API', async () => {
    renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');
    await screen.findByRole('option', { name: 'Pilot Course (PILOT)' });
    await screen.findByRole('option', { name: 'Data Analytics (T01)' });
    await userEvent.selectOptions(screen.getByLabelText('Completeness'), 'incomplete');
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ completeness: 'incomplete', page: 1 })));
    await userEvent.selectOptions(screen.getByLabelText('Track'), 't1');
    await userEvent.selectOptions(screen.getByLabelText('Course'), 'c2');
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'PUBLISHED');
    await waitFor(() =>
      expect(svc.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ completeness: 'incomplete', trackId: 't1', courseId: 'c2', variantStatus: 'PUBLISHED' }),
      ),
    );
    /* The KPI totals follow the course. */
    await waitFor(() => expect(svc.count).toHaveBeenCalledWith({ courseId: 'c2', completeness: 'incomplete' }));
  });

  it('offers Show deleted only with the delete permission', async () => {
    permissions.add('viewLmsTrackVariants');
    permissions.add('updateLmsTrackVariant');
    const { unmount } = renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsTrackVariant');
    renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists the deleted variants with a Deleted badge; Restore asks first, shows a 409 answer, then restores and reloads', async () => {
    permissions.add('viewLmsTrackVariants');
    permissions.add('updateLmsTrackVariant');
    permissions.add('deleteLmsTrackVariant');
    const gone = variant({ id: 'v9', trackId: 't12', track: { id: 't12', code: 'T12', name: 'Cloud Computing', isActive: true }, isActive: false });
    svc.list.mockImplementation(async (q) => (q.deleted ? { ...page([gone]), deleted: true } : page([variant()])));
    svc.restore
      .mockRejectedValueOnce(new ApiError('A variant for this track already exists.', 409, 'CONFLICT', [{ field: 'trackId', message: 'A variant for this track already exists.' }]))
      .mockResolvedValueOnce(gone);
    renderWithProviders(<TrackVariantList />);
    await screen.findByText('Cyber Security');

    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1 }));
    const row = (await screen.findByText('Cloud Computing')).closest('tr') as HTMLTableRowElement;
    expect(within(row).getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Deleted track variants')).toBeInTheDocument();
    /* A deleted record is only restored: no View / Edit / status / Delete. */
    expect(within(row).queryByRole('button', { name: 'Edit T12 · Cloud Computing' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete T12 · Cloud Computing' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Restore T12 · Cloud Computing' }));
    expect(svc.restore).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Restore the track variant T12 · Cloud Computing of AK-DIP?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/A variant for this track already exists/)).toBeInTheDocument();
    expect(svc.restore).toHaveBeenCalledWith('v9');

    const loads = svc.list.mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(svc.restore).toHaveBeenCalledTimes(2);
    expect(svc.list.mock.calls.length).toBeGreaterThan(loads);
  });
});

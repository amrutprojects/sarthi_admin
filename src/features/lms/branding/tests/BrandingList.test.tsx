import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import BrandingList from '../pages/BrandingList';
import { brandingService } from '../services/brandingService';
import { configured, ensureToastRoot, unset } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/brandingService', () => ({
  brandingService: { get: vi.fn(), update: vi.fn(), uploadLogo: vi.fn(), removeLogo: vi.fn(), logoBlob: vi.fn(), languages: vi.fn(), entities: vi.fn() },
}));

const ENTITIES = [
  { id: 'e1', name: 'Sarthi', code: 'AMK', isActive: true },
  { id: 'e2', name: 'Pilot Entity', code: 'PILOT', isActive: false },
];

const rowOf = async (name: string) => (await screen.findByText(name, { selector: 'b' })).closest('tr') as HTMLTableRowElement;

describe('<BrandingList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('viewLmsBranding');
    vi.mocked(brandingService.entities).mockReset().mockResolvedValue(ENTITIES);
    vi.mocked(brandingService.get)
      .mockReset()
      .mockImplementation(async (id: string) => (id === 'e1' ? configured() : unset({ id: 'e2', name: 'Pilot Entity', code: 'PILOT', isActive: false })));
  });

  it('lists each entity with the state of its branding, the Sr. No. and the KPI totals', async () => {
    renderWithProviders(<BrandingList />);
    /* By name: Pilot Entity, then Sarthi. */
    const amk = await rowOf('Sarthi');
    expect(amk.cells[0]).toHaveTextContent('2');
    expect(amk.cells[2]).toHaveTextContent('AMK');
    expect(amk.cells[3]).toHaveTextContent('Sarthi LMS');
    expect(within(amk.cells[4]).getByText('Uploaded')).toBeInTheDocument();
    expect(amk.cells[5]).toHaveTextContent('#1F4E79');
    expect(amk.cells[6]).toHaveTextContent('help@amrut.org');
    expect(amk.cells[7]).toHaveTextContent('en, mr');
    expect(within(amk.cells[8]).getByText('Complete')).toBeInTheDocument();
    expect(amk.cells[8]).toHaveTextContent('7 of 7 set');

    const pilot = await rowOf('Pilot Entity');
    expect(pilot.cells[0]).toHaveTextContent('1');
    /* Not set: the entity name is used, the support email is missing. */
    expect(pilot.cells[3]).toHaveTextContent('Pilot Entity (entity name)');
    expect(pilot.cells[4]).toHaveTextContent('Platform default');
    expect(pilot.cells[6]).toHaveTextContent('Not set');
    expect(within(pilot.cells[8]).getByText('Missing required')).toBeInTheDocument();
    expect(within(pilot.cells[9]).getByText('Inactive')).toBeInTheDocument();

    expect(screen.getByText('Configuration complete').closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Missing required settings', { selector: '.kpi *' }).closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Custom logo').closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Branding & Settings', { selector: 'h1' })).toBeInTheDocument();
  });

  it('reads the active entity feed only without Entity Master access, and the full list with it', async () => {
    const { unmount } = renderWithProviders(<BrandingList />);
    await rowOf('Sarthi');
    expect(brandingService.entities).toHaveBeenCalledWith(false);
    expect(screen.getByText(/Active entities only/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Entity Status')).not.toBeInTheDocument();
    unmount();

    permissions.add('viewLmsEntities');
    renderWithProviders(<BrandingList />);
    await rowOf('Sarthi');
    expect(brandingService.entities).toHaveBeenLastCalledWith(true);
    expect(screen.getByLabelText('Entity Status')).toBeInTheDocument();
  });

  it('filters by configuration and searches name, code and display name in the browser', async () => {
    renderWithProviders(<BrandingList />);
    await rowOf('Sarthi');
    await userEvent.selectOptions(screen.getByLabelText('Configuration'), 'missing');
    expect(screen.queryByText('Sarthi', { selector: 'b' })).not.toBeInTheDocument();
    expect(screen.getByText('Pilot Entity', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('filtered')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Configuration'), '');
    await userEvent.type(screen.getByPlaceholderText(/Search entity name/), 'LMS');
    await waitFor(() => expect(screen.queryByText('Pilot Entity', { selector: 'b' })).not.toBeInTheDocument());
    expect(screen.getByText('Sarthi', { selector: 'b' })).toBeInTheDocument();
    /* Only one read per entity: filtering does not go back to the server. */
    expect(brandingService.get).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state', async () => {
    vi.mocked(brandingService.entities).mockResolvedValue([]);
    renderWithProviders(<BrandingList />);
    expect(await screen.findByText(/No active LMS entity is available/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(brandingService.entities).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<BrandingList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(brandingService.entities).mockResolvedValue(ENTITIES);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await rowOf('Sarthi')).toBeInTheDocument();
  });

  it('marks only the row whose settings could not be read', async () => {
    vi.mocked(brandingService.get).mockImplementation(async (id: string) => {
      if (id === 'e2') throw new ApiError('Entity not found', 404, 'NOT_FOUND');
      return configured();
    });
    renderWithProviders(<BrandingList />);
    const pilot = await rowOf('Pilot Entity');
    expect(within(pilot).getByText('Could not load')).toBeInTheDocument();
    expect(within(pilot).getByText('Entity not found')).toBeInTheDocument();
    expect(within(await rowOf('Sarthi')).getByText('Complete')).toBeInTheDocument();
  });

  it('shows Edit only to a user who may update branding', async () => {
    const { unmount } = renderWithProviders(<BrandingList />);
    await rowOf('Sarthi');
    expect(screen.getByRole('button', { name: 'View branding of Sarthi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit branding of Sarthi' })).not.toBeInTheDocument();
    /* Configuration, not a catalogue: nothing to add or delete. */
    expect(screen.queryByRole('button', { name: /Add|Delete/ })).not.toBeInTheDocument();
    unmount();

    permissions.add('editLmsBranding');
    renderWithProviders(<BrandingList />);
    await rowOf('Sarthi');
    expect(screen.getByRole('button', { name: 'Edit branding of Sarthi' })).toBeInTheDocument();
  });
});

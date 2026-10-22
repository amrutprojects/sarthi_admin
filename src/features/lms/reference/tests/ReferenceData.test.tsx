import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import ReferenceData from '../pages/ReferenceData';
import { referenceService } from '../services/referenceService';
import type { ApiReferenceCentre, ApiReferenceDistrict, ApiReferenceTrack, ReferenceSummary } from '../types/reference.types';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
const permissions = new Set<string>();
const openable = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  useCanOpen: () => (navKey: string) => openable.has(navKey),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/referenceService', () => ({
  referenceService: { summary: vi.fn(), districts: vi.fn(), centres: vi.fn(), tracks: vi.fn() },
}));

const AT = '2026-10-01T10:00:00.000Z';

const summary: ReferenceSummary = {
  districts: { total: 3, active: 2, inactive: 1, sourceUpdatedAt: AT },
  centres: { total: 2, active: 2, inactive: 0, sourceUpdatedAt: AT },
  tracks: { total: 12, active: 12, inactive: 0, sourceUpdatedAt: AT },
  sync: { mode: 'LIVE', source: 'Admin Panel (same database)' },
};

const district = (over: Partial<ApiReferenceDistrict> = {}): ApiReferenceDistrict => ({
  id: 'd1', code: 'PUN', name: 'Pune', stateId: 's1', stateName: 'Maharashtra', stateCode: 'MH', stateIsActive: true, isActive: true,
  sourceUpdatedAt: AT, ...over,
});

const centre = (over: Partial<ApiReferenceCentre> = {}): ApiReferenceCentre => ({
  id: 'c1', code: 'PNC1', name: 'Pune Main Centre', districtId: 'd1', districtName: 'Pune', districtCode: 'PUN', districtIsActive: true,
  stateName: 'Maharashtra', centreTypeName: 'Owned', talukaName: 'Haveli', maxSeatingCapacity: 40, computerSystems: 30, isActive: true,
  sourceUpdatedAt: AT, ...over,
});

const track = (over: Partial<ApiReferenceTrack> = {}): ApiReferenceTrack => ({
  id: 't8', code: 'T08', name: 'AI/ML Engineer', aliases: ['AI/ML Engineer', 'AI-ML Engineer'], sortOrder: 8, isActive: true,
  sourceUpdatedAt: AT, ...over,
});

const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

const ROUTE = '/lms/reference-data';

describe('<ReferenceData>', () => {
  beforeEach(() => {
    permissions.clear();
    openable.clear();
    vi.mocked(referenceService.summary).mockReset().mockResolvedValue(summary);
    vi.mocked(referenceService.districts).mockReset().mockResolvedValue(page([district(), district({ id: 'd2', code: 'AHM', name: 'Ahmednagar', isActive: false })]));
    vi.mocked(referenceService.centres).mockReset().mockResolvedValue(page([centre(), centre({ id: 'c2', code: 'NRC1', name: 'Nashik Road Centre', centreTypeName: null, talukaName: null, maxSeatingCapacity: null, computerSystems: null })]));
    vi.mocked(referenceService.tracks).mockReset().mockResolvedValue(page([track()]));
  });

  it('shows the KPI row from the summary, the live-source banner and the districts', async () => {
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('Ahmednagar')).toBeInTheDocument();
    expect(screen.getAllByText('Maharashtra')).toHaveLength(2);
    expect(await screen.findByText('2 active · 1 inactive')).toBeInTheDocument();
    expect(screen.getByText(/Source: Admin Panel \(same database\) · live/)).toBeInTheDocument();
    expect(screen.getByText(/no copy and no synchronisation job/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Districts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
    /* Sr. No. column. */
    expect(screen.getByText('Sr. No.')).toBeInTheDocument();
  });

  it('is read-only: no Add, Edit, Delete, status toggle or synchronise action', async () => {
    permissions.add('viewDistricts');
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    expect(screen.queryByRole('button', { name: /add|edit|delete|activate|deactivate|synchron/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    vi.mocked(referenceService.districts).mockResolvedValue(page([]));
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/The Admin Panel has no districts yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(referenceService.districts).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(referenceService.districts).mockResolvedValue(page([district()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Pune')).toBeInTheDocument();
  });

  it('shows a summary failure with its own Retry', async () => {
    vi.mocked(referenceService.summary).mockRejectedValue(new ApiError('Summary down', 500, 'ERROR'));
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByText(/Summary down/)).toBeInTheDocument();
    vi.mocked(referenceService.summary).mockResolvedValue(summary);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('2 active · 1 inactive')).toBeInTheDocument();
  });

  it('offers "open in the Admin Panel" only to users who may open that master', async () => {
    const { unmount } = renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    expect(screen.queryByRole('button', { name: 'Open Pune in the District Master' })).not.toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
    unmount();

    permissions.add('viewDistricts');
    openable.add('cms-districts');
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByRole('button', { name: 'Open Pune in the District Master' })).toBeInTheDocument();
  });

  it('passes the status filter and the search to the API', async () => {
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'false');
    await waitFor(() => expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'false', page: 1 })));
    await userEvent.type(screen.getByPlaceholderText('Search district, code or state...'), 'pun');
    await waitFor(() => expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'pun', status: 'false' })));
  });

  it('shows training centres with capacity and the To Be Confirmed fields', async () => {
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    await userEvent.click(screen.getByRole('tab', { name: 'Training Centres' }));
    expect(await screen.findByText('Pune Main Centre')).toBeInTheDocument();
    expect(referenceService.centres).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'name', page: 1 }));
    const row = screen.getByText('Pune Main Centre').closest('tr')!;
    expect(within(row).getByText('Owned')).toBeInTheDocument();
    expect(within(row).getByText('Haveli')).toBeInTheDocument();
    expect(within(row).getByText('40')).toBeInTheDocument();
    expect(within(row).getByText('30')).toBeInTheDocument();
    const bare = screen.getByText('Nashik Road Centre').closest('tr')!;
    expect(within(bare).getAllByTitle(/No capacity & infrastructure record/)).toHaveLength(2);
    expect(screen.getByText(/readiness status and tracks offered/)).toBeInTheDocument();
    expect(screen.getByText('To Be Confirmed:')).toBeInTheDocument();
  });

  it('shows the loading state until the summary and the list arrive', async () => {
    vi.mocked(referenceService.summary).mockReturnValue(new Promise(() => {}));
    vi.mocked(referenceService.districts).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    expect(await screen.findByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/Source: loading/)).toBeInTheDocument();
    /* KPI tiles show a dash, never a wrong zero, while the counts load. */
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('No records found')).not.toBeInTheDocument();
  });

  it('sorts on the server when a column header is clicked', async () => {
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' }));
    await userEvent.click(screen.getByRole('columnheader', { name: /District Code/ }));
    await waitFor(() => expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'code', sortOrder: 'asc', page: 1 })));
    await userEvent.click(screen.getByRole('columnheader', { name: /District Code/ }));
    await waitFor(() => expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'code', sortOrder: 'desc' })));
    /* Sr. No., Status and the capacity columns are presentation-only. */
    await userEvent.click(screen.getByRole('columnheader', { name: 'Status' }));
    expect(referenceService.districts).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'code' }));
  });

  it('labels a centre whose district the Admin Panel deactivated', async () => {
    vi.mocked(referenceService.centres).mockResolvedValue(page([centre({ id: 'c3', code: 'AHC1', name: 'Ahmednagar Centre', districtName: 'Ahmednagar', districtIsActive: false, isActive: false })]));
    renderWithProviders(<ReferenceData />, { route: `${ROUTE}?tab=centres` });
    const row = (await screen.findByText('Ahmednagar Centre')).closest('tr')!;
    expect(within(row).getByText('(inactive)')).toBeInTheDocument();
    expect(within(row).getByText('Inactive')).toBeInTheDocument();
  });

  it('opens the matching tab from a KPI tile', async () => {
    renderWithProviders(<ReferenceData />, { route: ROUTE });
    await screen.findByText('Pune');
    await userEvent.click(screen.getByText('Technology tracks'));
    expect(await screen.findByText('AI/ML Engineer')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Technology Tracks' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Technology Tracks' })).toBeInTheDocument();
  });

  it('opens a tab from the URL and lists technology tracks in their order', async () => {
    renderWithProviders(<ReferenceData />, { route: `${ROUTE}?tab=tracks` });
    expect(await screen.findByText('AI/ML Engineer')).toBeInTheDocument();
    expect(screen.getByText('AI/ML Engineer, AI-ML Engineer')).toBeInTheDocument();
    expect(referenceService.tracks).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'sortOrder' }));
    expect(referenceService.districts).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Technology Tracks' })).toHaveAttribute('aria-selected', 'true');
  });
});

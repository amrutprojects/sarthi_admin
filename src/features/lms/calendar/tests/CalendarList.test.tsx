import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CalendarList from '../pages/CalendarList';
import { calendarService } from '../services/calendarService';
import { CENTRE_ID, calendar, centreOptions, ensureToastRoot, entityOptions, page } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module, the API service, the option feeds. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/calendarService', () => ({
  calendarService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(), count: vi.fn(),
    formOptions: vi.fn(), learningConfig: vi.fn(), updateLearningConfig: vi.fn(),
  },
}));
vi.mock('../../options', () => ({ lmsOptions: { centres: vi.fn(), tracks: vi.fn(), entities: vi.fn(), courses: vi.fn(), modules: vi.fn() } }));

const exception = () =>
  calendar({
    id: 'cal2',
    name: 'Nashik Exception 2026',
    centreId: CENTRE_ID,
    centre: { id: CENTRE_ID, name: 'Nashik Road Centre', code: 'TC0001', isActive: false },
    type: 'CENTRE',
    workingDays: ['MON', 'WED', 'FRI'],
    holidayCount: 0,
    isActive: false,
  });

describe('<CalendarList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(calendarService.list).mockReset().mockResolvedValue(page([calendar(), exception()]));
    vi.mocked(calendarService.count).mockReset().mockImplementation(async (f = {}) => (f.isActive === 'true' ? 1 : f.type === 'CENTRE' ? 1 : 2));
    vi.mocked(calendarService.setStatus).mockReset();
    vi.mocked(calendarService.remove).mockReset();
    vi.mocked(calendarService.restore).mockReset();
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
    vi.mocked(lmsOptions.centres).mockReset().mockResolvedValue(centreOptions);
  });

  it('lists the calendars with entity, scope, period, working days, holidays, status and Sr. No., and the KPI totals', async () => {
    renderWithProviders(<CalendarList />);
    const row = (await screen.findByText('Academic Year 2026-27')).closest('tr') as HTMLTableRowElement;
    expect(row.cells[0]).toHaveTextContent('1');
    expect(row.cells[2]).toHaveTextContent('Sarthi');
    expect(row.cells[3]).toHaveTextContent('All centresEntity-wide');
    expect(row.cells[4]).toHaveTextContent('01 Jun 2026');
    expect(row.cells[5]).toHaveTextContent('31 May 2027');
    expect(row.cells[6]).toHaveTextContent('Mon–Fri');
    expect(row.cells[7]).toHaveTextContent('2');
    expect(within(row.cells[8]).getByText('Active')).toBeInTheDocument();

    const ex = screen.getByText('Nashik Exception 2026').closest('tr') as HTMLTableRowElement;
    expect(ex.cells[0]).toHaveTextContent('2');
    /* A centre deactivated in the Admin Panel since is flagged. */
    expect(ex.cells[3]).toHaveTextContent('Nashik Road Centre (inactive)Centre exception');
    expect(ex.cells[6]).toHaveTextContent('Mon, Wed, Fri');
    expect(within(ex.cells[8]).getByText('Inactive')).toBeInTheDocument();

    expect(screen.getByText('Total calendars').closest('.kpi')).toHaveTextContent('2');
    expect(screen.getByText('Centre exceptions').closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Academic Calendar', { selector: 'h1' })).toBeInTheDocument();
    /* Learning configuration has its own permission: no tab bar for a calendar-only user. */
    expect(screen.queryByRole('tab', { name: 'Learning configuration' })).not.toBeInTheDocument();
    /* Newest period first by default. */
    expect(calendarService.list).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'validFrom', sortOrder: 'desc', page: 1 }));
  });

  it('shows the Learning configuration tab only with lms-learning-config.view', async () => {
    permissions.add('viewLmsLearningConfig');
    renderWithProviders(<CalendarList />);
    expect(await screen.findByRole('tab', { name: 'Learning configuration' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Calendars' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the empty state', async () => {
    vi.mocked(calendarService.list).mockResolvedValue(page([]));
    renderWithProviders(<CalendarList />);
    expect(await screen.findByText(/No calendars have been added yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(calendarService.list).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<CalendarList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(calendarService.list).mockResolvedValue(page([calendar()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Academic Year 2026-27')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held', async () => {
    const { unmount } = renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');
    expect(screen.queryByRole('button', { name: /Add Calendar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Academic Year 2026-27' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Academic Year 2026-27/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Academic Year 2026-27' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Academic Year 2026-27' })).toBeInTheDocument();
    unmount();

    permissions.add('createLmsCalendar');
    permissions.add('updateLmsCalendar');
    permissions.add('deleteLmsCalendar');
    renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');
    expect(screen.getByRole('button', { name: /Add Calendar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Academic Year 2026-27' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Academic Year 2026-27: active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Academic Year 2026-27' })).toBeInTheDocument();
  });

  it('asks for confirmation before deactivating and deleting, and offers to restore what was deleted', async () => {
    permissions.add('updateLmsCalendar');
    permissions.add('deleteLmsCalendar');
    vi.mocked(calendarService.setStatus).mockResolvedValue(calendar({ isActive: false }));
    vi.mocked(calendarService.remove).mockResolvedValue();
    vi.mocked(calendarService.restore).mockResolvedValue(calendar({ isActive: false }));
    renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');

    await userEvent.click(screen.getByRole('switch', { name: 'Academic Year 2026-27: active' }));
    expect(screen.getByText('Are you sure you want to deactivate the calendar Academic Year 2026-27?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(calendarService.setStatus).toHaveBeenCalledWith('cal1', false));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Academic Year 2026-27' }));
    expect(screen.getByText(/It is archived \(soft-deleted\) with its holidays/)).toBeInTheDocument();
    expect(calendarService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calendarService.remove).toHaveBeenCalledWith('cal1'));

    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(screen.getByText(/It comes back inactive, with its holidays/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calendarService.restore).toHaveBeenCalledWith('cal1'));
    await waitFor(() => expect(screen.queryByText(/was archived/)).not.toBeInTheDocument());
  });

  it('sends the entity, centre, type, year and status filters to the API', async () => {
    renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');
    await screen.findByRole('option', { name: 'Pilot Entity (PILOT)' });
    /* Unfiltered, the centre filter offers every active centre. */
    expect(lmsOptions.centres).toHaveBeenCalledWith(undefined);
    await userEvent.selectOptions(screen.getByLabelText('Centre'), 'c3');
    await waitFor(() => expect(calendarService.list).toHaveBeenLastCalledWith(expect.objectContaining({ centreId: 'c3' })));
    /* A new entity narrows the centres to those enabled for it and drops the centre chosen before. */
    await userEvent.selectOptions(screen.getByLabelText('Entity'), 'e2');
    await waitFor(() => expect(calendarService.list).toHaveBeenLastCalledWith(expect.objectContaining({ entityId: 'e2', centreId: '', page: 1 })));
    await waitFor(() => expect(lmsOptions.centres).toHaveBeenLastCalledWith('e2'));
    /* The KPIs follow the entity scope. */
    await waitFor(() => expect(calendarService.count).toHaveBeenCalledWith({ entityId: 'e2' }));
    await screen.findByRole('option', { name: /Pune Main Centre/ });
    await userEvent.selectOptions(screen.getByLabelText('Centre'), 'c3');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'CENTRE');
    const year = String(new Date().getFullYear());
    await userEvent.selectOptions(screen.getByLabelText('Year'), year);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'true');
    await waitFor(() =>
      expect(calendarService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ entityId: 'e2', centreId: 'c3', type: 'CENTRE', year, status: 'true' }),
      ),
    );
  });

  it('offers Show deleted only with the delete permission', async () => {
    permissions.add('viewLmsCalendars');
    permissions.add('updateLmsCalendar');
    const { unmount } = renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsCalendar');
    renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists the deleted calendars with a Deleted badge; Restore asks first, shows a 409 answer, then restores and reloads', async () => {
    permissions.add('viewLmsCalendars');
    permissions.add('updateLmsCalendar');
    permissions.add('deleteLmsCalendar');
    const gone = calendar({ id: 'cal9', name: 'Old Calendar 2025', isActive: false });
    vi.mocked(calendarService.list).mockImplementation(async (q) => (q.deleted ? { ...page([gone]), deleted: true } : page([calendar()])));
    vi.mocked(calendarService.restore)
      .mockRejectedValueOnce(new ApiError('A calendar with this name already exists in the entity', 409, 'CONFLICT', [{ field: 'name', message: 'This name is already used.' }]))
      .mockResolvedValueOnce(gone);
    renderWithProviders(<CalendarList />);
    await screen.findByText('Academic Year 2026-27');

    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    expect(calendarService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1 }));
    const row = (await screen.findByText('Old Calendar 2025')).closest('tr') as HTMLTableRowElement;
    expect(within(row).getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Deleted calendars')).toBeInTheDocument();
    /* A deleted record is only restored: no View / Edit / status / Delete. */
    expect(within(row).queryByRole('button', { name: 'Edit Old Calendar 2025' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete Old Calendar 2025' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Restore Old Calendar 2025' }));
    expect(calendarService.restore).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Restore the calendar Old Calendar 2025');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/A calendar with this name already exists in the entity/)).toBeInTheDocument();
    expect(calendarService.restore).toHaveBeenCalledWith('cal9');

    const loads = vi.mocked(calendarService.list).mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calendarService.restore).toHaveBeenCalledTimes(2);
    expect(vi.mocked(calendarService.list).mock.calls.length).toBeGreaterThan(loads);
  });
});

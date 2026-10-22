import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import CalendarView from '../pages/CalendarView';
import { calendarService } from '../services/calendarService';
import { CENTRE_ID, calendar, ensureToastRoot } from './fixtures';

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

const renderView = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/calendars/:id" element={<CalendarView />} />
      <Route path="/lms/calendars" element={<div>calendar list</div>} />
    </Routes>,
    { route: '/lms/calendars/cal1' },
  );

describe('<CalendarView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(calendarService.get).mockReset().mockResolvedValue(calendar());
    vi.mocked(calendarService.remove).mockReset();
    vi.mocked(calendarService.restore).mockReset();
    vi.mocked(calendarService.setStatus).mockReset();
  });

  it('shows the details, the period summary, the holidays and the year view, without write actions', async () => {
    renderView();
    expect(await screen.findByRole('heading', { name: /Academic Year 2026-27/ })).toBeInTheDocument();
    expect(screen.getByText('Mon, 01 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('All centres of the entity')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Working days' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Saturday: not a working day' })).toBeInTheDocument();
    /* 365 days, 261 weekdays; 15 Aug 2026 is a Saturday, so only 2 Oct removes a working day. */
    expect(screen.getByText('Days in the period').nextSibling).toHaveTextContent('365');
    expect(screen.getByText('Working days in the period').nextSibling).toHaveTextContent('261');
    expect(screen.getByText('Holidays', { selector: '.kv span' }).nextSibling).toHaveTextContent('2 (1 on working days)');
    expect(screen.getByText('Teaching days').nextSibling).toHaveTextContent('260');
    const holidays = screen.getByRole('table', { name: 'Holidays' });
    expect(within(holidays).getByText('Independence Day')).toBeInTheDocument();
    expect(within(holidays).getByText('Sat, 15 Aug 2026')).toBeInTheDocument();
    expect(within(holidays).getByText('Falls on a non-working day')).toBeInTheDocument();
    /* Year view: June 2026 to May 2027, holidays marked. */
    expect(screen.getByRole('table', { name: 'June 2026' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'May 2027' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2026-10-02: holiday, Gandhi Jayanti' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2026-06-06: not a working day' })).toBeInTheDocument();

    /* Learning configuration has its own permission (lms-learning-config.view). */
    expect(screen.queryByRole('button', { name: 'Learning configuration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('links to the learning configuration only with lms-learning-config.view', async () => {
    permissions.add('viewLmsLearningConfig');
    renderView();
    expect(await screen.findByRole('button', { name: 'Learning configuration' })).toBeInTheDocument();
  });

  it('warns about a centre deactivated in the Admin Panel', async () => {
    vi.mocked(calendarService.get).mockResolvedValue(
      calendar({ centreId: CENTRE_ID, centre: { id: CENTRE_ID, name: 'Nashik Road Centre', code: 'TC0001', isActive: false }, type: 'CENTRE' }),
    );
    renderView();
    expect(await screen.findByText('The centre Nashik Road Centre is inactive in the Admin Panel.')).toBeInTheDocument();
    expect(screen.getByText('Centre exception', { selector: '.tag' })).toBeInTheDocument();
  });

  it('asks before deleting, then offers Restore on the archived calendar', async () => {
    permissions.add('updateLmsCalendar');
    permissions.add('deleteLmsCalendar');
    vi.mocked(calendarService.remove).mockResolvedValue();
    vi.mocked(calendarService.restore).mockResolvedValue(calendar({ isActive: false }));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete the calendar Academic Year 2026-27?');
    expect(calendarService.remove).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calendarService.remove).toHaveBeenCalledWith('cal1'));

    expect(await screen.findByText('This calendar has been archived.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    vi.mocked(calendarService.get).mockResolvedValue(calendar({ isActive: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calendarService.restore).toHaveBeenCalledWith('cal1'));
    expect(await screen.findByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(screen.queryByText('This calendar has been archived.')).not.toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(calendarService.get).mockRejectedValue(new ApiError('Calendar not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Calendar not found/)).toBeInTheDocument();
    vi.mocked(calendarService.get).mockResolvedValue(calendar());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Academic Year 2026-27/ })).toBeInTheDocument();
  });
});

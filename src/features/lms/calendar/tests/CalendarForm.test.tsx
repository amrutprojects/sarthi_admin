import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CalendarCreate from '../pages/CalendarCreate';
import CalendarEdit from '../pages/CalendarEdit';
import { calendarService } from '../services/calendarService';
import { CENTRE_ID, ENTITY_ID, calendar, centreOptions, ensureToastRoot, entityOptions } from './fixtures';

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

const save = () => userEvent.click(screen.getByRole('button', { name: /Create calendar|Save changes/ }));
/* Date inputs: set the value the browser's picker would. */
const setDate = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};

const renderCreate = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/calendars/create" element={<CalendarCreate />} />
      <Route path="/lms/calendars/:id" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/calendars/create' },
  );

/* Fills a valid calendar for the first entity. */
async function fillValid() {
  await screen.findByRole('option', { name: 'Amrut Kalash (AMK)' });
  await userEvent.selectOptions(screen.getByLabelText(/Entity/), ENTITY_ID);
  await userEvent.type(screen.getByLabelText(/Calendar Name/), '  Academic   Year 2026-27 ');
  setDate(screen.getByLabelText(/Valid From/), '2026-06-01');
  setDate(screen.getByLabelText(/Valid To/), '2027-05-31');
  await userEvent.click(screen.getByRole('button', { name: 'Mon–Fri' }));
}

describe('Calendar form (Add)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('createLmsCalendar');
    vi.mocked(calendarService.create).mockReset();
    vi.mocked(lmsOptions.centres).mockReset().mockResolvedValue([centreOptions[0]]);
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderCreate();
    await screen.findByRole('option', { name: 'Amrut Kalash (AMK)' });
    await save();
    expect(await screen.findByText('Select an entity.')).toBeInTheDocument();
    expect(screen.getByText('Enter a calendar name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the start date.')).toBeInTheDocument();
    expect(screen.getByText('Enter the end date.')).toBeInTheDocument();
    expect(screen.getByText('Select at least one working day.')).toBeInTheDocument();
    /* The centre waits for the entity. */
    expect(screen.getByLabelText(/Centre/)).toBeDisabled();

    setDate(screen.getByLabelText(/Valid From/), '2026-06-01');
    setDate(screen.getByLabelText(/Valid To/), '2026-06-01');
    expect(await screen.findByText('The end date must be after the start date.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Valid To/)).toHaveAttribute('aria-invalid', 'true');
    expect(calendarService.create).not.toHaveBeenCalled();
  });

  it('offers only the centres enabled for the chosen entity', async () => {
    renderCreate();
    await screen.findByRole('option', { name: 'Amrut Kalash (AMK)' });
    await userEvent.selectOptions(screen.getByLabelText(/Entity/), ENTITY_ID);
    await waitFor(() => expect(lmsOptions.centres).toHaveBeenCalledWith(ENTITY_ID));
    const centre = screen.getByLabelText(/Centre/);
    await within(centre).findByRole('option', { name: 'Nashik Road Centre (TC0001) · Nashik' });
    expect(within(centre).queryByRole('option', { name: /Pune Main Centre/ })).not.toBeInTheDocument();
    expect(within(centre).getByRole('option', { name: 'All centres (entity-wide calendar)' })).toBeInTheDocument();
    expect(screen.getByText(/one of the 1 centres enabled for the entity/)).toBeInTheDocument();
  });

  it('validates the holiday rows: date inside the period, no duplicate date, a name', async () => {
    renderCreate();
    await fillValid();
    await userEvent.click(screen.getByRole('button', { name: /Add holiday/ }));
    await userEvent.click(screen.getByRole('button', { name: /Add holiday/ }));
    await userEvent.click(screen.getByRole('button', { name: /Add holiday/ }));
    setDate(screen.getByLabelText('Holiday 1 date'), '2026-08-15');
    await userEvent.type(screen.getByLabelText('Holiday 1 name'), 'Independence Day');
    setDate(screen.getByLabelText('Holiday 2 date'), '2026-08-15');
    await userEvent.type(screen.getByLabelText('Holiday 2 name'), 'Again');
    setDate(screen.getByLabelText('Holiday 3 date'), '2027-08-15');
    await save();
    expect(await screen.findByText('This date is already a holiday.')).toBeInTheDocument();
    expect(screen.getByText('The date must be between 2026-06-01 and 2027-05-31.')).toBeInTheDocument();
    expect(screen.getByText('Enter the holiday name.')).toBeInTheDocument();
    expect(calendarService.create).not.toHaveBeenCalled();

    /* Removing the bad rows makes the form valid. */
    await userEvent.click(screen.getByRole('button', { name: 'Remove holiday 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove holiday 2' }));
    vi.mocked(calendarService.create).mockResolvedValue(calendar({ id: 'new1' }));
    await save();
    await waitFor(() => expect(calendarService.create).toHaveBeenCalled());
  });

  it('creates a centre exception calendar with the normalised values and goes to its page', async () => {
    vi.mocked(calendarService.create).mockResolvedValue(calendar({ id: 'new1' }));
    renderCreate();
    await fillValid();
    const centre = screen.getByLabelText(/Centre/);
    await within(centre).findByRole('option', { name: /Nashik Road Centre/ });
    await userEvent.selectOptions(centre, CENTRE_ID);
    await userEvent.click(screen.getByLabelText('Saturday'));
    await userEvent.click(screen.getByRole('button', { name: /Add holiday/ }));
    setDate(screen.getByLabelText('Holiday 1 date'), '2026-10-02');
    await userEvent.type(screen.getByLabelText('Holiday 1 name'), ' Gandhi   Jayanti ');
    await save();

    await waitFor(() =>
      expect(calendarService.create).toHaveBeenCalledWith({
        entityId: ENTITY_ID,
        centreId: CENTRE_ID,
        name: 'Academic Year 2026-27',
        validFrom: '2026-06-01',
        validTo: '2027-05-31',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        holidays: [{ date: '2026-10-02', name: 'Gandhi Jayanti' }],
        isActive: true,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('shows a 409 overlap answer on the period and the server summary, keeping the values', async () => {
    vi.mocked(calendarService.create).mockRejectedValue(
      new ApiError('The period overlaps another calendar (Term 1, 2026-01-01 to 2026-12-31).', 409, 'CONFLICT', [
        { field: 'validFrom', message: 'The period overlaps another calendar.' },
      ]),
    );
    renderCreate();
    await fillValid();
    await save();
    expect(await screen.findByText('The period overlaps another calendar.')).toBeInTheDocument();
    expect(screen.getByText(/Term 1, 2026-01-01 to 2026-12-31/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Valid From/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Calendar Name/)).toHaveValue('  Academic   Year 2026-27 ');
  });

  it('puts a 400 holiday answer on the matching row and a 409 duplicate name on the name', async () => {
    vi.mocked(calendarService.create).mockRejectedValue(
      new ApiError('A holiday falls outside the calendar period', 400, 'BAD_REQUEST', [
        { field: 'holidays.0.date', message: 'The date must be between 2026-06-01 and 2027-05-31.' },
      ]),
    );
    renderCreate();
    await fillValid();
    await userEvent.click(screen.getByRole('button', { name: /Add holiday/ }));
    setDate(screen.getByLabelText('Holiday 1 date'), '2026-08-15');
    await userEvent.type(screen.getByLabelText('Holiday 1 name'), 'Independence Day');
    await save();
    expect(await screen.findByText('The date must be between 2026-06-01 and 2027-05-31.')).toBeInTheDocument();
    expect(screen.getByLabelText('Holiday 1 date')).toHaveAttribute('aria-invalid', 'true');

    vi.mocked(calendarService.create).mockRejectedValue(
      new ApiError('A calendar with this name already exists in the entity', 409, 'CONFLICT', [
        { field: 'name', message: 'This name is already used in the entity.' },
      ]),
    );
    setDate(screen.getByLabelText('Holiday 1 date'), '2026-08-16');
    await save();
    expect(await screen.findByText('This name is already used in the entity.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Calendar Name/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('says when no centre is enabled for the entity, leaving only the entity-wide calendar', async () => {
    vi.mocked(lmsOptions.centres).mockResolvedValue([]);
    renderCreate();
    await screen.findByRole('option', { name: 'Amrut Kalash (AMK)' });
    await userEvent.selectOptions(screen.getByLabelText(/Entity/), ENTITY_ID);
    expect(await screen.findByText(/No active centre is enabled for this entity/)).toBeInTheDocument();
    expect(within(screen.getByLabelText(/Centre/)).getAllByRole('option')).toHaveLength(1);
  });
});

describe('Calendar form (Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('updateLmsCalendar');
    vi.mocked(calendarService.update).mockReset();
    vi.mocked(calendarService.setStatus).mockReset();
    vi.mocked(lmsOptions.centres).mockReset().mockResolvedValue([centreOptions[1]]);
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  const renderEdit = () =>
    renderWithProviders(
      <Routes>
        <Route path="/lms/calendars/:id/edit" element={<CalendarEdit />} />
        <Route path="/lms/calendars/:id" element={<div>view page</div>} />
      </Routes>,
      { route: '/lms/calendars/cal2/edit' },
    );

  it('fixes the entity, keeps a saved centre no longer enabled, and sends the update after confirmation', async () => {
    vi.mocked(calendarService.get).mockReset().mockResolvedValue(
      calendar({ id: 'cal2', centreId: CENTRE_ID, centre: { id: CENTRE_ID, name: 'Nashik Road Centre', code: 'TC0001', isActive: true }, type: 'CENTRE' }),
    );
    vi.mocked(calendarService.update).mockResolvedValue(calendar());
    renderEdit();
    expect(await screen.findByDisplayValue('Academic Year 2026-27')).toBeInTheDocument();
    expect(screen.getByLabelText(/Entity/)).toBeDisabled();
    expect(screen.getByText(/cannot be changed after the calendar is created/)).toBeInTheDocument();
    const centre = screen.getByLabelText(/Centre/);
    expect(await within(centre).findByRole('option', { name: 'Nashik Road Centre (TC0001) (no longer enabled for the entity)' })).toBeInTheDocument();
    expect(centre).toHaveValue(CENTRE_ID);
    expect(screen.getByLabelText('Holiday 2 name')).toHaveValue('Gandhi Jayanti');

    await userEvent.click(screen.getByRole('button', { name: 'Remove holiday 1' }));
    await userEvent.selectOptions(centre, '');
    await save();
    expect(calendarService.update).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(calendarService.update).toHaveBeenCalledWith('cal2', {
        centreId: null,
        name: 'Academic Year 2026-27',
        validFrom: '2026-06-01',
        validTo: '2027-05-31',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        holidays: [{ date: '2026-10-02', name: 'Gandhi Jayanti' }],
      }),
    );
    expect(vi.mocked(calendarService.update).mock.calls[0][1]).not.toHaveProperty('entityId');
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('changes the status from the form with confirmation, for a user who may update', async () => {
    vi.mocked(calendarService.get).mockReset().mockResolvedValue(calendar({ id: 'cal2' }));
    vi.mocked(calendarService.setStatus).mockResolvedValue(calendar({ id: 'cal2', isActive: false }));
    renderEdit();
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(calendarService.setStatus).toHaveBeenCalledWith('cal2', false));
  });
});

describe('Calendar form access', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('viewLmsCalendars');
    vi.mocked(calendarService.get).mockReset().mockResolvedValue(calendar({ id: 'cal2' }));
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  it('shows an access notice instead of the Add form without lms-calendars.create', async () => {
    renderCreate();
    expect(await screen.findByText("You don't have access to this action")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create calendar' })).not.toBeInTheDocument();
    expect(lmsOptions.entities).not.toHaveBeenCalled();
  });

  it('shows an access notice instead of the Edit form without lms-calendars.update', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/lms/calendars/:id/edit" element={<CalendarEdit />} />
      </Routes>,
      { route: '/lms/calendars/cal2/edit' },
    );
    expect(await screen.findByText("You don't have access to this action")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(calendarService.get).not.toHaveBeenCalled();
  });
});

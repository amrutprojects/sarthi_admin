import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import LearningConfig from '../pages/LearningConfig';
import { calendarService } from '../services/calendarService';
import { ENTITY_ID, ensureToastRoot, entityOptions, learningConfig } from './fixtures';

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

const route = `/lms/learning-config?entityId=${ENTITY_ID}`;
const rowOf = (text: string, table: string) =>
  within(screen.getByRole('table', { name: table })).getAllByText(text)[0].closest('tr') as HTMLTableRowElement;

describe('<LearningConfig>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
    vi.mocked(calendarService.learningConfig).mockReset().mockResolvedValue(learningConfig());
    vi.mocked(calendarService.updateLearningConfig).mockReset();
  });

  it('shows each key with its value, source, To Be Confirmed badge and per-mode rows', async () => {
    renderWithProviders(<LearningConfig />, { route });
    expect(await screen.findByRole('table', { name: 'Core hours' })).toBeInTheDocument();
    expect(calendarService.learningConfig).toHaveBeenCalledWith(ENTITY_ID);

    const hours = rowOf('Core hours — Module 1', 'Core hours');
    expect(hours).toHaveTextContent('60 hours');
    expect(within(hours).getByText('Syllabus default')).toBeInTheDocument();
    expect(hours).toHaveTextContent('Final syllabus document, pending approval');
    expect(hours).toHaveTextContent('OQ-012');

    const oft = rowOf('OFT hours range — Module 1', 'On Field Training');
    expect(oft).toHaveTextContent('40–48 hours');
    expect(oft).toHaveTextContent('Syllabus: 42–48 hours');
    expect(within(oft).getByText('Configured')).toBeInTheDocument();
    expect(oft).toHaveTextContent('Approved by the board');

    const attendance = rowOf('Attendance requirement', 'Attendance');
    expect(within(attendance).getByText('To Be Confirmed')).toBeInTheDocument();

    const modes = screen.getByRole('table', { name: 'Delivery mode rules' });
    expect(within(modes).getByText('OFFLINE')).toBeInTheDocument();
    expect(within(modes).getByText('ONLINE')).toBeInTheDocument();
    expect(within(modes).getByText('Self check in')).toBeInTheDocument();

    expect(screen.getByText('To Be Confirmed', { selector: '.kpi-t' }).closest('.kpi')).toHaveTextContent('2');
    expect(screen.getByText('Configured', { selector: '.kpi-t' }).closest('.kpi')).toHaveTextContent('2');
    /* No Edit without the update permission. */
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  });

  it('filters by value source and search', async () => {
    renderWithProviders(<LearningConfig />, { route });
    await screen.findByRole('table', { name: 'Core hours' });
    await userEvent.selectOptions(screen.getByLabelText('Value'), 'TBC');
    expect(screen.queryByRole('table', { name: 'Core hours' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Attendance' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search'), 'nothing like this');
    expect(screen.getByText('No configuration value matches the current search and filters.')).toBeInTheDocument();
  });

  it('asks to pick an entity when there are several and none is in the link', async () => {
    renderWithProviders(<LearningConfig />, { route: '/lms/learning-config' });
    expect(await screen.findByText('Select an entity', { selector: '.empty b' })).toBeInTheDocument();
    expect(calendarService.learningConfig).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText('Entity'), ENTITY_ID);
    await waitFor(() => expect(calendarService.learningConfig).toHaveBeenCalledWith(ENTITY_ID));
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(calendarService.learningConfig).mockRejectedValue(new ApiError('The selected entity does not exist', 400, 'BAD_REQUEST'));
    renderWithProviders(<LearningConfig />, { route });
    expect(await screen.findByText(/The selected entity does not exist/)).toBeInTheDocument();
    vi.mocked(calendarService.learningConfig).mockResolvedValue(learningConfig());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Core hours' })).toBeInTheDocument();
  });

  it('has its own codes: the calendar update code alone offers no Edit, and the calendar tabs need the calendar view', async () => {
    permissions.add('updateLmsCalendar');
    renderWithProviders(<LearningConfig />, { route });
    await screen.findByRole('table', { name: 'Core hours' });
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Calendars' })).not.toBeInTheDocument();
  });

  it('offers Edit with the learning-configuration update code, and the calendar tabs to a calendar viewer', async () => {
    permissions.add('updateLmsLearningConfig');
    permissions.add('viewLmsCalendars');
    renderWithProviders(<LearningConfig />, { route });
    expect(await screen.findByRole('button', { name: 'Edit Attendance requirement' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Calendars' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Learning configuration' })).toHaveAttribute('aria-selected', 'true');
  });

  it('edits a value with a mandatory reason and sends the typed value', async () => {
    permissions.add('updateLmsLearningConfig');
    vi.mocked(calendarService.updateLearningConfig).mockResolvedValue(learningConfig());
    renderWithProviders(<LearningConfig />, { route });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Attendance requirement' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Value/), '120');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save value' }));
    expect(await within(dialog).findByText('Enter a reason.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a percentage from 0 to 100.')).toBeInTheDocument();
    expect(calendarService.updateLearningConfig).not.toHaveBeenCalled();

    await userEvent.clear(within(dialog).getByLabelText(/^Value/));
    await userEvent.type(within(dialog).getByLabelText(/^Value/), '75');
    await userEvent.type(within(dialog).getByLabelText(/Reason for the change/), '  Prescribed by GR 2026/14 ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save value' }));
    await waitFor(() =>
      expect(calendarService.updateLearningConfig).toHaveBeenCalledWith('attendance.requirement', {
        entityId: ENTITY_ID,
        value: 75,
        reason: 'Prescribed by GR 2026/14',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calendarService.learningConfig).toHaveBeenCalledTimes(2);
  });

  it('sets a mode-specific rule for one mode or both, and shows a server answer on the value', async () => {
    permissions.add('updateLmsLearningConfig');
    vi.mocked(calendarService.updateLearningConfig)
      .mockRejectedValueOnce(
        new ApiError('Enter a value within the allowed range.', 400, 'BAD_REQUEST', [{ field: 'value', message: 'Choose one of: trainer_marked, self_check_in.' }]),
      )
      .mockResolvedValue(learningConfig());
    renderWithProviders(<LearningConfig />, { route });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Attendance capture method (offline)' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Offline only')).toBeChecked();
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Value/), 'trainer_marked');
    await userEvent.type(within(dialog).getByLabelText(/Reason for the change/), 'Baseline register');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save value' }));
    await waitFor(() =>
      expect(calendarService.updateLearningConfig).toHaveBeenLastCalledWith('attendance.capture_method', {
        entityId: ENTITY_ID,
        mode: 'OFFLINE',
        value: 'trainer_marked',
        reason: 'Baseline register',
      }),
    );
    expect(await within(dialog).findByText('Choose one of: trainer_marked, self_check_in.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByLabelText(/Both modes alike/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save value' }));
    await waitFor(() =>
      expect(calendarService.updateLearningConfig).toHaveBeenLastCalledWith('attendance.capture_method', {
        entityId: ENTITY_ID,
        value: 'trainer_marked',
        reason: 'Baseline register',
      }),
    );
  });

  it('can clear a prescribed value back to To Be Confirmed, but never offers it for a syllabus value', async () => {
    permissions.add('updateLmsLearningConfig');
    vi.mocked(calendarService.updateLearningConfig).mockResolvedValue(learningConfig());
    renderWithProviders(<LearningConfig />, { route });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Core hours — Module 1' }));
    expect(within(screen.getByRole('dialog')).queryByLabelText(/Clear the value/)).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await userEvent.click(screen.getByRole('button', { name: 'Edit Attendance capture method (online)' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText(/Clear the value/));
    expect(within(dialog).getByLabelText(/^Value/)).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Reason for the change/), 'Withdrawn');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save value' }));
    await waitFor(() =>
      expect(calendarService.updateLearningConfig).toHaveBeenCalledWith('attendance.capture_method', {
        entityId: ENTITY_ID,
        mode: 'ONLINE',
        value: null,
        reason: 'Withdrawn',
      }),
    );
  });
});

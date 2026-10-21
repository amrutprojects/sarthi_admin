import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CourseModuleList from '../pages/CourseModuleList';
import { courseModuleService } from '../services/courseModuleService';
import type * as ServiceModule from '../services/courseModuleService';
import { COURSE_ID, OTHER_COURSE_ID, courseFeed, courseModule, emptyModule, ensureToastRoot, page, prescribed } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module, the API service, the option feeds. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/courseModuleService', async (importOriginal) => {
  const actual = await importOriginal<typeof ServiceModule>();
  return {
    ...actual,
    courseModuleService: {
      list: vi.fn(), forCourse: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(),
      count: vi.fn(), prescribed: vi.fn(), createPrescribed: vi.fn(),
    },
  };
});
vi.mock('../../options', () => ({ lmsOptions: { centres: vi.fn(), tracks: vi.fn(), entities: vi.fn(), courses: vi.fn(), modules: vi.fn() } }));

const svc = vi.mocked(courseModuleService);

describe('<CourseModuleList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.list.mockReset().mockResolvedValue(page([courseModule(), emptyModule({ status: 'PUBLISHED', isActive: false })]));
    svc.count.mockReset().mockImplementation(async (f = {}) => (f.isActive === 'true' ? 1 : f.status === 'DRAFT' ? 1 : f.status === 'PUBLISHED' ? 1 : 2));
    svc.forCourse.mockReset().mockResolvedValue([courseModule()]);
    svc.prescribed.mockReset().mockResolvedValue(prescribed);
    svc.setStatus.mockReset();
    svc.remove.mockReset();
    svc.createPrescribed.mockReset();
    vi.mocked(lmsOptions.courses).mockReset().mockResolvedValue(courseFeed);
  });

  it('lists the modules with hours, delivery, OFT, readiness, lifecycle, status and Sr. No., and the KPI totals', async () => {
    renderWithProviders(<CourseModuleList />);
    const row = (await screen.findByText('Personality Development and Communication')).closest('tr') as HTMLTableRowElement;
    expect(row.cells[0]).toHaveTextContent('1');
    expect(row.cells[1]).toHaveTextContent('Module 1');
    expect(row.cells[3]).toHaveTextContent('AKP');
    expect(row.cells[4]).toHaveTextContent('60 h');
    expect(row.cells[5]).toHaveTextContent('30 × 2 h · 22 h lecture + 38 h practical');
    expect(row.cells[6]).toHaveTextContent('42–48 h');
    expect(row.cells[7]).toHaveTextContent('Ready');
    expect(row.cells[8]).toHaveTextContent('Draft');
    expect(within(row.cells[9]).getByText('Active')).toBeInTheDocument();
    const other = screen.getByText('Basic Information Technology Skills', { selector: 'b' }).closest('tr') as HTMLTableRowElement;
    expect(other.cells[0]).toHaveTextContent('2');
    expect(other.cells[4]).toHaveTextContent('—');
    expect(other.cells[7]).toHaveTextContent('4 missing');
    expect(other.cells[8]).toHaveTextContent('Published');
    expect(screen.getByText('Total modules').closest('.kpi')).toHaveTextContent('2');
    expect(screen.getByText('Module Master', { selector: 'h1' })).toBeInTheDocument();
  });

  it('shows the four prescribed modules', async () => {
    renderWithProviders(<CourseModuleList />);
    const table = await screen.findByRole('table', { name: 'Prescribed modules' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(table).toHaveTextContent('150 h lecture + 150 h practical');
    expect(table).toHaveTextContent('210–240 h');
    expect(screen.getByText('draft values')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    svc.list.mockResolvedValue(page([]));
    renderWithProviders(<CourseModuleList />);
    expect(await screen.findByText(/No modules have been added yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    svc.list.mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<CourseModuleList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    svc.list.mockResolvedValue(page([courseModule()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Personality Development and Communication')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held', async () => {
    const { unmount } = renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');
    expect(screen.queryByRole('button', { name: /Add Module/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create missing prescribed modules' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Personality Development and Communication' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Personality Development/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Personality Development and Communication' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Personality Development and Communication' })).toBeInTheDocument();
    unmount();

    permissions.add('createLmsCourseModule');
    permissions.add('updateLmsCourseModule');
    permissions.add('deleteLmsCourseModule');
    renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');
    expect(screen.getByRole('button', { name: /Add Module/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create missing prescribed modules' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Personality Development and Communication' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Personality Development and Communication: active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Personality Development and Communication' })).toBeEnabled();
    /* A published module is retired, never deleted. */
    expect(screen.getByRole('button', { name: 'Delete Basic Information Technology Skills' })).toBeDisabled();
  });

  it('asks for confirmation before deactivating and deleting', async () => {
    permissions.add('updateLmsCourseModule');
    permissions.add('deleteLmsCourseModule');
    svc.setStatus.mockResolvedValue(courseModule({ isActive: false }));
    svc.remove.mockResolvedValue();
    renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');

    await userEvent.click(screen.getByRole('switch', { name: 'Personality Development and Communication: active' }));
    expect(screen.getByText('Are you sure you want to deactivate Module 1: Personality Development and Communication?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(svc.setStatus).toHaveBeenCalledWith('m1', false));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Personality Development and Communication' }));
    expect(svc.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('m1'));
  });

  it('filters by the ?courseId= of a deep link, shows the missing modules, and sends the other filters', async () => {
    renderWithProviders(<CourseModuleList />, { route: `/lms/modules?courseId=${COURSE_ID}` });
    await screen.findByText('Personality Development and Communication');
    expect(svc.list).toHaveBeenCalledWith(expect.objectContaining({ courseId: COURSE_ID, page: 1, sortBy: 'moduleNumber' }));
    expect(svc.count).toHaveBeenCalledWith({ courseId: COURSE_ID });
    expect(await screen.findByText(/1 of 4 modules\. Missing: Module 2, Module 3, Module 4\./)).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Pilot Programme (PIL)' });
    expect(screen.getByLabelText('Course')).toHaveValue(COURSE_ID);

    await userEvent.selectOptions(screen.getByLabelText('Module'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Lifecycle'), 'PUBLISHED');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'false');
    await waitFor(() =>
      expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ courseId: COURSE_ID, moduleNumber: '3', lifecycle: 'PUBLISHED', status: 'false' })),
    );
    await userEvent.selectOptions(screen.getByLabelText('Course'), OTHER_COURSE_ID);
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ courseId: OTHER_COURSE_ID })));
  });

  it('creates the missing prescribed modules: asks for the syllabus reference, confirms, then sends { courseId, syllabusRef }', async () => {
    permissions.add('createLmsCourseModule');
    svc.createPrescribed.mockResolvedValue({ courseId: COURSE_ID, created: [2, 3, 4], modules: [], message: 'Prescribed modules created successfully' });
    renderWithProviders(<CourseModuleList />, { route: `/lms/modules?courseId=${COURSE_ID}` });
    await screen.findByText('Personality Development and Communication');

    await userEvent.click(screen.getAllByRole('button', { name: 'Create missing prescribed modules' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Course/)).toHaveValue(COURSE_ID);
    expect(await within(dialog).findByText(/modules 2, 3 and 4 will be created/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(within(dialog).getByText('Enter the syllabus reference.')).toBeInTheDocument();
    expect(svc.createPrescribed).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Syllabus Reference/), '  Final syllabus v1 ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Create modules 2, 3 and 4 of Amrut Kalash Programme (AKP)');
    expect(svc.createPrescribed).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, create modules' }));
    await waitFor(() => expect(svc.createPrescribed).toHaveBeenCalledWith({ courseId: COURSE_ID, syllabusRef: 'Final syllabus v1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a server field error from the prescribed-modules request on the dialog field', async () => {
    permissions.add('createLmsCourseModule');
    svc.createPrescribed.mockRejectedValue(
      new ApiError('The selected course is retired', 400, 'BAD_REQUEST', [{ field: 'courseId', message: 'Choose a course that is not retired' }]),
    );
    renderWithProviders(<CourseModuleList />, { route: `/lms/modules?courseId=${COURSE_ID}` });
    await screen.findByText('Personality Development and Communication');
    await userEvent.click(screen.getAllByRole('button', { name: 'Create missing prescribed modules' })[0]);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Syllabus Reference/), 'Final syllabus v1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, create modules' }));
    expect(await screen.findByText('Choose a course that is not retired')).toBeInTheDocument();
    expect(screen.getByLabelText(/Course/, { selector: 'select#cm-pr-course' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('offers Show deleted only with the delete permission', async () => {
    permissions.add('viewLmsCourseModules');
    permissions.add('updateLmsCourseModule');
    const { unmount } = renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsCourseModule');
    renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists the deleted modules with a Deleted badge; Restore asks first, shows a 409 answer, then restores and reloads', async () => {
    permissions.add('viewLmsCourseModules');
    permissions.add('updateLmsCourseModule');
    permissions.add('deleteLmsCourseModule');
    const gone = courseModule({ id: 'm9', title: 'Old Module', isActive: false });
    svc.list.mockImplementation(async (q) => (q.deleted ? { ...page([gone]), deleted: true } : page([courseModule()])));
    svc.restore
      .mockReset()
      .mockRejectedValueOnce(new ApiError('Module 1 already exists for this course', 409, 'CONFLICT', [{ field: 'moduleNumber', message: 'This module number is already used.' }]))
      .mockResolvedValueOnce(gone);
    renderWithProviders(<CourseModuleList />);
    await screen.findByText('Personality Development and Communication');

    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1 }));
    const row = (await screen.findByText('Old Module')).closest('tr') as HTMLTableRowElement;
    expect(within(row).getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Deleted modules')).toBeInTheDocument();
    /* A deleted record is only restored: no View / Edit / status / Delete. */
    expect(within(row).queryByRole('button', { name: 'Edit Old Module' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete Old Module' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Restore Old Module' }));
    expect(svc.restore).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Restore Module 1: Old Module?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/Module 1 already exists for this course/)).toBeInTheDocument();
    expect(svc.restore).toHaveBeenCalledWith('m9');

    const loads = svc.list.mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(svc.restore).toHaveBeenCalledTimes(2);
    expect(svc.list.mock.calls.length).toBeGreaterThan(loads);
  });
});

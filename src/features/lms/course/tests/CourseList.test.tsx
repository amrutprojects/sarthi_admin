import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CourseList from '../pages/CourseList';
import { courseService } from '../services/courseService';
import { ENTITY_2, course, ensureToastRoot, entityOptions, page } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module, the API service, the option feeds. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/courseService', () => ({
  courseService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), retire: vi.fn(), remove: vi.fn(), restore: vi.fn(),
    count: vi.fn(), languages: vi.fn(),
  },
}));
vi.mock('../../options', () => ({ lmsOptions: { centres: vi.fn(), tracks: vi.fn(), entities: vi.fn(), courses: vi.fn(), modules: vi.fn() } }));

const draft = course();
const published = course({ id: 'co2', code: 'AK-PUB', title: 'Published Course', status: 'PUBLISHED', publishedReleaseNo: 3, publishedReleaseId: 'r3', isActive: false });
const retired = course({ id: 'co3', code: 'AK-OLD', title: 'Retired Course', status: 'RETIRED', languages: ['mr'] });

describe('<CourseList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(courseService.list).mockReset().mockResolvedValue(page([draft, published, retired]));
    vi.mocked(courseService.count).mockReset().mockImplementation(async (f = {}) =>
      f.lifecycle === 'DRAFT' ? 1 : f.lifecycle === 'PUBLISHED' ? 1 : f.lifecycle === 'RETIRED' ? 1 : 3,
    );
    vi.mocked(courseService.setStatus).mockReset();
    vi.mocked(courseService.retire).mockReset();
    vi.mocked(courseService.remove).mockReset();
    vi.mocked(courseService.restore).mockReset();
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  it('lists the courses with Sr. No., entity, languages, course status, release and the KPI totals', async () => {
    renderWithProviders(<CourseList />);
    const row = (await screen.findByText('Sarthi Programme')).closest('tr') as HTMLTableRowElement;
    /* Sr. No., code, title, entity, languages, course status, latest release, active. */
    expect(row.cells[0]).toHaveTextContent('1');
    expect(row.cells[1]).toHaveTextContent('AK-PROG');
    expect(row.cells[3]).toHaveTextContent('Sarthi (AMK)');
    expect(row.cells[4]).toHaveTextContent('en · mr');
    expect(within(row.cells[5]).getByText('Draft')).toBeInTheDocument();
    expect(row.cells[6]).toHaveTextContent('None yet');
    expect(within(row.cells[7]).getByText('Active')).toBeInTheDocument();
    const pub = screen.getByText('Published Course').closest('tr') as HTMLTableRowElement;
    expect(pub.cells[0]).toHaveTextContent('2');
    expect(within(pub.cells[5]).getByText('Published')).toBeInTheDocument();
    expect(pub.cells[6]).toHaveTextContent('Release 3');
    expect(within(pub.cells[7]).getByText('Inactive')).toBeInTheDocument();
    const old = screen.getByText('Retired Course').closest('tr') as HTMLTableRowElement;
    expect(within(old.cells[5]).getByText('Retired')).toBeInTheDocument();
    expect(await screen.findByText('Total courses')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Total courses').closest('.kpi')).toHaveTextContent('3'));
    expect(screen.getByText('Course Master', { selector: 'h1' })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    vi.mocked(courseService.list).mockResolvedValue(page([]));
    renderWithProviders(<CourseList />);
    expect(await screen.findByText(/No courses have been added yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(courseService.list).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<CourseList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(courseService.list).mockResolvedValue(page([draft]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sarthi Programme')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held, Retire only on a published course and Delete only on a draft', async () => {
    const { unmount } = renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');
    expect(screen.queryByRole('button', { name: /Add Course/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Sarthi Programme' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Sarthi Programme/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Sarthi Programme' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire Published Course' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Sarthi Programme' })).toBeInTheDocument();
    unmount();

    permissions.add('createLmsCourse');
    permissions.add('updateLmsCourse');
    permissions.add('deleteLmsCourse');
    renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');
    expect(screen.getByRole('button', { name: /Add Course/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Sarthi Programme' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Sarthi Programme: active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Sarthi Programme' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire Sarthi Programme' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retire Published Course' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Published Course' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire Retired Course' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Retired Course' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before retiring, and before deleting (then offers Restore)', async () => {
    permissions.add('deleteLmsCourse');
    vi.mocked(courseService.retire).mockResolvedValue(course({ ...published, status: 'RETIRED' }));
    vi.mocked(courseService.remove).mockResolvedValue();
    vi.mocked(courseService.restore).mockResolvedValue(course({ isActive: false }));
    renderWithProviders(<CourseList />);
    await screen.findByText('Published Course');

    await userEvent.click(screen.getByRole('button', { name: 'Retire Published Course' }));
    expect(screen.getByText(/Retire the course Published Course \(AK-PUB\)\?/)).toBeInTheDocument();
    expect(courseService.retire).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, retire' }));
    await waitFor(() => expect(courseService.retire).toHaveBeenCalledWith('co2'));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sarthi Programme' }));
    expect(screen.getByText(/Delete the draft course Sarthi Programme \(AK-PROG\)\?/)).toBeInTheDocument();
    expect(courseService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(courseService.remove).toHaveBeenCalledWith('co1'));

    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(courseService.restore).toHaveBeenCalledWith('co1'));
  });

  it('asks for confirmation before deactivating', async () => {
    permissions.add('updateLmsCourse');
    vi.mocked(courseService.setStatus).mockResolvedValue(course({ isActive: false }));
    renderWithProviders(<CourseList />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Sarthi Programme: active' }));
    expect(screen.getByText('Are you sure you want to deactivate the course Sarthi Programme (AK-PROG)?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(courseService.setStatus).toHaveBeenCalledWith('co1', false));
  });

  it('sends the entity, course status and active filters to the API', async () => {
    renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');
    await screen.findByRole('option', { name: 'Pilot Entity (PILOT)' });
    await userEvent.selectOptions(screen.getByLabelText('Entity'), ENTITY_2);
    await waitFor(() => expect(courseService.list).toHaveBeenLastCalledWith(expect.objectContaining({ entityId: ENTITY_2, page: 1 })));
    /* The KPI totals follow the entity scope. */
    await waitFor(() => expect(courseService.count).toHaveBeenCalledWith({ entityId: ENTITY_2, lifecycle: 'PUBLISHED' }));
    await userEvent.selectOptions(screen.getByLabelText('Course Status'), 'PUBLISHED');
    await userEvent.selectOptions(screen.getByLabelText('Active'), 'false');
    await waitFor(() =>
      expect(courseService.list).toHaveBeenLastCalledWith(expect.objectContaining({ entityId: ENTITY_2, lifecycle: 'PUBLISHED', status: 'false' })),
    );
  });

  it('offers Show deleted only with the delete permission', async () => {
    permissions.add('viewLmsCourses');
    permissions.add('updateLmsCourse');
    const { unmount } = renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsCourse');
    renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists the deleted courses with a Deleted badge; Restore asks first, shows a 409 answer, then restores and reloads', async () => {
    permissions.add('viewLmsCourses');
    permissions.add('updateLmsCourse');
    permissions.add('deleteLmsCourse');
    const gone = course({ id: 'co9', code: 'AK-GONE', title: 'Old Course', isActive: false });
    vi.mocked(courseService.list).mockImplementation(async (q) => (q.deleted ? { ...page([gone]), deleted: true } : page([draft])));
    vi.mocked(courseService.restore)
      .mockRejectedValueOnce(new ApiError('A course with this code already exists', 409, 'CONFLICT', [{ field: 'code', message: 'This course code is already used.' }]))
      .mockResolvedValueOnce(gone);
    renderWithProviders(<CourseList />);
    await screen.findByText('Sarthi Programme');

    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    expect(courseService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1 }));
    const row = (await screen.findByText('Old Course')).closest('tr') as HTMLTableRowElement;
    expect(within(row).getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Deleted courses')).toBeInTheDocument();
    /* A deleted record is only restored: no View / Edit / status / Delete. */
    expect(within(row).queryByRole('button', { name: 'Edit Old Course' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete Old Course' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Restore Old Course' }));
    expect(courseService.restore).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Restore the course Old Course (AK-GONE)?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/A course with this code already exists/)).toBeInTheDocument();
    expect(courseService.restore).toHaveBeenCalledWith('co9');

    const loads = vi.mocked(courseService.list).mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(courseService.restore).toHaveBeenCalledTimes(2);
    expect(vi.mocked(courseService.list).mock.calls.length).toBeGreaterThan(loads);
  });
});

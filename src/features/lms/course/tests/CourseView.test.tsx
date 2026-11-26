import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import CourseView from '../pages/CourseView';
import { courseService } from '../services/courseService';
import { ENTITY_ID, course, ensureToastRoot, entityLanguages, module } from './fixtures';

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

function Where() {
  const l = useLocation();
  return <div>at {l.pathname + l.search}</div>;
}

const renderView = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/courses/:id" element={<CourseView />} />
      <Route path="/lms/modules" element={<Where />} />
    </Routes>,
    { route: '/lms/courses/co1' },
  );

describe('<CourseView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(courseService.get).mockReset().mockResolvedValue(course());
    vi.mocked(courseService.languages).mockReset().mockResolvedValue(entityLanguages);
    vi.mocked(courseService.retire).mockReset();
    vi.mocked(courseService.remove).mockReset();
    vi.mocked(courseService.restore).mockReset();
  });

  it('shows the details, the rendered description, the lifecycle and the module summary with the missing modules', async () => {
    renderView();
    expect(await screen.findByText('Sarthi Programme', { selector: 'h1' })).toBeInTheDocument();
    expect(await screen.findByText('English (en), Marathi (mr)')).toBeInTheDocument();
    /* Allow-listed markup is rendered, not shown as tags. */
    expect(screen.getByText('skilling', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Course status').closest('.kv')).toHaveTextContent('Draft');
    expect(screen.getByText('Latest published release').closest('.kv')).toHaveTextContent('None yet');

    const modules = screen.getByRole('table', { name: 'Programme modules' });
    expect(within(modules).getAllByRole('row')).toHaveLength(5);
    expect(modules).toHaveTextContent('Final syllabus M1 v1.0');
    expect(modules).toHaveTextContent('42–48');
    expect(within(modules).getByText('Missing: module 3 has not been added yet.')).toBeInTheDocument();
    expect(within(modules).getByText('Missing: module 4 has not been added yet.')).toBeInTheDocument();
    expect(screen.getByText(/Missing modules 3 and 4/)).toBeInTheDocument();
    expect(screen.getByText(/A course cannot be included in a release unless it has modules 1 to 4/)).toBeInTheDocument();
    expect(screen.getByText('2 of 4')).toBeInTheDocument();
    expect(screen.getByText('2 programme modules')).toBeInTheDocument();

    /* No permission: no write actions and no link to the Module Master. */
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open in Module Master' })).not.toBeInTheDocument();
  });

  it('says when all four modules are present, and opens the Module Master filtered by the course', async () => {
    permissions.add('viewLmsCourseModules');
    vi.mocked(courseService.get).mockResolvedValue(
      course({ modules: [module(1), module(2), module(3, { coreHours: 300 }), module(4)], missingModuleNumbers: [], hasAllModules: true }),
    );
    renderView();
    expect(await screen.findByText(/All four modules are present/)).toBeInTheDocument();
    expect(screen.getByText('4 of 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open in Module Master' }));
    expect(await screen.findByText('at /lms/modules?courseId=co1')).toBeInTheDocument();
  });

  it('a published course offers Retire (lms-courses.delete) behind a confirmation, not Delete', async () => {
    permissions.add('deleteLmsCourse');
    vi.mocked(courseService.get).mockResolvedValue(course({ status: 'PUBLISHED', publishedReleaseNo: 1, publishedReleaseId: 'rel-1' }));
    vi.mocked(courseService.retire).mockResolvedValue(course({ status: 'RETIRED' }));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Retire' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByText(/Retire the course Sarthi Programme \(AK-PROG\)\?/)).toBeInTheDocument();
    expect(courseService.retire).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, retire' }));
    await waitFor(() => expect(courseService.retire).toHaveBeenCalledWith('co1'));
    expect(screen.getByText('Release 1')).toBeInTheDocument();
    expect(screen.getByText(/locked \(in a published release\)/)).toBeInTheDocument();
  });

  it('a draft course offers Delete behind a confirmation, then Restore', async () => {
    permissions.add('deleteLmsCourse');
    vi.mocked(courseService.remove).mockResolvedValue();
    vi.mocked(courseService.restore).mockResolvedValue(course({ isActive: false }));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(courseService.remove).toHaveBeenCalledWith('co1'));
    expect(await screen.findByText(/This course has been deleted/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(courseService.restore).toHaveBeenCalledWith('co1'));
  });

  it('a retired course offers neither Retire nor Delete', async () => {
    permissions.add('deleteLmsCourse');
    permissions.add('updateLmsCourse');
    vi.mocked(courseService.get).mockResolvedValue(course({ status: 'RETIRED' }));
    renderView();
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows the description as plain text when it is not allow-listed markup, and a code the entity no longer lists as the code', async () => {
    vi.mocked(courseService.languages).mockResolvedValue({ defaultLanguage: 'en', languages: [{ code: 'en', label: 'English' }] });
    vi.mocked(courseService.get).mockResolvedValue(course({ description: 'Use a < b, and <x> is not markup we render' }));
    renderView();
    expect(await screen.findByText('Use a < b, and <x> is not markup we render')).toBeInTheDocument();
    expect(await screen.findByText('English (en), mr')).toBeInTheDocument();
    expect(courseService.languages).toHaveBeenCalledWith(ENTITY_ID);
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(courseService.get).mockRejectedValue(new ApiError('Course not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Course not found/)).toBeInTheDocument();
    vi.mocked(courseService.get).mockResolvedValue(course());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sarthi Programme', { selector: 'h1' })).toBeInTheDocument();
  });
});

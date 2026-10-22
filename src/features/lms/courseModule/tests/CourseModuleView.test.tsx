import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import CourseModuleView from '../pages/CourseModuleView';
import { courseModuleService } from '../services/courseModuleService';
import type * as ServiceModule from '../services/courseModuleService';
import { courseModule, emptyModule, ensureToastRoot, prescribed } from './fixtures';

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

const renderView = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/modules/:id" element={<CourseModuleView />} />
    </Routes>,
    { route: '/lms/modules/m1' },
  );

describe('<CourseModuleView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.get.mockReset();
    svc.remove.mockReset();
    svc.restore.mockReset();
    svc.setStatus.mockReset();
    svc.prescribed.mockReset().mockResolvedValue(prescribed);
  });

  it('shows what is missing for release, the details and the prescribed values, without write actions', async () => {
    svc.get.mockResolvedValue(emptyModule({ id: 'm1', references: [] }));
    renderView();
    const missing = await screen.findByRole('list', { name: 'Missing for release' });
    expect(within(missing).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Core hours',
      'Syllabus reference',
      'Delivery pattern (sessions × session hours, or lecture + practical hours)',
      'OFT hours range',
    ]);
    expect(screen.getByText(/Not ready for release/)).toBeInTheDocument();
    expect(screen.getByText('Module 2: Basic Information Technology Skills', { selector: 'h1' })).toBeInTheDocument();
    const compared = await screen.findByRole('table', { name: 'Compared with the prescribed values' });
    expect(compared).toHaveTextContent('60 h');
    expect(within(compared).getAllByText('differs')).toHaveLength(3);
    expect(screen.getByText('No LMS record uses this module yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('says a complete module is ready for release and shows its delivery sums', async () => {
    svc.get.mockResolvedValue(courseModule({ references: [] }));
    renderView();
    expect(await screen.findByText(/Ready for release\./)).toBeInTheDocument();
    expect(screen.getByText('30 × 2 h = 60 h')).toBeInTheDocument();
    expect(screen.getByText('22 h + 38 h = 60 h')).toBeInTheDocument();
    expect(screen.getByText('42–48 h (70–80 % of the core hours)')).toBeInTheDocument();
  });

  it('offers edit / status / delete by permission, and no delete for a published or referenced module', async () => {
    permissions.add('updateLmsCourseModule');
    permissions.add('deleteLmsCourseModule');
    svc.get.mockResolvedValue(courseModule({ status: 'PUBLISHED', references: [] }));
    const { unmount } = renderView();
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    unmount();

    svc.get.mockResolvedValue(courseModule({ references: [{ label: '1 track variant', count: 1 }] }));
    renderView();
    expect(await screen.findByText('1 track variant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('asks for confirmation before deleting, then offers Restore with confirmation', async () => {
    permissions.add('deleteLmsCourseModule');
    svc.get.mockResolvedValue(courseModule({ references: [] }));
    svc.remove.mockResolvedValue();
    svc.restore.mockResolvedValue(courseModule({ isActive: false }));
    renderView();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Module 1: Personality Development and Communication?');
    expect(svc.remove).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('m1'));
    expect(await screen.findByText(/This module has been deleted/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(svc.restore).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(svc.restore).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(screen.queryByText(/This module has been deleted/)).not.toBeInTheDocument());
  });

  it('shows an error with a working Retry', async () => {
    svc.get.mockRejectedValue(new ApiError('Module not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Module not found/)).toBeInTheDocument();
    svc.get.mockResolvedValue(courseModule({ references: [] }));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Ready for release\./)).toBeInTheDocument();
  });
});

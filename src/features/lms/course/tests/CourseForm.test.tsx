import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CourseCreate from '../pages/CourseCreate';
import CourseEdit from '../pages/CourseEdit';
import { courseService } from '../services/courseService';
import { RICH_TEXT_REFUSED } from '../validation/course.validation';
import { ENTITY_2, ENTITY_ID, course, ensureToastRoot, entityLanguages, entityOptions } from './fixtures';

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

const save = () => userEvent.click(screen.getByRole('button', { name: /Create course|Save changes/ }));
/* A textarea value with markup: typed in one go (userEvent would read "<" sequences as keys). */
const setText = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};

const renderCreate = (route = '/lms/courses/create') =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/courses/create" element={<CourseCreate />} />
      <Route path="/lms/courses/:id" element={<div>view page</div>} />
    </Routes>,
    { route },
  );

const renderEdit = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/courses/:id/edit" element={<CourseEdit />} />
      <Route path="/lms/courses/:id" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/courses/co1/edit' },
  );

async function chooseEntity() {
  await screen.findByRole('option', { name: 'Sarthi (AMK)' });
  await userEvent.selectOptions(screen.getByLabelText(/Entity/), ENTITY_ID);
}

describe('Course form (Add)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(courseService.create).mockReset();
    vi.mocked(courseService.languages).mockReset().mockResolvedValue(entityLanguages);
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderCreate();
    await screen.findByRole('option', { name: 'Sarthi (AMK)' });
    /* System-set fields are shown read-only. */
    expect(screen.getByLabelText('Latest Published Release')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Latest Published Release')).toHaveValue('None yet');
    expect(screen.getByText('Draft on creation')).toBeInTheDocument();

    await save();
    expect(await screen.findByText('Select an entity.')).toBeInTheDocument();
    expect(screen.getByText('Enter a course code.')).toBeInTheDocument();
    expect(screen.getByText('Enter a course title.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Course Title/), 'Ab');
    expect(await screen.findByText('Must be at least 3 characters')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Course Code/), 'A');
    expect(await screen.findByText('Must be at least 2 characters')).toBeInTheDocument();
    expect(courseService.create).not.toHaveBeenCalled();
  });

  it('refuses markup outside the allow-list in the description, as the server does', async () => {
    renderCreate();
    const description = await screen.findByLabelText(/Description/);
    setText(description, '<p>Intro</p><script>alert(1)</script>');
    expect(await screen.findByText(RICH_TEXT_REFUSED)).toBeInTheDocument();
    setText(description, '<p>See <a href="http://example.org">this</a></p>');
    expect(await screen.findByText(RICH_TEXT_REFUSED)).toBeInTheDocument();
    setText(description, '<p>See <a href="https://example.org">this</a> <strong>now</strong></p>');
    await waitFor(() => expect(screen.queryByText(RICH_TEXT_REFUSED)).not.toBeInTheDocument());
    setText(description, 'x'.repeat(2001));
    expect(await screen.findByText('Shorten the description.')).toBeInTheDocument();
  });

  it('offers the entity languages with its default selected, and creates the course with the normalised values', async () => {
    vi.mocked(courseService.create).mockResolvedValue(course({ id: 'new1' }));
    renderCreate();
    await chooseEntity();
    await waitFor(() => expect(courseService.languages).toHaveBeenCalledWith(ENTITY_ID));
    expect(await screen.findByLabelText(/Marathi \(mr\)/)).toBeChecked();
    expect(screen.getByLabelText(/English \(en\)/)).not.toBeChecked();
    expect(screen.getByText(/The languages enabled for the entity/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/English \(en\)/));

    /* The code box keeps only A–Z, 0–9 and hyphen, upper-cased. */
    await userEvent.type(screen.getByLabelText(/Course Code/), 'ak-prog_1');
    expect(screen.getByLabelText(/Course Code/)).toHaveValue('AK-PROG1');
    await userEvent.type(screen.getByLabelText(/Course Title/), '  Sarthi   Programme ');
    setText(screen.getByLabelText(/Description/), '  <p>Four <strong>modules</strong>.</p>  ');
    await save();

    await waitFor(() =>
      expect(courseService.create).toHaveBeenCalledWith({
        entityId: ENTITY_ID,
        code: 'AK-PROG1',
        title: 'Sarthi Programme',
        description: '<p>Four <strong>modules</strong>.</p>',
        languages: ['en', 'mr'],
        isActive: true,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('switching the entity offers the new entity languages and selects its default', async () => {
    vi.mocked(courseService.languages).mockImplementation(async (id) =>
      id === ENTITY_2 ? { defaultLanguage: 'en', languages: [{ code: 'en', label: 'English' }] } : entityLanguages,
    );
    renderCreate();
    await chooseEntity();
    expect(await screen.findByLabelText(/Marathi \(mr\)/)).toBeChecked();
    await userEvent.selectOptions(screen.getByLabelText(/Entity/), ENTITY_2);
    expect(await screen.findByLabelText(/English \(en\)/)).toBeChecked();
    expect(screen.queryByLabelText(/Marathi/)).not.toBeInTheDocument();
  });

  it('requires a language when the entity offers some', async () => {
    renderCreate();
    await chooseEntity();
    await userEvent.click(await screen.findByLabelText(/Marathi \(mr\)/));
    expect(await screen.findByText('Select at least one language.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Course Code/), 'AK');
    await userEvent.type(screen.getByLabelText(/Course Title/), 'Course');
    await save();
    expect(courseService.create).not.toHaveBeenCalled();
  });

  it('shows the server answer when a language is not enabled for the entity (400) next to the languages', async () => {
    /* Another admin narrowed the entity's languages after the list was read: the server has the last word. */
    vi.mocked(courseService.create).mockRejectedValue(
      new ApiError('Select languages enabled for the entity.', 400, 'BAD_REQUEST', [{ field: 'languages', message: 'Marathi is not enabled for this entity.' }]),
    );
    renderCreate();
    await chooseEntity();
    expect(await screen.findByLabelText(/Marathi \(mr\)/)).toBeChecked();
    await userEvent.type(screen.getByLabelText(/Course Code/), 'AK');
    await userEvent.type(screen.getByLabelText(/Course Title/), 'Course');
    await save();
    expect(await screen.findByText('Marathi is not enabled for this entity.')).toBeInTheDocument();
    expect(screen.getByText('Select languages enabled for the entity.')).toBeInTheDocument();
    expect(courseService.create).toHaveBeenCalledWith(expect.objectContaining({ languages: ['mr'] }));
  });

  it('shows a 409 duplicate code next to the field', async () => {
    vi.mocked(courseService.create).mockRejectedValue(
      new ApiError('A course with this code already exists', 409, 'CONFLICT', [{ field: 'code', message: 'This course code is already used.' }]),
    );
    renderCreate(`/lms/courses/create?entityId=${ENTITY_ID}`);
    /* ?entityId= pre-selects the entity. */
    expect(await screen.findByLabelText(/Marathi \(mr\)/)).toBeChecked();
    await userEvent.type(screen.getByLabelText(/Course Code/), 'AK-PROG');
    await userEvent.type(screen.getByLabelText(/Course Title/), 'Sarthi Programme');
    await save();
    expect(await screen.findByText('This course code is already used.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Code/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the language list failing with a working Retry', async () => {
    vi.mocked(courseService.languages).mockRejectedValue(new ApiError('Entity not found', 404, 'NOT_FOUND'));
    renderCreate();
    await chooseEntity();
    expect(await screen.findByText(/Could not load the languages of the entity/)).toBeInTheDocument();
    expect(screen.getByText(/Entity not found/)).toBeInTheDocument();
    vi.mocked(courseService.languages).mockResolvedValue(entityLanguages);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText(/Marathi \(mr\)/)).toBeChecked();
  });

  it('shows the entity feed failing with a working Retry', async () => {
    vi.mocked(lmsOptions.entities).mockRejectedValue(new ApiError('Entities unavailable', 503, 'ERROR'));
    renderCreate();
    expect(await screen.findByText(/Entities unavailable/)).toBeInTheDocument();
    vi.mocked(lmsOptions.entities).mockResolvedValue(entityOptions);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'Sarthi (AMK)' })).toBeInTheDocument();
  });
});

describe('Course form (Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(courseService.update).mockReset();
    vi.mocked(courseService.setStatus).mockReset();
    vi.mocked(courseService.languages).mockReset().mockResolvedValue(entityLanguages);
    vi.mocked(lmsOptions.entities).mockReset().mockResolvedValue(entityOptions);
  });

  it('a draft course: the entity is fixed, the code can change, and the saved values are sent after confirmation', async () => {
    vi.mocked(courseService.get).mockReset().mockResolvedValue(course());
    vi.mocked(courseService.update).mockResolvedValue(course());
    renderEdit();
    expect(await screen.findByDisplayValue('Sarthi Programme')).toBeInTheDocument();
    expect(screen.getByLabelText(/Entity/)).toBeDisabled();
    expect(screen.getByLabelText(/Course Code/)).toBeEnabled();
    expect(await screen.findByLabelText(/English \(en\)/)).toBeChecked();
    expect(screen.getByLabelText(/Marathi \(mr\)/)).toBeChecked();

    await userEvent.clear(screen.getByLabelText(/Course Code/));
    await userEvent.type(screen.getByLabelText(/Course Code/), 'AK-NEW');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(courseService.update).toHaveBeenCalledWith('co1', {
        code: 'AK-NEW',
        title: 'Sarthi Programme',
        description: '<p>Four-module <strong>skilling</strong> programme.</p>',
        languages: ['en', 'mr'],
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('a published course: the code is locked with the reason, not sent, and the release is shown read-only', async () => {
    vi.mocked(courseService.get).mockReset().mockResolvedValue(course({ status: 'PUBLISHED', publishedReleaseNo: 2, publishedReleaseId: 'rel-2' }));
    vi.mocked(courseService.update).mockResolvedValue(course());
    renderEdit();
    expect(await screen.findByLabelText(/Course Code/)).toBeDisabled();
    expect(screen.getByText(/The code cannot be changed: the course is published and in a published release/)).toBeInTheDocument();
    expect(screen.getByLabelText('Latest Published Release')).toHaveValue('Release 2');
    expect(screen.getByLabelText('Release Record')).toHaveValue('rel-2');
    expect(screen.getByText('Published')).toBeInTheDocument();
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() => expect(courseService.update).toHaveBeenCalled());
    expect(vi.mocked(courseService.update).mock.calls[0][1]).not.toHaveProperty('code');
  });

  it('shows a 409 locked code answer next to the field', async () => {
    vi.mocked(courseService.get).mockReset().mockResolvedValue(course());
    vi.mocked(courseService.update).mockRejectedValue(
      new ApiError('The code cannot be changed. The course is in a published release.', 409, 'CONFLICT', [{ field: 'code', message: 'The code cannot be changed.' }]),
    );
    renderEdit();
    await userEvent.type(await screen.findByLabelText(/Course Code/), 'X');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    expect(await screen.findByText('The code cannot be changed.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Code/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('gates the status switch on lms-courses.update and asks before changing it', async () => {
    vi.mocked(courseService.get).mockReset().mockResolvedValue(course());
    const { unmount } = renderEdit();
    await screen.findByDisplayValue('Sarthi Programme');
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    unmount();

    permissions.add('updateLmsCourse');
    vi.mocked(courseService.setStatus).mockResolvedValue(course({ isActive: false }));
    renderEdit();
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    expect(screen.getByText('Are you sure you want to deactivate the course Sarthi Programme (AK-PROG)?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(courseService.setStatus).toHaveBeenCalledWith('co1', false));
  });

  it('shows a load error with a working Retry', async () => {
    vi.mocked(courseService.get).mockReset().mockRejectedValue(new ApiError('Course not found', 404, 'NOT_FOUND'));
    renderEdit();
    expect(await screen.findByText(/Course not found/)).toBeInTheDocument();
    vi.mocked(courseService.get).mockResolvedValue(course());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByDisplayValue('Sarthi Programme')).toBeInTheDocument();
  });
});

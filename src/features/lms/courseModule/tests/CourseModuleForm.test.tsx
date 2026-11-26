import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import CourseModuleCreate from '../pages/CourseModuleCreate';
import CourseModuleEdit from '../pages/CourseModuleEdit';
import { courseModuleService } from '../services/courseModuleService';
import type * as ServiceModule from '../services/courseModuleService';
import { DOES_NOT_ADD_UP } from '../validation/courseModule.validation';
import { COURSE_ID, courseFeed, courseModule, ensureToastRoot, prescribed } from './fixtures';

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
const label = (re: RegExp) => screen.getByLabelText(re);
const save = () => userEvent.click(screen.getByRole('button', { name: /Create module|Save changes/ }));

const renderCreate = (query = '') =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/modules/create" element={<CourseModuleCreate />} />
      <Route path="/lms/modules/:id" element={<div>view page</div>} />
    </Routes>,
    { route: `/lms/modules/create${query}` },
  );

const renderEdit = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/modules/:id/edit" element={<CourseModuleEdit />} />
      <Route path="/lms/modules/:id" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/modules/m1/edit' },
  );

describe('Module form (Add)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('createLmsCourseModule');
    svc.create.mockReset();
    svc.forCourse.mockReset().mockResolvedValue([courseModule()]);
    svc.prescribed.mockReset().mockResolvedValue(prescribed);
    vi.mocked(lmsOptions.courses).mockReset().mockResolvedValue(courseFeed);
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderCreate();
    await screen.findByRole('option', { name: 'Sarthi Programme (AKP)' });
    await save();
    expect(await screen.findByText('Select a course.')).toBeInTheDocument();
    expect(screen.getByText('Select module 1, 2, 3 or 4.')).toBeInTheDocument();
    expect(screen.getByText('Enter a module title.')).toBeInTheDocument();
    await userEvent.type(label(/Module Title/), 'Intro <script>');
    expect(await screen.findByText('Enter the title as plain text.')).toBeInTheDocument();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('checks sessions × session hours = core hours, the syllabus reference and the OFT range across fields', async () => {
    renderCreate(`?courseId=${COURSE_ID}&moduleNumber=2`);
    await userEvent.type(await screen.findByLabelText(/Module Title/), 'Basic IT Skills');
    await userEvent.type(label(/Core Hours/), '60');
    await userEvent.selectOptions(label(/Delivery Pattern/), 'SESSIONS');
    await userEvent.type(label(/Number of Sessions/), '30');
    await userEvent.type(label(/Session Hours/), '3');
    await userEvent.type(label(/OFT Hours \(Minimum\)/), '50');
    await userEvent.type(label(/OFT Hours \(Maximum\)/), '48');
    await save();

    expect(await screen.findByText(DOES_NOT_ADD_UP)).toBeInTheDocument();
    expect(screen.getByText('Enter the syllabus reference.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid OFT hours range.')).toBeInTheDocument();
    expect(svc.create).not.toHaveBeenCalled();

    /* Fixing the other side of the sum clears the message on sessions. */
    await userEvent.clear(label(/Session Hours/));
    await userEvent.type(label(/Session Hours/), '2');
    await waitFor(() => expect(screen.queryByText(DOES_NOT_ADD_UP)).not.toBeInTheDocument());
    expect(screen.getByText(/Sessions × session hours: 60 h, equal to the core hours/)).toBeInTheDocument();
  });

  it('fills the prescribed values, marks the existing module numbers, and creates the module with the normalised payload', async () => {
    svc.create.mockResolvedValue(courseModule({ id: 'new1' }));
    renderCreate(`?courseId=${COURSE_ID}&moduleNumber=3`);
    expect(await screen.findByRole('option', { name: 'Module 1 (already exists)' })).toBeDisabled();
    await waitFor(() => expect(label(/^Course/)).toHaveValue(COURSE_ID));
    expect(label(/Module Number/)).toHaveValue('3');

    await userEvent.click(await screen.findByRole('button', { name: 'Use the prescribed values' }));
    expect(label(/Module Title/)).toHaveValue('Domain-Specific Basic Digital Skills');
    expect(label(/Delivery Pattern/)).toHaveValue('LECTURE_PRACTICAL');
    await userEvent.type(label(/Syllabus Reference/), ' Final syllabus v1 ');
    expect(screen.getByText('Every field required before release is filled.')).toBeInTheDocument();
    await save();

    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith({
        courseId: COURSE_ID,
        moduleNumber: 3,
        title: 'Domain-Specific Basic Digital Skills',
        description: null,
        coreHours: 300,
        syllabusRef: 'Final syllabus v1',
        sessions: null,
        sessionHours: null,
        lectureHours: 150,
        practicalHours: 150,
        oftHoursMin: 210,
        oftHoursMax: 240,
        isActive: true,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('shows a 409 "module already exists" answer next to the module number', async () => {
    svc.forCourse.mockResolvedValue([]);
    svc.create.mockRejectedValue(
      new ApiError('This module already exists for the course', 409, 'CONFLICT', [{ field: 'moduleNumber', message: 'This module already exists for the course.' }]),
    );
    renderCreate(`?courseId=${COURSE_ID}&moduleNumber=1`);
    await userEvent.type(await screen.findByLabelText(/Module Title/), 'Orientation');
    await save();
    expect(await screen.findByText('This module already exists for the course.')).toBeInTheDocument();
    expect(label(/Module Number/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Not saved\./)).toBeInTheDocument();
  });

  it('shows a 422 validator answer ("body.title") on the field', async () => {
    svc.create.mockRejectedValue(new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.title', message: 'Must be at most 160 characters' }]));
    renderCreate(`?courseId=${COURSE_ID}&moduleNumber=2`);
    await userEvent.type(await screen.findByLabelText(/Module Title/), 'Basic IT Skills');
    await save();
    expect(await screen.findByText('Must be at most 160 characters')).toBeInTheDocument();
    expect(label(/Module Title/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('is closed to a user without the create permission', async () => {
    permissions.clear();
    renderCreate();
    expect(await screen.findByText('You cannot add modules')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Module Title/)).not.toBeInTheDocument();
  });
});

describe('Module form (Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('updateLmsCourseModule');
    svc.get.mockReset().mockResolvedValue(courseModule({ references: [] }));
    svc.update.mockReset();
    svc.prescribed.mockReset().mockResolvedValue(prescribed);
  });

  it('shows the course and number fixed, needs a reason when the core hours change, and sends it', async () => {
    svc.update.mockResolvedValue(courseModule());
    renderEdit();
    expect(await screen.findByDisplayValue('Personality Development and Communication')).toBeInTheDocument();
    expect(label(/^Course/)).toBeDisabled();
    expect(label(/Module Number/)).toBeDisabled();
    expect(label(/Delivery Pattern/)).toHaveValue('BOTH');
    expect(screen.queryByLabelText(/Reason for the Change/)).not.toBeInTheDocument();

    await userEvent.clear(label(/Core Hours/));
    await userEvent.type(label(/Core Hours/), '64');
    await userEvent.clear(label(/Number of Sessions/));
    await userEvent.type(label(/Number of Sessions/), '32');
    await userEvent.selectOptions(label(/Delivery Pattern/), 'SESSIONS');
    expect(screen.getByLabelText(/Reason for the Change/)).toBeInTheDocument();
    await save();
    expect(await screen.findByText('Enter a reason.')).toBeInTheDocument();
    expect(svc.update).not.toHaveBeenCalled();

    await userEvent.type(label(/Reason for the Change/), 'Approved syllabus v2');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith('m1', {
        title: 'Personality Development and Communication',
        description: null,
        coreHours: 64,
        syllabusRef: 'Final syllabus v1',
        sessions: 32,
        sessionHours: 2,
        lectureHours: null,
        practicalHours: null,
        oftHoursMin: 42,
        oftHoursMax: 48,
        reason: 'Approved syllabus v2',
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('shows a 400 service answer from the hours check on the field', async () => {
    svc.update.mockRejectedValue(
      new ApiError('The delivery pattern does not add up to the core hours.', 400, 'BAD_REQUEST', [{ field: 'lectureHours', message: DOES_NOT_ADD_UP }]),
    );
    renderEdit();
    await screen.findByDisplayValue('Personality Development and Communication');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    expect(await screen.findByText(DOES_NOT_ADD_UP, { selector: '#cm-lecture-error' })).toBeInTheDocument();
    expect(label(/Lecture Hours/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Not saved\./)).toBeInTheDocument();
  });

  it('is closed to a user without the update permission', async () => {
    permissions.clear();
    renderEdit();
    expect(await screen.findByText('You can view this module but not change it')).toBeInTheDocument();
    expect(svc.get).not.toHaveBeenCalled();
  });
});

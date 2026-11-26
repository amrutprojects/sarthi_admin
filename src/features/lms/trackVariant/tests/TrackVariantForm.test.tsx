import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import TrackVariantCreate from '../pages/TrackVariantCreate';
import TrackVariantEdit from '../pages/TrackVariantEdit';
import { trackVariantService } from '../services/trackVariantService';
import { courseOptions, ensureToastRoot, formOptions, variant } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/trackVariantService', () => ({
  trackVariantService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), publish: vi.fn(), retire: vi.fn(), remove: vi.fn(),
    restore: vi.fn(), count: vi.fn(), formOptions: vi.fn(), variantsOfModule: vi.fn(), courseOptions: vi.fn(), moduleThreeOptions: vi.fn(),
    trackOptions: vi.fn(), tracksForEntity: vi.fn(), listItems: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn(),
    retireOftCard: vi.fn(),
  },
}));

const svc = vi.mocked(trackVariantService);

const renderCreate = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/track-variants/create" element={<TrackVariantCreate />} />
      <Route path="/lms/track-variants/:id" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/track-variants/create' },
  );

const renderEdit = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/track-variants/:id/edit" element={<TrackVariantEdit />} />
      <Route path="/lms/track-variants/:id" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/track-variants/v1/edit' },
  );

/* Course → its Module 3 (chosen at once, the only one) → the tracks enabled for the course's entity. */
async function chooseCourse() {
  await screen.findByRole('option', { name: 'AK-DIP · Sarthi Diploma' });
  await userEvent.selectOptions(screen.getByLabelText(/^Course/), 'c1');
  await waitFor(() => expect(screen.getByLabelText(/Module 3/)).toHaveValue('m3'));
  await screen.findByRole('option', { name: 'T07 · Cyber Security' });
}

describe('Track variant form (Add)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.formOptions.mockReset().mockResolvedValue(formOptions);
    svc.courseOptions.mockReset().mockResolvedValue(courseOptions);
    svc.moduleThreeOptions.mockReset().mockResolvedValue([{ id: 'm3', courseId: 'c1', moduleNumber: 3, title: 'Track Specialisation' }]);
    svc.tracksForEntity.mockReset().mockResolvedValue([
      { id: 't1', code: 'T01', name: 'Data Analytics' },
      { id: 't7', code: 'T07', name: 'Cyber Security' },
    ]);
    /* T01 already has a variant of this module. */
    svc.variantsOfModule.mockReset().mockResolvedValue([variant({ id: 'v9', trackId: 't1' })]);
    svc.create.mockReset();
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderCreate();
    await screen.findByRole('option', { name: 'AK-DIP · Sarthi Diploma' });
    await userEvent.click(screen.getByRole('button', { name: 'Create track variant' }));
    expect(await screen.findByText('Select a course.')).toBeInTheDocument();
    expect(screen.getByText('Select a Module 3 course module.')).toBeInTheDocument();
    expect(screen.getByText('Select a technology track.')).toBeInTheDocument();
    /* Module and track wait for the course. */
    expect(screen.getByLabelText(/Module 3/)).toBeDisabled();
    expect(screen.getByLabelText(/Technology Track/)).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Description/), '<script>alert(1)</script>');
    await userEvent.tab();
    expect(await screen.findByText('Use only paragraphs, bold, italic, lists and https links; remove other markup and scripts.')).toBeInTheDocument();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('offers only the tracks enabled for the course’s entity, marking a track that already has a variant', async () => {
    renderCreate();
    await chooseCourse();
    expect(svc.moduleThreeOptions).toHaveBeenCalledWith('c1');
    expect(svc.tracksForEntity).toHaveBeenCalledWith('e1');
    expect(svc.variantsOfModule).toHaveBeenCalledWith('m3');
    const track = screen.getByLabelText(/Technology Track/);
    expect(within(track).getAllByRole('option')).toHaveLength(3);
    expect(within(track).getByRole('option', { name: 'T01 · Data Analytics (variant exists)' })).toBeDisabled();
    expect(within(track).getByRole('option', { name: 'T07 · Cyber Security' })).toBeEnabled();
  });

  it('creates the variant with the API payload and opens it', async () => {
    svc.create.mockResolvedValue(variant());
    renderCreate();
    await chooseCourse();
    await userEvent.selectOptions(screen.getByLabelText(/Technology Track/), 't7');
    await userEvent.selectOptions(screen.getByLabelText(/Track Modules \(count\)/), '22');
    await userEvent.type(screen.getByLabelText(/Syllabus Reference/), '  Track syllabus T07 v1.0 ');
    await userEvent.click(screen.getByRole('button', { name: 'Create track variant' }));
    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith({
        courseModuleId: 'm3',
        trackId: 't7',
        expectedTrackModules: 22,
        expectedOftCards: null,
        syllabusReference: 'Track syllabus T07 v1.0',
        description: null,
        isActive: true,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('shows the server’s 409 answer on the track', async () => {
    svc.create.mockRejectedValue(
      new ApiError('A variant for this track already exists.', 409, 'CONFLICT', [{ field: 'trackId', message: 'A variant for this track already exists.' }]),
    );
    renderCreate();
    await chooseCourse();
    await userEvent.selectOptions(screen.getByLabelText(/Technology Track/), 't7');
    await userEvent.click(screen.getByRole('button', { name: 'Create track variant' }));
    const message = await screen.findAllByText('A variant for this track already exists.');
    expect(message.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Technology Track/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Not saved.')).toBeInTheDocument();
  });
});

describe('Track variant form (Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.formOptions.mockReset().mockResolvedValue(formOptions);
    svc.get.mockReset().mockResolvedValue(variant());
    svc.update.mockReset();
  });

  it('shows the module and track as fixed and saves the four editable fields after confirmation', async () => {
    svc.update.mockResolvedValue(variant({ expectedOftCards: 13 }));
    renderEdit();
    expect(await screen.findByRole('heading', { name: 'Edit T07 · Cyber Security' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Technology Track/)).toBeDisabled();
    expect(screen.getByLabelText(/Module 3/)).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText(/OFT Cards \(count\)/), '13');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(svc.update).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith('v1', {
        expectedTrackModules: 22,
        expectedOftCards: 13,
        syllabusReference: 'Track syllabus T07 v1.0',
        description: '<p>The <strong>cyber security</strong> track.</p>',
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('offers no form for a retired variant', async () => {
    svc.get.mockResolvedValue(variant({ status: 'RETIRED' }));
    renderEdit();
    expect(await screen.findByText(/A retired track variant cannot be changed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { lmsOptions } from '../../options';
import LmsEntityCreate from '../pages/LmsEntityCreate';
import LmsEntityEdit from '../pages/LmsEntityEdit';
import LmsEntityView from '../pages/LmsEntityView';
import { lmsEntityService } from '../services/entityService';
import { centreOptions, ensureToastRoot, entity, formOptions, trackOptions } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/entityService', () => ({
  lmsEntityService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(), count: vi.fn(),
    formOptions: vi.fn(),
  },
}));
vi.mock('../../options', () => ({ lmsOptions: { centres: vi.fn(), tracks: vi.fn(), entities: vi.fn(), courses: vi.fn(), modules: vi.fn() } }));

const save = () => userEvent.click(screen.getByRole('button', { name: /Create entity|Save changes/ }));

describe('Entity form (Add / Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(lmsEntityService.formOptions).mockReset().mockResolvedValue(formOptions);
    vi.mocked(lmsEntityService.create).mockReset();
    vi.mocked(lmsEntityService.update).mockReset();
    vi.mocked(lmsEntityService.get).mockReset().mockResolvedValue(entity({ related: { codeLocked: false, references: [] } }));
    vi.mocked(lmsOptions.centres).mockReset().mockResolvedValue(centreOptions);
    vi.mocked(lmsOptions.tracks).mockReset().mockResolvedValue(trackOptions);
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderWithProviders(<LmsEntityCreate />);
    await screen.findByLabelText(/Entity Name/);
    /* Spec default time zone pre-filled; language left to choose; the open language list is flagged. */
    expect(screen.getByLabelText(/Time Zone/)).toHaveValue('Asia/Kolkata');
    expect(screen.getByLabelText(/Default Language/)).toHaveValue('');
    expect(screen.getByText(/To Be Confirmed \(OQ-023\)/)).toBeInTheDocument();

    await save();
    expect(screen.getByText('Enter an entity name.')).toBeInTheDocument();
    expect(screen.getByText('Enter an entity code.')).toBeInTheDocument();
    expect(screen.getByText('Select a language.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Entity Name/), 'Ab');
    expect(screen.getByText('Entity name must be at least 3 characters')).toBeInTheDocument();
    expect(lmsEntityService.create).not.toHaveBeenCalled();
  });

  it('creates an entity with the normalised values and the chosen centres and tracks', async () => {
    vi.mocked(lmsEntityService.create).mockResolvedValue(entity({ id: 'new1' }));
    renderWithProviders(<LmsEntityCreate />);
    await userEvent.type(await screen.findByLabelText(/Entity Name/), '  Sarthi ');
    /* The code box keeps only A–Z, 0–9 and hyphen, upper-cased. */
    await userEvent.type(screen.getByLabelText(/Entity Code/), 'amk_01');
    expect(screen.getByLabelText(/Entity Code/)).toHaveValue('AMK01');
    await userEvent.selectOptions(screen.getByLabelText(/Default Language/), 'mr');
    await userEvent.click(await screen.findByLabelText(/Pune Main Centre/));
    await userEvent.click(screen.getByLabelText(/Web Design & Development/));
    await save();

    await waitFor(() =>
      expect(lmsEntityService.create).toHaveBeenCalledWith({
        name: 'Sarthi',
        code: 'AMK01',
        description: null,
        defaultLanguage: 'mr',
        timeZone: 'Asia/Kolkata',
        centreIds: ['c3'],
        trackIds: ['t3'],
        isActive: true,
      }),
    );
  });

  it('shows a 409 duplicate answer next to the field', async () => {
    vi.mocked(lmsEntityService.create).mockRejectedValue(
      new ApiError('An entity with this code already exists', 409, 'CONFLICT', [{ field: 'code', message: 'This code is already used.' }]),
    );
    renderWithProviders(<LmsEntityCreate />);
    await userEvent.type(await screen.findByLabelText(/Entity Name/), 'Sarthi');
    await userEvent.type(screen.getByLabelText(/Entity Code/), 'AMK');
    await userEvent.selectOptions(screen.getByLabelText(/Default Language/), 'en');
    await save();
    expect(await screen.findByText('This code is already used.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Entity Code/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the option feeds failing with a working Retry', async () => {
    vi.mocked(lmsOptions.centres).mockRejectedValue(new ApiError('Reference data unavailable', 503, 'ERROR'));
    renderWithProviders(<LmsEntityCreate />);
    expect(await screen.findByText(/Reference data unavailable/)).toBeInTheDocument();
    vi.mocked(lmsOptions.centres).mockResolvedValue(centreOptions);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText(/Pune Main Centre/)).toBeInTheDocument();
  });

  it('edit keeps a saved centre that is now inactive, and sends the replaced selection', async () => {
    vi.mocked(lmsEntityService.update).mockResolvedValue(entity());
    renderWithProviders(
      <Routes>
        <Route path="/lms/entities/:id/edit" element={<LmsEntityEdit />} />
        <Route path="/lms/entities/:id" element={<div>view page</div>} />
      </Routes>,
      { route: '/lms/entities/e1/edit' },
    );
    expect(await screen.findByDisplayValue('Sarthi')).toBeInTheDocument();
    const old = await screen.findByLabelText(/Old Centre \(inactive\)/);
    expect(old).toBeChecked();
    expect(old).toBeEnabled();
    await userEvent.click(old);
    /* Once unticked, an inactive centre cannot be ticked again. */
    expect(old).not.toBeChecked();
    expect(old).toBeDisabled();
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(lmsEntityService.update).toHaveBeenCalledWith('e1', expect.objectContaining({ code: 'AMK', centreIds: ['c1'], trackIds: ['t1'] })),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('edit locks the code once courses use the entity and does not send it', async () => {
    vi.mocked(lmsEntityService.get).mockResolvedValue(entity({ related: { codeLocked: true, references: [{ label: '1 course', count: 1, locksCode: true }] } }));
    vi.mocked(lmsEntityService.update).mockResolvedValue(entity());
    renderWithProviders(
      <Routes>
        <Route path="/lms/entities/:id/edit" element={<LmsEntityEdit />} />
        <Route path="/lms/entities/:id" element={<div>view page</div>} />
      </Routes>,
      { route: '/lms/entities/e1/edit' },
    );
    expect(await screen.findByLabelText(/Entity Code/)).toBeDisabled();
    expect(screen.getByText(/courses already use this entity/)).toBeInTheDocument();
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() => expect(lmsEntityService.update).toHaveBeenCalled());
    expect(vi.mocked(lmsEntityService.update).mock.calls[0][1]).not.toHaveProperty('code');
  });
});

describe('<LmsEntityView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(lmsEntityService.formOptions).mockReset().mockResolvedValue(formOptions);
  });

  const renderView = () =>
    renderWithProviders(
      <Routes>
        <Route path="/lms/entities/:id" element={<LmsEntityView />} />
      </Routes>,
      { route: '/lms/entities/e1' },
    );

  it('shows the details, the enabled centres and tracks, and the readiness warnings', async () => {
    vi.mocked(lmsEntityService.get).mockReset().mockResolvedValue(entity({ enabledTracks: [], related: { codeLocked: false, references: [] } }));
    renderView();
    expect(await screen.findByText('Programme learning environment')).toBeInTheDocument();
    expect(await screen.findByText('Marathi (mr)')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Enabled centres' })).toHaveTextContent('Nashik Road Centre');
    expect(screen.getByText(/Select at least one track/)).toBeInTheDocument();
    expect(screen.getByText(/1 enabled centre is inactive in the Admin Panel/)).toBeInTheDocument();
    expect(screen.getByText('No LMS record uses this entity yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows the edit / status / delete actions to a user who holds them, and what blocks deletion', async () => {
    permissions.add('updateLmsEntity');
    permissions.add('deleteLmsEntity');
    vi.mocked(lmsEntityService.get).mockReset().mockResolvedValue(
      entity({ related: { codeLocked: true, references: [{ label: '2 courses', count: 2, locksCode: true }] } }),
    );
    renderView();
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByText('2 courses')).toBeInTheDocument();
    expect(screen.getByText(/locked \(courses use this entity\)/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(lmsEntityService.get).mockReset().mockRejectedValue(new ApiError('Entity not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Entity not found/)).toBeInTheDocument();
    vi.mocked(lmsEntityService.get).mockResolvedValue(entity());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Programme learning environment')).toBeInTheDocument();
  });
});

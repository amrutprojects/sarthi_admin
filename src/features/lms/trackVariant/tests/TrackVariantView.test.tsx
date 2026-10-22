import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import TrackVariantView from '../pages/TrackVariantView';
import { trackVariantService } from '../services/trackVariantService';
import type { ItemPath } from '../types/trackVariant.types';
import { complete, ensureToastRoot, formOptions, items, oftCards, phases, variant } from './fixtures';

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
const ALL = ['createLmsTrackVariant', 'updateLmsTrackVariant', 'deleteLmsTrackVariant'];

const renderView = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/track-variants/:id" element={<TrackVariantView />} />
      <Route path="/lms/track-variants" element={<div>variant list</div>} />
    </Routes>,
    { route: '/lms/track-variants/v1' },
  );

const dialog = () => screen.getByRole('dialog');

describe('<TrackVariantView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    svc.get.mockReset().mockResolvedValue(variant());
    svc.formOptions.mockReset().mockResolvedValue(formOptions);
    svc.listItems.mockReset().mockImplementation((async (_id: string, path: ItemPath) => items[path] ?? []) as never);
    svc.createItem.mockReset();
    svc.updateItem.mockReset();
    svc.removeItem.mockReset();
    svc.retireOftCard.mockReset();
    svc.publish.mockReset();
    svc.retire.mockReset();
    svc.remove.mockReset();
    svc.setStatus.mockReset();
  });

  it('shows the details, the completeness check with what is missing, and the curriculum, without write actions', async () => {
    renderView();
    expect(await screen.findByRole('heading', { name: /T07 · Cyber Security/ })).toBeInTheDocument();
    expect(screen.getByText('Track syllabus T07 v1.0')).toBeInTheDocument();
    /* Allow-listed rich text is rendered as markup. */
    expect(screen.getByText('cyber security', { selector: 'strong' })).toBeInTheDocument();

    const check = screen.getByRole('table', { name: 'Completeness check' });
    expect(within(check).getByText('Phases').closest('tr')).toHaveTextContent('27Missing');
    const missing = screen.getByRole('list', { name: 'Missing items' });
    expect(within(missing).getByText('2 of 7 phases; missing phase 3, 4, 5, 6 and 7.')).toBeInTheDocument();
    expect(within(missing).getAllByRole('listitem')).toHaveLength(3);
    expect(within(screen.getByRole('list', { name: 'Warnings' })).getByText(/below the module’s OFT minimum/)).toBeInTheDocument();

    const phasesTable = await screen.findByRole('table', { name: 'Phases' });
    expect(within(phasesTable).getByText('Foundations')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Phases (2)' })).toHaveAttribute('aria-selected', 'true');

    for (const name of ['Publish', 'Edit', 'Delete', 'Deactivate', 'Add phase', 'Edit phase 1', 'Delete phase 1']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('shows the empty state of a collection and its loading error with Retry', async () => {
    svc.listItems.mockImplementation((async (_id: string, path: ItemPath) => {
      if (path === 'readiness-gates') throw new ApiError('Gates unavailable', 503, 'ERROR');
      return path === 'phases' ? phases : [];
    }) as never);
    renderView();
    await userEvent.click(await screen.findByRole('tab', { name: /Learning components/ }));
    expect(await screen.findByText('No learning components yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Readiness gates/ }));
    expect(await screen.findByText(/Gates unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the server’s reason when publishing is refused', async () => {
    permissions.add('updateLmsTrackVariant');
    svc.publish.mockRejectedValue(
      new ApiError('The track variant is incomplete and cannot be published.', 409, 'CONFLICT', [
        { field: 'phases', message: '2 of 7 phases; missing phase 3, 4, 5, 6 and 7.' },
        { field: 'readinessGates', message: '0 of 6 readiness gates; missing gate 1, 2, 3, 4, 5 and 6.' },
      ]),
    );
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(within(dialog()).getByText(/the server refuses to publish an incomplete variant/)).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Yes, publish' }));
    await waitFor(() => expect(svc.publish).toHaveBeenCalledWith('v1'));
    const reasons = await screen.findByRole('list', { name: 'Reasons publishing was refused' });
    expect(screen.getByText('The track variant is incomplete and cannot be published.')).toBeInTheDocument();
    expect(within(reasons).getAllByRole('listitem')).toHaveLength(2);
  });

  it('publishes a complete draft, and retires a published variant after confirmation', async () => {
    permissions.add('updateLmsTrackVariant');
    permissions.add('deleteLmsTrackVariant');
    svc.get.mockResolvedValue(variant({ completeness: complete() }));
    svc.publish.mockResolvedValue(variant({ status: 'PUBLISHED', completeness: complete() }));
    const { unmount } = renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(within(dialog()).getByText(/Its draft OFT cards are published with it, which freezes their codes\.$/)).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Yes, publish' }));
    await waitFor(() => expect(svc.publish).toHaveBeenCalledWith('v1'));
    unmount();

    svc.get.mockResolvedValue(variant({ status: 'PUBLISHED', completeness: complete() }));
    svc.retire.mockResolvedValue(variant({ status: 'RETIRED', completeness: complete() }));
    renderView();
    await screen.findByRole('button', { name: 'Publish again' });
    /* A published variant is retired, never deleted. */
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retire' }));
    expect(svc.retire).not.toHaveBeenCalled();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Retire' }));
    await waitFor(() => expect(svc.retire).toHaveBeenCalledWith('v1'));
  });

  it('adds a phase through the dialog: field messages, the server’s 409 on the field, then the payload', async () => {
    ALL.forEach((p) => permissions.add(p));
    svc.createItem
      .mockRejectedValueOnce(new ApiError('This phase already exists for the variant.', 409, 'CONFLICT', [{ field: 'phaseNumber', message: 'This phase already exists for the variant.' }]))
      .mockResolvedValueOnce({ ...phases[0], id: 'p3', phaseNumber: 3, title: 'Integration' });
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Add phase' }));
    /* The next free phase number is offered; numbers already used are disabled. */
    expect(within(dialog()).getByLabelText(/Phase Number/)).toHaveValue('3');
    expect(within(dialog()).getByRole('option', { name: 'Phase 1 (already added)' })).toBeDisabled();

    await userEvent.type(within(dialog()).getByLabelText(/Title/), 'ab');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add phase' }));
    expect(await within(dialog()).findByText('Enter a phase title of 3 to 160 characters.')).toBeInTheDocument();
    expect(svc.createItem).not.toHaveBeenCalled();

    await userEvent.type(within(dialog()).getByLabelText(/Title/), 'c Integration');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add phase' }));
    expect(await within(dialog()).findAllByText('This phase already exists for the variant.')).not.toHaveLength(0);
    expect(within(dialog()).getByLabelText(/Phase Number/)).toHaveAttribute('aria-invalid', 'true');

    await userEvent.click(within(dialog()).getByRole('button', { name: 'Add phase' }));
    await waitFor(() => expect(svc.createItem).toHaveBeenLastCalledWith('v1', 'phases', { phaseNumber: 3, title: 'abc Integration', description: null }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    /* The completeness check is read again. */
    expect(svc.get).toHaveBeenCalledTimes(2);
  });

  it('asks before deleting a phase and shows the server’s refusal', async () => {
    ALL.forEach((p) => permissions.add(p));
    svc.removeItem.mockRejectedValue(
      new ApiError('This phase cannot be deleted while 1 track module references it. Deactivate it instead, or remove those records first.', 409, 'CONFLICT'),
    );
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete phase 1' }));
    expect(within(dialog()).getByText(/Delete phase 1 \(Foundations\)\?/)).toBeInTheDocument();
    expect(svc.removeItem).not.toHaveBeenCalled();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(svc.removeItem).toHaveBeenCalledWith('v1', 'phases', 'p1'));
    expect(await screen.findByText(/cannot be deleted while 1 track module references it/, { selector: '.callout div' })).toBeInTheDocument();
  });

  it('OFT cards: a published card’s code is frozen and it is retired, not deleted', async () => {
    ALL.forEach((p) => permissions.add(p));
    svc.updateItem.mockResolvedValue(oftCards[0]);
    svc.retireOftCard.mockResolvedValue({ ...oftCards[0], status: 'RETIRED' });
    renderView();
    await userEvent.click(await screen.findByRole('tab', { name: /OFT cards/ }));
    const table = await screen.findByRole('table', { name: 'OFT cards' });
    const published = within(table).getByText('OFT-M3-T07-01').closest('tr') as HTMLTableRowElement;
    expect(within(published).getByText('Code frozen (published)')).toHaveAttribute('title', expect.stringMatching(/cannot be changed once the card is published/));
    expect(within(published).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Delete OFT card OFT-M3-T07-02' })).toBeInTheDocument();

    await userEvent.click(within(published).getByRole('button', { name: 'Edit OFT card OFT-M3-T07-01' }));
    const code = within(dialog()).getByLabelText(/OFT Code/);
    expect(code).toHaveAttribute('readonly');
    expect(within(dialog()).getByText(/cannot be changed once the card is published/)).toBeInTheDocument();
    await userEvent.clear(within(dialog()).getByLabelText(/^Title/));
    await userEvent.type(within(dialog()).getByLabelText(/^Title/), 'Site Survey Report');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save OFT card' }));
    await waitFor(() => expect(svc.updateItem).toHaveBeenCalled());
    const [, path, itemId, body] = svc.updateItem.mock.calls[0];
    expect([path, itemId]).toEqual(['oft-cards', 'o1']);
    expect(body).not.toHaveProperty('oftCode');
    expect(body).toMatchObject({ title: 'Site Survey Report', hoursMin: 4, hoursMax: 6, evidenceTypes: ['PHOTOGRAPH', 'DOCUMENT'], hostVerificationRequired: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(within(screen.getByRole('table', { name: 'OFT cards' })).getByRole('button', { name: 'Retire OFT card OFT-M3-T07-01' }));
    expect(within(dialog()).getByText(/Retire the published OFT card OFT-M3-T07-01/)).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Retire' }));
    await waitFor(() => expect(svc.retireOftCard).toHaveBeenCalledWith('v1', 'o1'));
  });

  it('keeps the curriculum of a retired variant read-only', async () => {
    ALL.forEach((p) => permissions.add(p));
    svc.get.mockResolvedValue(variant({ status: 'RETIRED' }));
    renderView();
    expect(await screen.findByText(/This variant is retired/)).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Phases' });
    expect(screen.queryByRole('button', { name: 'Add phase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit phase 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});

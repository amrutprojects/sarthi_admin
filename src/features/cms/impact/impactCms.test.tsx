import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ImpactPage from './pages/ImpactPage';
import ImpactSettingsEdit from './pages/ImpactSettingsEdit';
import ImpactStatCreate from './pages/ImpactStatCreate';
import ImpactStatEdit from './pages/ImpactStatEdit';
import { impactService } from './services/impactService';
import type { ApiImpactSection, ApiImpactStat, Bilingual } from './types/impact.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/impactService', () => ({
  impactService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
    getSection: vi.fn(),
    updateSection: vi.fn(),
  },
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-impact.view', 'cms-impact.create', 'cms-impact.update', 'cms-impact.delete'];

/* The four seeded cards, as the home page showed them before the section was managed. */
const SEEDED: [string, string, string][] = [
  ['6+', 'योजना सुरू', 'Schemes running'],
  ['1,000+', 'लाभार्थी प्रवेशित', 'Beneficiaries enrolled'],
  ['36', 'जिल्ह्यांमध्ये पोहोच', 'Districts covered'],
  ['10', 'मंजूर प्रशिक्षण केंद्रे', 'Approved centres'],
];

const stat = (n: number, extra: Partial<ApiImpactStat> = {}): ApiImpactStat => {
  const [value, mr, en] = SEEDED[n - 1] ?? [`${n}0+`, `आकडा ${n}`, `Figure ${n}`];
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    value,
    label: pair(mr, en),
    displayOrder: n,
    isActive: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...extra,
  };
};

const section = (extra: Partial<ApiImpactSection> = {}): ApiImpactSection => ({
  id: 's1',
  heading: pair('अमृतचा प्रभाव', "AMRUT's Impact"),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/cms/impact" element={<ImpactPage />} />
      <Route path="/cms/impact/create" element={<ImpactStatCreate />} />
      <Route path="/cms/impact/settings" element={<ImpactSettingsEdit />} />
      <Route path="/cms/impact/:id/edit" element={<ImpactStatEdit />} />
    </Routes>,
    { route },
  );
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText('Value *'), '25+');
  await userEvent.type(screen.getByLabelText('Label (Marathi) *'), 'प्रशिक्षक');
  await userEvent.type(screen.getByLabelText('Label (English) *'), 'Trainers');
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(impactService.getSection).mockResolvedValue(section());
});

describe('AMRUT Impact list', () => {
  it('lists every card with its value, both labels, order and status, and the section settings', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3), stat(4, { isActive: false })]);
    renderAt('/cms/impact');
    await screen.findByText('Schemes running');
    for (const [value, mr, en] of SEEDED) {
      const r = row(en);
      expect(within(r).getByText(value)).toBeInTheDocument();
      expect(within(r).getByText(mr)).toBeInTheDocument();
    }
    expect(within(row('Districts covered')).getByText('3')).toBeInTheDocument();
    expect(within(row('Schemes running')).getByText('Active')).toBeInTheDocument();
    expect(within(row('Approved centres')).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('4 listed, 3 shown on the website')).toBeInTheDocument();
    expect(await screen.findByText('अमृतचा प्रभाव')).toBeInTheDocument();
    expect(screen.getByText("AMRUT's Impact")).toBeInTheDocument();
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });

  it('says the figures are typed in by hand, and that Schemes running does not follow AMRUT Schemes Management', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    renderAt('/cms/impact');
    await screen.findByText('Schemes running');
    const note = screen.getByText('These figures are entered by hand').closest('.callout') as HTMLElement;
    expect(note).toHaveClass('c-info');
    expect(note).toHaveTextContent('none of them is counted automatically');
    expect(note).toHaveTextContent('“Schemes running” does not update from AMRUT Schemes Management');
    expect(note).toHaveTextContent('update it here when schemes are added or removed');
  });

  it('filters by search and status, and hides reordering while filtered', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false })]);
    renderAt('/cms/impact');
    await screen.findByText('Schemes running');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search statistics' }), 'लाभार्थी');
    expect(screen.queryByText('Schemes running')).toBeNull();
    expect(screen.getByText('Beneficiaries enrolled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'active');
    expect(screen.getByText('Schemes running')).toBeInTheDocument();
    expect(screen.queryByText('Beneficiaries enrolled')).toBeNull();
  });

  it('shows an empty state and a retryable error', async () => {
    vi.mocked(impactService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt('/cms/impact');
    expect(await screen.findByText('No statistics yet')).toBeInTheDocument();
    unmount();
    vi.mocked(impactService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([stat(1)]);
    renderAt('/cms/impact');
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Schemes running')).toBeInTheDocument();
  });

  it('deletes the card named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
    vi.mocked(impactService.remove).mockResolvedValue();
    renderAt('/cms/impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete 1,000+ — लाभार्थी प्रवेशित / Beneficiaries enrolled?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(impactService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(impactService.remove).toHaveBeenCalledWith(stat(2).id));
    expect(impactService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deleted'));
  });

  it('reports a failed delete and keeps the list', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.remove).mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'));
    renderAt('/cms/impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Database unavailable'));
    expect(toasts()).not.toHaveTextContent('Statistic deleted');
    expect(screen.getByText('Beneficiaries enrolled')).toBeInTheDocument();
  });

  it('deactivates by id, and reports success only once the server has confirmed it', async () => {
    let confirm!: (s: ApiImpactStat) => void;
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.setStatus).mockReturnValueOnce(new Promise((resolve) => (confirm = resolve)));
    renderAt('/cms/impact');
    await screen.findByText('Schemes running');
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate Schemes running' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Deactivate 6+ — योजना सुरू / Schemes running?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, deactivate' }));
    expect(impactService.setStatus).toHaveBeenCalledWith(stat(1).id, false);
    expect(toasts()).not.toHaveTextContent('Statistic deactivated');
    confirm(stat(1, { isActive: false }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deactivated'));
  });

  it('activates an inactive card', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false })]);
    vi.mocked(impactService.setStatus).mockResolvedValueOnce(stat(2));
    renderAt('/cms/impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'Activate Beneficiaries enrolled' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, activate' }));
    await waitFor(() => expect(impactService.setStatus).toHaveBeenCalledWith(stat(2).id, true));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic activated'));
  });

  it('reorders by sending the whole list of ids, up and down', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
    vi.mocked(impactService.reorder).mockResolvedValue([]);
    renderAt('/cms/impact');
    await screen.findByText('Districts covered');
    expect(screen.getByRole('button', { name: 'Move Schemes running up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Districts covered down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Schemes running down' }));
    await waitFor(() => expect(impactService.reorder).toHaveBeenCalledWith([stat(2).id, stat(1).id, stat(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Districts covered up' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Move Districts covered up' }));
    await waitFor(() => expect(impactService.reorder).toHaveBeenLastCalledWith([stat(1).id, stat(3).id, stat(2).id]));
  });

  it('reloads the list when a reorder is refused because it changed elsewhere', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.reorder).mockRejectedValueOnce(new ApiError('The list has changed. Reload and try again.', 409, 'CONFLICT'));
    renderAt('/cms/impact');
    await screen.findByText('Beneficiaries enrolled');
    const loads = vi.mocked(impactService.list).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Move Schemes running down' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The list has changed'));
    await waitFor(() => expect(vi.mocked(impactService.list).mock.calls.length).toBeGreaterThan(loads));
  });

  it('gives a view-only administrator no Add, Edit, Activate, Deactivate, Delete or reorder controls', async () => {
    auth.permissions = new Set(['cms-impact.view']);
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false })]);
    renderAt('/cms/impact');
    await screen.findByText('Schemes running');
    expect(screen.queryByRole('button', { name: /Add New Statistic/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Activate|Deactivate|Move) / })).toBeNull();
    expect(await screen.findByText('अमृतचा प्रभाव')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit settings' })).toBeNull();
  });

  it('prints card text as text, never as HTML', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1, { value: '<b>9</b>', label: pair('<img src=x>', '<script>x</script>') })]);
    const { container } = renderAt('/cms/impact');
    expect(await screen.findByText('<script>x</script>')).toBeInTheDocument();
    expect(screen.getByText('<b>9</b>')).toBeInTheDocument();
    expect(container.querySelector('tbody img, tbody script')).toBeNull();
  });
});

describe('Add New Statistic', () => {
  it('names each missing required field', async () => {
    renderAt('/cms/impact/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    expect(await screen.findByText('Value is required')).toBeInTheDocument();
    expect(screen.getByText('Label (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Label (English) is required')).toBeInTheDocument();
    expect(impactService.create).not.toHaveBeenCalled();
  });

  it('refuses a blank-looking value, a long value, control characters and a bad display order before sending anything', async () => {
    renderAt('/cms/impact/create');
    await fillRequired();
    fireEvent.change(screen.getByLabelText('Value *'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Label (English) *'), { target: { value: 'Train\u0007ers' } });
    fireEvent.change(screen.getByLabelText('Display order'), { target: { value: '1000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    expect(await screen.findByText('Value is required')).toBeInTheDocument();
    expect(screen.getByText('Label (English) contains characters that are not allowed')).toBeInTheDocument();
    expect(screen.getByText('Display order must be a whole number from 1 to 999')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Value *'), { target: { value: '1'.repeat(21) } });
    expect(await screen.findByText('Value must be at most 20 characters')).toBeInTheDocument();
    expect(impactService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(impactService.create)
      .mockRejectedValueOnce(new ApiError('Too many requests', 429, 'RATE_LIMITED'))
      .mockResolvedValueOnce(stat(5));
    renderAt('/cms/impact/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Value *'), '0');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('25+0');
    expect(preview).toHaveTextContent('प्रशिक्षक');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Trainers');

    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Too many requests'));
    expect(toasts()).not.toHaveTextContent('Statistic added');
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    await waitFor(() => expect(impactService.create).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic added'));

    const [[body, key1], [, key2]] = vi.mocked(impactService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({ value: '25+0', label: pair('प्रशिक्षक', 'Trainers'), isActive: true });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('keeps the same Idempotency-Key when a save is retried after a lost response', async () => {
    vi.mocked(impactService.create)
      .mockRejectedValueOnce(new ApiError('Network error', 0, 'NETWORK_ERROR'))
      .mockResolvedValueOnce(stat(5));
    renderAt('/cms/impact/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Network error'));
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    await waitFor(() => expect(impactService.create).toHaveBeenCalledTimes(2));
    const [[, key1], [, key2]] = vi.mocked(impactService.create).mock.calls as [unknown, string][];
    expect(key2).toBe(key1);
  });

  it('sends the display order and status when they are set', async () => {
    vi.mocked(impactService.create).mockResolvedValueOnce(stat(5));
    renderAt('/cms/impact/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Display order'), '2');
    await userEvent.click(screen.getByRole('checkbox', { name: /Active — show on the website/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    await waitFor(() => expect(impactService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(impactService.create).mock.calls[0]![0]).toEqual({
      value: '25+',
      label: pair('प्रशिक्षक', 'Trainers'),
      displayOrder: 2,
      isActive: false,
    });
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(impactService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.value', message: 'Value contains characters that are not allowed' },
      ]),
    );
    renderAt('/cms/impact/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save statistic' }));
    expect(await screen.findByText('Value contains characters that are not allowed')).toBeInTheDocument();
    expect(screen.getByLabelText('Value *')).toHaveValue('25+');
  });

  it('tells a view-only administrator they cannot add a statistic', async () => {
    auth.permissions = new Set(['cms-impact.view']);
    renderAt('/cms/impact/create');
    expect(screen.getByText('You can view this section but not add statistics')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save statistic' })).toBeNull();
  });
});

describe('Edit Statistic', () => {
  it('loads the saved record and sends only what changed, with the version it was opened at', async () => {
    const saved = stat(1);
    vi.mocked(impactService.get).mockResolvedValue(saved);
    vi.mocked(impactService.update).mockResolvedValue(saved);
    renderAt(`/cms/impact/${saved.id}/edit`);
    expect(await screen.findByLabelText('Value *')).toHaveValue('6+');
    expect(screen.getByLabelText('Label (Marathi) *')).toHaveValue('योजना सुरू');
    expect(screen.getByLabelText('Label (English) *')).toHaveValue('Schemes running');
    expect(screen.getByLabelText('Display order')).toHaveValue(1);
    await userEvent.clear(screen.getByLabelText('Value *'));
    await userEvent.type(screen.getByLabelText('Value *'), '9+');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(impactService.update).toHaveBeenCalledWith(saved.id, { value: '9+', expectedUpdatedAt: saved.updatedAt }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic updated'));
  });

  it('keeps the form and reports it when someone else saved the card first', async () => {
    const saved = stat(2);
    vi.mocked(impactService.get).mockResolvedValue(saved);
    vi.mocked(impactService.update).mockRejectedValueOnce(
      new ApiError('This statistic was changed by someone else. Reload it and try again.', 409, 'CONFLICT'),
    );
    renderAt(`/cms/impact/${saved.id}/edit`);
    await userEvent.type(await screen.findByLabelText('Label (English) *'), ' so far');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('changed by someone else'));
    expect(toasts()).not.toHaveTextContent('Statistic updated');
    expect(screen.getByLabelText('Label (English) *')).toHaveValue('Beneficiaries enrolled so far');
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(impactService.get).mockResolvedValue(stat(3));
    renderAt(`/cms/impact/${stat(3).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Label (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(impactService.update).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the card cannot be loaded', async () => {
    vi.mocked(impactService.get).mockRejectedValueOnce(new ApiError('Statistic not found', 404, 'NOT_FOUND'));
    renderAt(`/cms/impact/${stat(9).id}/edit`);
    expect(await screen.findByText(/Statistic not found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});

describe('Section settings', () => {
  it('requires both halves of the heading, then saves with the loaded version', async () => {
    vi.mocked(impactService.updateSection).mockResolvedValue(section());
    renderAt('/cms/impact/settings');
    const heading = await screen.findByLabelText('Heading (English) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (English) is required')).toBeInTheDocument();
    expect(impactService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'Impact of AMRUT');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show this section on the public website' }));
    expect(screen.getByText(/While hidden, the home page leaves the whole section out/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(impactService.updateSection).toHaveBeenCalledWith({
        heading: pair('अमृतचा प्रभाव', 'Impact of AMRUT'),
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Section settings updated'));
  });

  it('refuses a heading longer than 120 characters', async () => {
    renderAt('/cms/impact/settings');
    const heading = await screen.findByLabelText('Heading (Marathi) *');
    fireEvent.change(heading, { target: { value: 'अ'.repeat(121) } });
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (Marathi) must be at most 120 characters')).toBeInTheDocument();
    expect(impactService.updateSection).not.toHaveBeenCalled();
  });

  it('shows a hidden section on the list page', async () => {
    vi.mocked(impactService.getSection).mockResolvedValue(section({ showSection: false }));
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    renderAt('/cms/impact');
    expect(await screen.findByText('Hidden')).toBeInTheDocument();
  });
});

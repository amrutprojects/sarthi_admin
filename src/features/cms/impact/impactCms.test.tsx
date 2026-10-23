import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ImpactTab from './components/ImpactTab';
import ImpactSettingsEdit from './pages/ImpactSettingsEdit';
import ImpactStatCreate from './pages/ImpactStatCreate';
import ImpactStatEdit from './pages/ImpactStatEdit';
import ImpactStatView from './pages/ImpactStatView';
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
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
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

/* The current path and query, so a test can see where a button went. */
function Location() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<ImpactTab />} />
        <Route path="/cms/impact/create" element={<ImpactStatCreate />} />
        <Route path="/cms/impact/settings" element={<ImpactSettingsEdit />} />
        <Route path="/cms/impact/:id/view" element={<ImpactStatView />} />
        <Route path="/cms/impact/:id/edit" element={<ImpactStatEdit />} />
      </Routes>
      <Location />
    </>,
    { route },
  );
const location = () => screen.getByTestId('location');
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
/* The statistics table's body rows, and the text of one of a row's cells. */
const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const cell = (r: HTMLElement, col: number) => within(r).getAllByRole('cell')[col]!;
/* The English label of each row, top to bottom. */
const labels = () => bodyRows().map((r) => cell(r, 2).querySelector('[lang="en"]')?.textContent);
/* Column headings without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((h) => (h.textContent ?? '').replace(/[▲▼⇅]/g, ''));
const search = () => screen.getByPlaceholderText('Search label or figure...');
/* Every Move button is shown but disabled: the table is not in website order. */
const moveButtonsOff = () => screen.getAllByRole('button', { name: /^Move / }).every((b) => b.hasAttribute('disabled'));

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
  it('lists every card in a FAQ-style table — order, both labels, figure, status, updated — and the section settings', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3), stat(4, { isActive: false })]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Label', 'Figure', 'Status', 'Updated', 'Action']);
    expect(screen.getByText('live from the backend').closest('h3')).toHaveTextContent('Statistics live from the backend');
    for (const [value, mr, en] of SEEDED) {
      const r = row(en);
      expect(within(r).getByText(value)).toBeInTheDocument();
      expect(within(r).getByText(mr)).toBeInTheDocument();
    }
    /* The English label in the brand colour, the Marathi one under it, as FAQ Management shows a question. */
    expect(screen.getByText('Schemes running')).toHaveClass('lnk');
    expect(cell(row('Districts covered'), 0)).toHaveTextContent('3');
    expect(cell(row('Districts covered'), 1)).toHaveTextContent('3');
    expect(within(row('Schemes running')).getByText('Active')).toBeInTheDocument();
    expect(within(row('Approved centres')).getByText('Inactive')).toBeInTheDocument();
    expect(labels()).toEqual(['Schemes running', 'Beneficiaries enrolled', 'Districts covered', 'Approved centres']);
    expect(screen.getByText('4 listed, 3 shown on the website')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-4 of 4 records');
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
    expect(await screen.findByText('अमृतचा प्रभाव')).toBeInTheDocument();
    expect(screen.getByText("AMRUT's Impact")).toBeInTheDocument();
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });

  it('says the figures are typed in by hand, and that Schemes running does not follow AMRUT Schemes Management', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    const note = screen.getByText('These figures are entered by hand').closest('.callout') as HTMLElement;
    expect(note).toHaveClass('c-info');
    expect(note).toHaveTextContent('none of them is counted automatically');
    expect(note).toHaveTextContent('“Schemes running” does not update from AMRUT Schemes Management');
    expect(note).toHaveTextContent('update it here when schemes are added or removed');
  });

  it('searches the figure and both labels, and disables reordering while a search is on', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false }), stat(3)]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    expect(screen.getByRole('button', { name: 'Move Schemes running down' })).toBeInTheDocument();

    await userEvent.type(search(), 'लाभार्थी');
    await waitFor(() => expect(screen.queryByText('Schemes running')).toBeNull());
    expect(labels()).toEqual(['Beneficiaries enrolled']);
    expect(screen.getByText('filtered')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-1 of 1 records');
    expect(moveButtonsOff()).toBe(true);
    expect(screen.getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();

    await userEvent.clear(search());
    await userEvent.type(search(), '36');
    await waitFor(() => expect(labels()).toEqual(['Districts covered']));

    await userEvent.clear(search());
    await userEvent.type(search(), 'Enrolled');
    await waitFor(() => expect(labels()).toEqual(['Beneficiaries enrolled']));

    await userEvent.type(search(), ' nowhere');
    expect(await screen.findByText('No statistic matches the current search.')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 0-0 of 0 records');
  });

  it('sorts by label, figure, status and date in the browser, and reorders only in website order', async () => {
    vi.mocked(impactService.list).mockResolvedValue([
      stat(1, { updatedAt: '2026-10-05T10:00:00.000Z' }),
      stat(2, { isActive: false }),
      stat(3, { updatedAt: '2026-10-03T10:00:00.000Z' }),
      stat(4),
    ]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');

    await userEvent.click(screen.getByRole('columnheader', { name: /Label/ }));
    expect(labels()).toEqual(['Approved centres', 'Beneficiaries enrolled', 'Districts covered', 'Schemes running']);
    expect(moveButtonsOff()).toBe(true);
    expect(screen.getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();

    /* The figure sorts as a number: 6+, 10, 36, 1,000+. */
    await userEvent.click(screen.getByRole('columnheader', { name: /Figure/ }));
    expect(labels()).toEqual(['Schemes running', 'Approved centres', 'Districts covered', 'Beneficiaries enrolled']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Figure/ }));
    expect(labels()).toEqual(['Beneficiaries enrolled', 'Districts covered', 'Approved centres', 'Schemes running']);

    await userEvent.click(screen.getByRole('columnheader', { name: /Status/ }));
    expect(labels().slice(-1)).toEqual(['Beneficiaries enrolled']);

    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    expect(labels()[0]).toBe('Schemes running');

    /* Descending order is not the website's order either. */
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(screen.getByRole('button', { name: 'Move Schemes running down' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(labels()).toEqual(['Approved centres', 'Districts covered', 'Beneficiaries enrolled', 'Schemes running']);
    expect(moveButtonsOff()).toBe(true);
  });

  it('pages the list 15 to a page, and moves a card across a page boundary', async () => {
    const many = Array.from({ length: 16 }, (_, i) => stat(i + 1));
    vi.mocked(impactService.list).mockResolvedValue(many);
    vi.mocked(impactService.reorder).mockResolvedValue([]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    expect(bodyRows()).toHaveLength(15);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-15 of 16 records');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 16-16 of 16 records');
    expect(labels()).toEqual(['Figure 16']);
    expect(cell(row('Figure 16'), 0)).toHaveTextContent('16');
    expect(screen.getByRole('button', { name: 'Move Figure 16 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Figure 16 up' }));
    const ids = many.map((s) => s.id);
    [ids[14], ids[15]] = [ids[15]!, ids[14]!];
    await waitFor(() => expect(impactService.reorder).toHaveBeenCalledWith(ids));
  });

  it('shows an empty state and a retryable error', async () => {
    vi.mocked(impactService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt('/cms/home-page?tab=impact');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/No statistics yet: the section shows no cards until one is added/)).toBeInTheDocument();
    unmount();
    vi.mocked(impactService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([stat(1)]);
    renderAt('/cms/home-page?tab=impact');
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Schemes running')).toBeInTheDocument();
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
    vi.mocked(impactService.get).mockImplementation(async (id) => [stat(1), stat(2), stat(3)].find((s) => s.id === id)!);
    const { unmount } = renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'View Beneficiaries enrolled' }));
    expect(location()).toHaveTextContent(`/cms/impact/${stat(2).id}/view`);
    expect(await screen.findByText('Statistic details')).toBeInTheDocument();
    expect(impactService.get).toHaveBeenCalledWith(stat(2).id);
    unmount();

    const again = renderAt('/cms/home-page?tab=impact');
    await userEvent.click(await screen.findByText('Districts covered'));
    expect(location()).toHaveTextContent(`/cms/impact/${stat(3).id}/view`);
    again.unmount();

    renderAt('/cms/home-page?tab=impact');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Schemes running' }));
    expect(location()).toHaveTextContent(`/cms/impact/${stat(1).id}/edit`);
    expect(await screen.findByLabelText('Value *')).toHaveValue('6+');
  });

  it('opens Add New Statistic and Edit settings from the tab head', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    const { unmount } = renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    await userEvent.click(screen.getByRole('button', { name: 'Add New Statistic' }));
    expect(location()).toHaveTextContent('/cms/impact/create');
    unmount();
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    await userEvent.click(screen.getByRole('button', { name: 'Edit settings' }));
    expect(location()).toHaveTextContent('/cms/impact/settings');
    expect(await screen.findByLabelText('Heading (English) *')).toHaveValue("AMRUT's Impact");
  });

  it('deletes the card named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
    vi.mocked(impactService.remove).mockResolvedValue();
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete 1,000+ — लाभार्थी प्रवेशित / Beneficiaries enrolled?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(impactService.remove).not.toHaveBeenCalled();
    expect(location()).toHaveTextContent('/cms/home-page?tab=impact');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(impactService.remove).toHaveBeenCalledWith(stat(2).id));
    expect(impactService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deleted'));
  });

  it('reports a failed delete and keeps the list', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.remove).mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'));
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beneficiaries enrolled' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Database unavailable'));
    expect(toasts()).not.toHaveTextContent('Statistic deleted');
    expect(screen.getByText('Beneficiaries enrolled')).toBeInTheDocument();
  });

  it('deactivates from the status switch, by id, and reports success only once the server has confirmed it', async () => {
    let confirm!: (s: ApiImpactStat) => void;
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.setStatus).mockReturnValueOnce(new Promise((resolve) => (confirm = resolve)));
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    await userEvent.click(screen.getByRole('switch', { name: 'Schemes running: active' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Deactivate 6+ — योजना सुरू / Schemes running?');
    /* The switch is in the row, which opens the View page: the click must not also do that. */
    expect(location()).toHaveTextContent('/cms/home-page?tab=impact');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, deactivate' }));
    expect(impactService.setStatus).toHaveBeenCalledWith(stat(1).id, false);
    expect(toasts()).not.toHaveTextContent('Statistic deactivated');
    confirm(stat(1, { isActive: false }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deactivated'));
  });

  it('activates an inactive card', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false })]);
    vi.mocked(impactService.setStatus).mockResolvedValueOnce(stat(2));
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Beneficiaries enrolled');
    await userEvent.click(screen.getByRole('switch', { name: 'Beneficiaries enrolled: inactive' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, activate' }));
    await waitFor(() => expect(impactService.setStatus).toHaveBeenCalledWith(stat(2).id, true));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic activated'));
  });

  it('reorders from the Order cell by sending the whole list of ids, up and down', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
    vi.mocked(impactService.reorder).mockResolvedValue([]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Districts covered');
    expect(within(cell(row('Schemes running'), 1)).getByRole('button', { name: 'Move Schemes running up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Districts covered down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Schemes running down' }));
    /* The buttons are in the row, which opens the View page: the click must not also do that. */
    expect(location()).toHaveTextContent('/cms/home-page?tab=impact');
    await waitFor(() => expect(impactService.reorder).toHaveBeenCalledWith([stat(2).id, stat(1).id, stat(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Districts covered up' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Move Districts covered up' }));
    await waitFor(() => expect(impactService.reorder).toHaveBeenLastCalledWith([stat(1).id, stat(3).id, stat(2).id]));
  });

  it('reloads the list when a reorder is refused because it changed elsewhere', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    vi.mocked(impactService.reorder).mockRejectedValueOnce(new ApiError('The list has changed. Reload and try again.', 409, 'CONFLICT'));
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Beneficiaries enrolled');
    const loads = vi.mocked(impactService.list).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Move Schemes running down' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The list has changed'));
    await waitFor(() => expect(vi.mocked(impactService.list).mock.calls.length).toBeGreaterThan(loads));
  });

  it('gives a view-only administrator the View button only — no Add, Edit, switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-impact.view']);
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2, { isActive: false })]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    expect(screen.getByRole('button', { name: 'View Schemes running' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add New Statistic/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Activate|Deactivate|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('Sort by Order, ascending, with no search to reorder.')).toBeNull();
    expect(await screen.findByText('अमृतचा प्रभाव')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit settings' })).toBeNull();
  });

  it('gives each write button only to the permission that allows it', async () => {
    auth.permissions = new Set(['cms-impact.view', 'cms-impact.delete']);
    vi.mocked(impactService.list).mockResolvedValue([stat(1), stat(2)]);
    renderAt('/cms/home-page?tab=impact');
    await screen.findByText('Schemes running');
    expect(screen.getByRole('button', { name: 'Delete Schemes running' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Schemes running' })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add New Statistic/ })).toBeNull();
  });

  it('prints card text as text, never as HTML', async () => {
    vi.mocked(impactService.list).mockResolvedValue([stat(1, { value: '<b>9</b>', label: pair('<img src=x>', '<script>x</script>') })]);
    const { container } = renderAt('/cms/home-page?tab=impact');
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
    renderAt('/cms/home-page?tab=impact');
    expect(await screen.findByText('Hidden')).toBeInTheDocument();
  });
});

describe('View Statistic', () => {
  /* The value beside a label in the page's label / value list. */
  const kv = (label: string) =>
    Array.from(document.querySelectorAll('.kv'))
      .find((e) => e.querySelector('span')?.textContent === label)
      ?.querySelector('b');

  it('shows every field in both languages, the status and a preview, under the Home Page Management trail', async () => {
    vi.mocked(impactService.get).mockResolvedValue(stat(2, { isActive: false }));
    renderAt(`/cms/impact/${stat(2).id}/view`);
    expect(await screen.findByRole('heading', { level: 1, name: /Beneficiaries enrolled/ })).toHaveTextContent('Order 2');
    expect(impactService.get).toHaveBeenCalledWith(stat(2).id);
    expect(document.querySelector('.crumb')).toHaveTextContent("Dashboard/CMS/Home Page Management/AMRUT's Impact/View");
    expect(kv('Figure')).toHaveTextContent('1,000+');
    expect(kv('Label (Marathi)')).toHaveTextContent('लाभार्थी प्रवेशित');
    expect(kv('Label (English)')).toHaveTextContent('Beneficiaries enrolled');
    expect(kv('Display order')).toHaveTextContent('2');
    expect(kv('Status')).toHaveTextContent('Inactive');
    expect(kv('On the website')).toHaveTextContent('Hidden from the home page');
    expect(kv('Created')).toHaveTextContent(new Date(stat(2).createdAt).toLocaleString('en-IN'));
    expect(kv('Last updated')).toHaveTextContent(new Date(stat(2).updatedAt).toLocaleString('en-IN'));
    expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('1,000+लाभार्थी प्रवेशित');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('1,000+Beneficiaries enrolled');
  });

  it('goes Back to the tab, and Edit to the Edit page', async () => {
    vi.mocked(impactService.get).mockResolvedValue(stat(1));
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    const { unmount } = renderAt(`/cms/impact/${stat(1).id}/view`);
    await screen.findByText('Statistic details');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(location()).toHaveTextContent('/cms/home-page?tab=impact');
    unmount();
    renderAt(`/cms/impact/${stat(1).id}/view`);
    await screen.findByText('Statistic details');
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(location()).toHaveTextContent(`/cms/impact/${stat(1).id}/edit`);
  });

  it('deactivates and activates the card by id', async () => {
    vi.mocked(impactService.get)
      .mockResolvedValueOnce(stat(1))
      .mockResolvedValueOnce(stat(1, { isActive: false }));
    vi.mocked(impactService.setStatus).mockResolvedValue(stat(1, { isActive: false }));
    renderAt(`/cms/impact/${stat(1).id}/view`);
    await screen.findByText('Statistic details');
    expect(kv('On the website')).toHaveTextContent("Shown in the AMRUT's Impact section of the home page");
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(impactService.setStatus).toHaveBeenCalledWith(stat(1).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deactivated'));
    expect(await screen.findByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(kv('Status')).toHaveTextContent('Inactive');
  });

  it('deletes only after confirmation, then returns to the tab', async () => {
    vi.mocked(impactService.get).mockResolvedValue(stat(3));
    vi.mocked(impactService.remove).mockResolvedValue();
    vi.mocked(impactService.list).mockResolvedValue([stat(1)]);
    renderAt(`/cms/impact/${stat(3).id}/view`);
    await screen.findByText('Statistic details');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete 36 — जिल्ह्यांमध्ये पोहोच / Districts covered?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(impactService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(impactService.remove).toHaveBeenCalledWith(stat(3).id));
    await waitFor(() => expect(toasts()).toHaveTextContent('Statistic deleted'));
    await waitFor(() => expect(location()).toHaveTextContent('/cms/home-page?tab=impact'));
  });

  it('gives a view-only administrator no Edit, Activate, Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-impact.view']);
    vi.mocked(impactService.get).mockResolvedValue(stat(1));
    renderAt(`/cms/impact/${stat(1).id}/view`);
    await screen.findByText('Statistic details');
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Activate|Deactivate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows a retryable error when the card cannot be loaded', async () => {
    vi.mocked(impactService.get)
      .mockRejectedValueOnce(new ApiError('Statistic not found', 404, 'NOT_FOUND'))
      .mockResolvedValueOnce(stat(1));
    renderAt(`/cms/impact/${stat(9).id}/view`);
    expect(await screen.findByText(/Statistic not found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Statistic details')).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import EcosystemTab from './components/EcosystemTab';
import EcosystemSettingsEdit from './pages/EcosystemSettingsEdit';
import ProgrammeCreate from './pages/ProgrammeCreate';
import ProgrammeEdit from './pages/ProgrammeEdit';
import ProgrammeView from './pages/ProgrammeView';
import { ecosystemService } from './services/ecosystemService';
import type { ApiEcosystemSection, ApiProgramme, Bilingual } from './types/ecosystem.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/ecosystemService', () => ({
  ecosystemService: {
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
const BLANK = pair('', '');
const ALL = ['cms-ecosystem.view', 'cms-ecosystem.create', 'cms-ecosystem.update', 'cms-ecosystem.delete'];

const programme = (n: number, extra: Partial<ApiProgramme> = {}): ApiProgramme => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: pair(`कार्ड ${n}`, `Card ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  icon: 'globe',
  link: null,
  linkLabel: BLANK,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiEcosystemSection => ({
  id: 's1',
  heading: pair('अमृत प्रणाली', 'The AMRUT Ecosystem'),
  subtitle: pair('अमृत अंतर्गत विविध विभाग व उपक्रम', 'Departments and initiatives under AMRUT'),
  linkLabel: pair('अधिक जाणून घ्या →', 'Learn more →'),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
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
        <Route path="/cms/home-page" element={<EcosystemTab />} />
        <Route path="/cms/amrut-ecosystem/create" element={<ProgrammeCreate />} />
        <Route path="/cms/amrut-ecosystem/settings" element={<EcosystemSettingsEdit />} />
        <Route path="/cms/amrut-ecosystem/:id/view" element={<ProgrammeView />} />
        <Route path="/cms/amrut-ecosystem/:id/edit" element={<ProgrammeEdit />} />
      </Routes>
      <Location />
    </>,
    { route },
  );
const TAB = '/cms/home-page?tab=ecosystem';
const location = () => screen.getByTestId('location');
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
/* The programmes table's body rows, and one of a row's cells. */
const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const cell = (r: HTMLElement, col: number) => within(r).getAllByRole('cell')[col]!;
/* The English name of each row, top to bottom. */
const names = () => bodyRows().map((r) => cell(r, 2).querySelector('[lang="en"]')?.textContent);
/* Column headings without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((h) => (h.textContent ?? '').replace(/[▲▼⇅]/g, ''));
const search = () => screen.getByPlaceholderText('Search name or description...');
/* Every Move button is shown but disabled: the table is not in website order. */
const moveButtonsOff = () => screen.getAllByRole('button', { name: /^Move / }).every((b) => b.hasAttribute('disabled'));

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(ecosystemService.getSection).mockResolvedValue(section());
});

describe('The AMRUT Ecosystem list', () => {
  it('lists every card in a FAQ-style table — order, both names, icon, status, updated — and the section settings', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([
      programme(1),
      programme(2, { name: pair('अमृत कलश', 'AMRUT Kalash'), icon: 'award', link: '/programme' }),
      programme(3, { link: 'https://example.gov.in/x', isActive: false }),
    ]);
    renderAt(TAB);
    await screen.findByText('Card 1');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Programme', 'Icon', 'Status', 'Updated', 'Action']);
    expect(screen.getByText('live from the backend').closest('h3')).toHaveTextContent('Programmes live from the backend');
    /* The English name in the brand colour, the Marathi one under it, as FAQ Management shows a question. */
    expect(screen.getByText('AMRUT Kalash')).toHaveClass('lnk');
    expect(within(row('AMRUT Kalash')).getByText('अमृत कलश')).toBeInTheDocument();
    expect(within(row('AMRUT Kalash')).getByRole('img', { name: 'Icon: Award / skills' })).toBeInTheDocument();
    expect(within(row('Card 1')).getByRole('img', { name: 'Icon: Tourism / world' })).toBeInTheDocument();
    expect(cell(row('Card 3'), 0)).toHaveTextContent('3');
    expect(cell(row('Card 3'), 1)).toHaveTextContent('3');
    expect(within(row('Card 1')).getByText('Active')).toBeInTheDocument();
    expect(within(row('Card 3')).getByText('Inactive')).toBeInTheDocument();
    expect(cell(row('Card 1'), 5)).toHaveTextContent(new Date(programme(1).updatedAt).toLocaleString('en-IN'));
    expect(names()).toEqual(['Card 1', 'AMRUT Kalash', 'Card 3']);
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-3 of 3 records');
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
    /* The old filter bar is gone: the search box and the sortable Status column replace it. */
    expect(screen.queryByRole('combobox', { name: 'Status filter' })).toBeNull();
    expect(await screen.findByText('अमृत प्रणाली')).toBeInTheDocument();
    expect(screen.getByText('Departments and initiatives under AMRUT')).toBeInTheDocument();
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });

  it('searches both names and descriptions, and disables reordering while a search is on', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([
      programme(1),
      programme(2, { isActive: false }),
      programme(3, { name: pair('अमृत कलश', 'AMRUT Kalash') }),
    ]);
    renderAt(TAB);
    await screen.findByText('Card 1');
    expect(screen.getByRole('button', { name: 'Move Card 1 down' })).toBeInTheDocument();

    await userEvent.type(search(), 'वर्णन 2');
    await waitFor(() => expect(screen.queryByText('Card 1')).toBeNull());
    expect(names()).toEqual(['Card 2']);
    expect(screen.getByText('filtered')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-1 of 1 records');
    expect(moveButtonsOff()).toBe(true);
    expect(screen.getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();

    await userEvent.clear(search());
    await userEvent.type(search(), 'कलश');
    await waitFor(() => expect(names()).toEqual(['AMRUT Kalash']));

    await userEvent.clear(search());
    await userEvent.type(search(), 'description 1');
    await waitFor(() => expect(names()).toEqual(['Card 1']));

    await userEvent.type(search(), ' nowhere');
    expect(await screen.findByText('No programme matches the current search.')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 0-0 of 0 records');

    await userEvent.clear(search());
    await waitFor(() => expect(names()).toEqual(['Card 1', 'Card 2', 'AMRUT Kalash']));
    expect(screen.getByRole('button', { name: 'Move Card 1 down' })).toBeInTheDocument();
  });

  it('sorts by name, status and date in the browser, and reorders only in website order', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([
      programme(1, { name: pair('ग', 'Gamma'), updatedAt: '2026-10-05T10:00:00.000Z' }),
      programme(2, { name: pair('अ', 'Alpha'), isActive: false }),
      programme(3, { name: pair('ड', 'Delta'), updatedAt: '2026-10-03T10:00:00.000Z' }),
      programme(4, { name: pair('ब', 'Beta') }),
    ]);
    renderAt(TAB);
    await screen.findByText('Gamma');

    await userEvent.click(screen.getByRole('columnheader', { name: /Programme/ }));
    expect(names()).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma']);
    expect(moveButtonsOff()).toBe(true);
    expect(screen.getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('columnheader', { name: /Programme/ }));
    expect(names()).toEqual(['Gamma', 'Delta', 'Beta', 'Alpha']);

    await userEvent.click(screen.getByRole('columnheader', { name: /Status/ }));
    expect(names().slice(-1)).toEqual(['Alpha']);

    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    expect(names()[0]).toBe('Gamma');

    /* The icon is a picture, not something to sort by. */
    expect(screen.getByRole('columnheader', { name: 'Icon' })).not.toHaveClass('sortable');

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(names()).toEqual(['Gamma', 'Alpha', 'Delta', 'Beta']);
    expect(screen.getByRole('button', { name: 'Move Gamma down' })).toBeInTheDocument();
    /* Descending order is not the website's order either. */
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(names()).toEqual(['Beta', 'Delta', 'Alpha', 'Gamma']);
    expect(moveButtonsOff()).toBe(true);
  });

  it('pages the list 15 to a page, and moves a card across a page boundary', async () => {
    const many = Array.from({ length: 16 }, (_, i) => programme(i + 1));
    vi.mocked(ecosystemService.list).mockResolvedValue(many);
    vi.mocked(ecosystemService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Card 1');
    expect(bodyRows()).toHaveLength(15);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1-15 of 16 records');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 16-16 of 16 records');
    expect(names()).toEqual(['Card 16']);
    expect(cell(row('Card 16'), 0)).toHaveTextContent('16');
    expect(screen.getByRole('button', { name: 'Move Card 16 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Card 16 up' }));
    const ids = many.map((p) => p.id);
    [ids[14], ids[15]] = [ids[15]!, ids[14]!];
    await waitFor(() => expect(ecosystemService.reorder).toHaveBeenCalledWith(ids));
  });

  it('shows an empty state and a retryable error', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/No programmes yet: the section shows no cards until one is added/)).toBeInTheDocument();
    unmount();
    vi.mocked(ecosystemService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([programme(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Card 1')).toBeInTheDocument();
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    const list = [programme(1), programme(2), programme(3)];
    vi.mocked(ecosystemService.list).mockResolvedValue(list);
    vi.mocked(ecosystemService.get).mockImplementation(async (id) => list.find((p) => p.id === id)!);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Card 2');
    await userEvent.click(screen.getByRole('button', { name: 'View Card 2' }));
    expect(location()).toHaveTextContent(`/cms/amrut-ecosystem/${programme(2).id}/view`);
    expect(await screen.findByText('Programme details')).toBeInTheDocument();
    expect(ecosystemService.get).toHaveBeenCalledWith(programme(2).id);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Card 3'));
    expect(location()).toHaveTextContent(`/cms/amrut-ecosystem/${programme(3).id}/view`);
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Card 1' }));
    expect(location()).toHaveTextContent(`/cms/amrut-ecosystem/${programme(1).id}/edit`);
    expect(await screen.findByLabelText('Programme name (English) *')).toHaveValue('Card 1');
  });

  it('opens Add New Programme and Edit settings from the tab head', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1)]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Card 1');
    await userEvent.click(screen.getByRole('button', { name: 'Add New Programme' }));
    expect(location()).toHaveTextContent('/cms/amrut-ecosystem/create');
    unmount();
    renderAt(TAB);
    await screen.findByText('Card 1');
    await userEvent.click(screen.getByRole('button', { name: 'Edit settings' }));
    expect(location()).toHaveTextContent('/cms/amrut-ecosystem/settings');
    expect(await screen.findByLabelText('Heading (English) *')).toHaveValue('The AMRUT Ecosystem');
  });

  it('deletes the card named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2), programme(3)]);
    vi.mocked(ecosystemService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Card 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Card 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete कार्ड 2 / Card 2?');
    /* The button is in the row, which opens the View page: the click must not also do that. */
    expect(location()).toHaveTextContent(TAB);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(ecosystemService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Card 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ecosystemService.remove).toHaveBeenCalledWith(programme(2).id));
    expect(ecosystemService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme deleted'));
  });

  it('reports a failed delete and keeps the list', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2)]);
    vi.mocked(ecosystemService.remove).mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'));
    renderAt(TAB);
    await screen.findByText('Card 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Card 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Database unavailable'));
    expect(toasts()).not.toHaveTextContent('Programme deleted');
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });

  it('deactivates from the status switch, by id, and reports success only once the server has confirmed it', async () => {
    let confirm!: (p: ApiProgramme) => void;
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2)]);
    vi.mocked(ecosystemService.setStatus).mockReturnValueOnce(new Promise((resolve) => (confirm = resolve)));
    renderAt(TAB);
    await screen.findByText('Card 1');
    await userEvent.click(screen.getByRole('switch', { name: 'Card 1: active' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Deactivate कार्ड 1 / Card 1?');
    /* The switch is in the row, which opens the View page: the click must not also do that. */
    expect(location()).toHaveTextContent(TAB);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, deactivate' }));
    expect(ecosystemService.setStatus).toHaveBeenCalledWith(programme(1).id, false);
    expect(toasts()).not.toHaveTextContent('Programme deactivated');
    confirm(programme(1, { isActive: false }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme deactivated'));
  });

  it('activates an inactive card', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2, { isActive: false })]);
    vi.mocked(ecosystemService.setStatus).mockResolvedValueOnce(programme(2));
    renderAt(TAB);
    await screen.findByText('Card 2');
    await userEvent.click(screen.getByRole('switch', { name: 'Card 2: inactive' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, activate' }));
    await waitFor(() => expect(ecosystemService.setStatus).toHaveBeenCalledWith(programme(2).id, true));
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme activated'));
  });

  it('reorders from the Order cell by sending the whole list of ids, up and down', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2), programme(3)]);
    vi.mocked(ecosystemService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Card 3');
    expect(within(cell(row('Card 1'), 1)).getByRole('button', { name: 'Move Card 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Card 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Card 1 down' }));
    /* The buttons are in the row, which opens the View page: the click must not also do that. */
    expect(location()).toHaveTextContent(TAB);
    await waitFor(() => expect(ecosystemService.reorder).toHaveBeenCalledWith([programme(2).id, programme(1).id, programme(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Card 3 up' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Move Card 3 up' }));
    await waitFor(() => expect(ecosystemService.reorder).toHaveBeenLastCalledWith([programme(1).id, programme(3).id, programme(2).id]));
  });

  it('reloads the list when a reorder is refused because it changed elsewhere', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2)]);
    vi.mocked(ecosystemService.reorder).mockRejectedValueOnce(new ApiError('The list has changed. Reload and try again.', 409, 'CONFLICT'));
    renderAt(TAB);
    await screen.findByText('Card 2');
    const loads = vi.mocked(ecosystemService.list).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Move Card 1 down' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The list has changed'));
    await waitFor(() => expect(vi.mocked(ecosystemService.list).mock.calls.length).toBeGreaterThan(loads));
  });

  it('gives a view-only administrator the View button only — no Add, Edit, switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-ecosystem.view']);
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2, { isActive: false })]);
    renderAt(TAB);
    await screen.findByText('Card 1');
    expect(screen.getByRole('button', { name: 'View Card 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add New Programme/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Activate|Deactivate|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('Sort by Order, ascending, with no search to reorder.')).toBeNull();
    expect(await screen.findByText('अमृत प्रणाली')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit settings' })).toBeNull();
  });

  it('gives each write button only to the permission that allows it', async () => {
    auth.permissions = new Set(['cms-ecosystem.view', 'cms-ecosystem.delete']);
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2)]);
    renderAt(TAB);
    await screen.findByText('Card 1');
    expect(screen.getByRole('button', { name: 'Delete Card 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Card 1' })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add New Programme/ })).toBeNull();
  });

  it('prints card text as text, never as HTML', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1, { name: pair('<img src=x>', '<script>x</script>') })]);
    const { container } = renderAt(TAB);
    expect(await screen.findByText('<script>x</script>')).toBeInTheDocument();
    expect(screen.getByText('<img src=x>')).toBeInTheDocument();
    expect(container.querySelector('tbody img, tbody script')).toBeNull();
  });
});

describe('Add New Programme', () => {
  it('names each missing field, including the icon', async () => {
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    expect(await screen.findByText('Programme name (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Description (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Choose an icon')).toBeInTheDocument();
    expect(ecosystemService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe destination before sending anything', async () => {
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.type(screen.getByLabelText('Destination'), 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or an address starting with https://'),
    ).toBeInTheDocument();
    expect(ecosystemService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(ecosystemService.create)
      .mockRejectedValueOnce(new ApiError('A programme named "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(programme(9));
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.type(screen.getByLabelText('Programme name (Marathi) *'), 'अमृत प्रणाली चाचणी');
    await userEvent.type(screen.getByLabelText('Programme name (English) *'), 'Ecosystem Test');
    await userEvent.type(screen.getByLabelText('Description (Marathi) *'), 'मराठी चाचणी वर्णन');
    await userEvent.type(screen.getByLabelText('Description (English) *'), 'Test description');
    await userEvent.click(screen.getByRole('radio', { name: 'Digital' }));
    await userEvent.type(screen.getByLabelText('Destination'), '/faq');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('अमृत प्रणाली चाचणी');
    expect(preview).toHaveTextContent('मराठी चाचणी वर्णन');
    expect(preview).toHaveTextContent('अधिक जाणून घ्या →');

    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    await waitFor(() => expect(ecosystemService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(ecosystemService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({
      name: pair('अमृत प्रणाली चाचणी', 'Ecosystem Test'),
      description: pair('मराठी चाचणी वर्णन', 'Test description'),
      icon: 'monitor',
      link: '/faq',
      linkLabel: BLANK,
      isActive: true,
    });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });
});

describe('Edit Programme', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = programme(4, { link: '/apply', icon: 'teacher' });
    vi.mocked(ecosystemService.get).mockResolvedValue(saved);
    vi.mocked(ecosystemService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-ecosystem/${saved.id}/edit`);
    expect(await screen.findByLabelText('Destination')).toHaveValue('/apply');
    expect(screen.getByRole('radio', { name: 'Education' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Award / skills' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(ecosystemService.update).toHaveBeenCalledWith(saved.id, { icon: 'award', expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(ecosystemService.get).mockResolvedValue(programme(5));
    renderAt(`/cms/amrut-ecosystem/${programme(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Programme name (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(ecosystemService.update).not.toHaveBeenCalled();
  });
});

describe('Section settings', () => {
  it('requires the heading and default label, then saves with the loaded version', async () => {
    vi.mocked(ecosystemService.updateSection).mockResolvedValue(section());
    renderAt('/cms/amrut-ecosystem/settings');
    const heading = await screen.findByLabelText('Heading (Marathi) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (Marathi) is required')).toBeInTheDocument();
    expect(ecosystemService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'नवीन शीर्षक');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show this section on the public website' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(ecosystemService.updateSection).toHaveBeenCalledWith({
        heading: pair('नवीन शीर्षक', 'The AMRUT Ecosystem'),
        subtitle: section().subtitle,
        linkLabel: section().linkLabel,
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
  });
});

describe('View Programme', () => {
  /* The value beside a label in the page's label / value list. */
  const kv = (label: string) =>
    Array.from(document.querySelectorAll('.kv'))
      .find((e) => e.querySelector('span')?.textContent === label)
      ?.querySelector('b');

  it('shows every field in both languages, the status and a preview, under the Home Page Management trail', async () => {
    const saved = programme(2, {
      name: pair('अमृत कलश', 'AMRUT Kalash'),
      icon: 'award',
      link: '/programme',
      linkLabel: pair('पहा →', 'See →'),
      isActive: false,
    });
    vi.mocked(ecosystemService.get).mockResolvedValue(saved);
    renderAt(`/cms/amrut-ecosystem/${saved.id}/view`);
    expect(await screen.findByRole('heading', { level: 1, name: /AMRUT Kalash/ })).toHaveTextContent('Order 2');
    expect(ecosystemService.get).toHaveBeenCalledWith(saved.id);
    expect(document.querySelector('.crumb')).toHaveTextContent('Dashboard/CMS/Home Page Management/The AMRUT Ecosystem/View');
    expect(kv('Programme name (Marathi)')).toHaveTextContent('अमृत कलश');
    expect(kv('Programme name (English)')).toHaveTextContent('AMRUT Kalash');
    expect(kv('Description (Marathi)')).toHaveTextContent('वर्णन 2');
    expect(kv('Description (English)')).toHaveTextContent('Description 2');
    expect(kv('Icon')).toHaveTextContent('Award / skills');
    expect(kv('Destination')).toHaveTextContent('/programme (a page of the public website)');
    expect(kv('Link label (Marathi)')).toHaveTextContent('पहा →');
    expect(kv('Link label (English)')).toHaveTextContent('See →');
    expect(kv('Display order')).toHaveTextContent('2');
    expect(kv('Status')).toHaveTextContent('Inactive');
    expect(kv('On the website')).toHaveTextContent('Hidden from the website');
    expect(kv('Created')).toHaveTextContent(new Date(saved.createdAt).toLocaleString('en-IN'));
    expect(kv('Last updated')).toHaveTextContent(new Date(saved.updatedAt).toLocaleString('en-IN'));
    expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('अमृत कलशवर्णन 2पहा →');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('AMRUT KalashDescription 2See →');
  });

  it("names the section's default link label for a card without its own, and an external or missing destination", async () => {
    vi.mocked(ecosystemService.get)
      .mockResolvedValueOnce(programme(1, { link: 'https://example.gov.in/x' }))
      .mockResolvedValueOnce(programme(3));
    const { unmount } = renderAt(`/cms/amrut-ecosystem/${programme(1).id}/view`);
    await screen.findByText('Programme details');
    expect(kv('Destination')).toHaveTextContent('https://example.gov.in/x (another website ↗)');
    await waitFor(() => expect(kv('Link label (Marathi)')).toHaveTextContent('Section default — अधिक जाणून घ्या →'));
    expect(kv('Link label (English)')).toHaveTextContent('Section default — Learn more →');
    expect(kv('On the website')).toHaveTextContent('Shown in the अमृत प्रणाली section of the home and About pages');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Learn more →');
    unmount();
    renderAt(`/cms/amrut-ecosystem/${programme(3).id}/view`);
    await screen.findByText('Programme details');
    expect(kv('Destination')).toHaveTextContent('No link — the card shows “not available”');
  });

  it('goes Back to the tab, and Edit to the Edit page', async () => {
    vi.mocked(ecosystemService.get).mockResolvedValue(programme(1));
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1)]);
    const { unmount } = renderAt(`/cms/amrut-ecosystem/${programme(1).id}/view`);
    await screen.findByText('Programme details');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(location()).toHaveTextContent(TAB);
    unmount();
    renderAt(`/cms/amrut-ecosystem/${programme(1).id}/view`);
    await screen.findByText('Programme details');
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(location()).toHaveTextContent(`/cms/amrut-ecosystem/${programme(1).id}/edit`);
  });

  it('deactivates and activates the card by id', async () => {
    vi.mocked(ecosystemService.get)
      .mockResolvedValueOnce(programme(1))
      .mockResolvedValueOnce(programme(1, { isActive: false }));
    vi.mocked(ecosystemService.setStatus).mockResolvedValue(programme(1, { isActive: false }));
    renderAt(`/cms/amrut-ecosystem/${programme(1).id}/view`);
    await screen.findByText('Programme details');
    expect(kv('Status')).toHaveTextContent('Active');
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(ecosystemService.setStatus).toHaveBeenCalledWith(programme(1).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme deactivated'));
    expect(await screen.findByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(kv('Status')).toHaveTextContent('Inactive');
  });

  it('deletes only after confirmation, then returns to the tab', async () => {
    vi.mocked(ecosystemService.get).mockResolvedValue(programme(3));
    vi.mocked(ecosystemService.remove).mockResolvedValue();
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1)]);
    renderAt(`/cms/amrut-ecosystem/${programme(3).id}/view`);
    await screen.findByText('Programme details');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete कार्ड 3 / Card 3?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(ecosystemService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ecosystemService.remove).toHaveBeenCalledWith(programme(3).id));
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme deleted'));
    await waitFor(() => expect(location()).toHaveTextContent(TAB));
  });

  it('gives a view-only administrator no Edit, Activate, Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-ecosystem.view']);
    vi.mocked(ecosystemService.get).mockResolvedValue(programme(1));
    renderAt(`/cms/amrut-ecosystem/${programme(1).id}/view`);
    await screen.findByText('Programme details');
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Activate|Deactivate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows a retryable error when the card cannot be loaded', async () => {
    vi.mocked(ecosystemService.get)
      .mockRejectedValueOnce(new ApiError('Programme not found', 404, 'NOT_FOUND'))
      .mockResolvedValueOnce(programme(1));
    renderAt(`/cms/amrut-ecosystem/${programme(9).id}/view`);
    expect(await screen.findByText(/Programme not found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Programme details')).toBeInTheDocument();
  });
});

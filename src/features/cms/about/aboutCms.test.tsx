import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import AboutTab from './components/AboutTab';
import { aboutEditPath, aboutViewPath } from './constants';
import CardEditorPage from './pages/CardEditorPage';
import CardView from './pages/CardView';
import FactEditorPage from './pages/FactEditorPage';
import FactView from './pages/FactView';
import { aboutService, toItem } from './services/aboutService';
import type * as AboutServiceModule from './services/aboutService';
import type { ApiAbout, ApiAboutCard, ApiAboutFact, Bilingual } from './types/about.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/aboutService', async (importOriginal) => {
  const real = await importOriginal<typeof AboutServiceModule>();
  return {
    toItem: real.toItem,
    aboutService: {
      get: vi.fn(),
      updateSection: vi.fn(),
      getItem: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      setItemStatus: vi.fn(),
      removeItem: vi.fn(),
      reorder: vi.fn(),
    },
  };
});
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-about.view', 'cms-about.create', 'cms-about.update', 'cms-about.delete'];
const T = { createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' };

const fact = (n: number, label: Bilingual, value: Bilingual): ApiAboutFact => ({
  id: `f${n}`,
  label,
  value,
  displayOrder: n,
  isActive: true,
  ...T,
});
const card = (n: number, heading: Bilingual, required: boolean): ApiAboutCard => ({
  id: `c${n}`,
  heading,
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  displayOrder: n,
  isActive: true,
  isRequired: required,
  ...T,
});

const about = (): ApiAbout => ({
  section: {
    id: 's1',
    heading: pair('अमृत विषयी माहिती', 'About AMRUT'),
    subtitle: pair('', ''),
    description: pair('मराठी वर्णन', 'AMRUT - the Academy of Maharashtra Research'),
    showSection: true,
    ...T,
  },
  facts: [
    fact(1, pair('स्थापना', 'Established'), pair('२०१९', 'By Government Resolution dated 22 August 2019')),
    fact(2, pair('मुख्यालय', 'Headquarters'), pair('मुख्यालय: पुणे', 'Headquarters: Pune')),
  ],
  cards: [
    card(1, pair('आमचे ध्येय', 'Our Mission'), true),
    card(2, pair('आमचा दृष्टिकोन', 'Our Vision'), true),
    card(3, pair('आमची मूल्ये', 'Our Values'), true),
    card(4, pair('आमची उद्दिष्टे', 'Our Objectives'), false),
  ],
});

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<AboutTab />} />
        <Route path="/cms/about-amrut/facts/create" element={<FactEditorPage />} />
        <Route path="/cms/about-amrut/facts/:id/edit" element={<FactEditorPage />} />
        <Route path="/cms/about-amrut/facts/:id/view" element={<FactView />} />
        <Route path="/cms/about-amrut/cards/create" element={<CardEditorPage />} />
        <Route path="/cms/about-amrut/cards/:id/edit" element={<CardEditorPage />} />
        <Route path="/cms/about-amrut/cards/:id/view" element={<CardView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=about';
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The card of one of the two tables, by its heading. */
const FACTS = /Organisation information/;
const CARDS = /Mission, Vision and Values cards/;
const area = (heading: RegExp) => screen.getByRole('heading', { name: heading }).closest('.card') as HTMLElement;
/* A table's column headings, without the sort arrows. */
const headings = (heading: RegExp) =>
  within(area(heading))
    .getAllByRole('columnheader')
    .map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* A table's titles (English, in the brand colour), top to bottom. */
const titles = (heading: RegExp) => [...area(heading).querySelectorAll('tbody tr b.lnk')].map((b) => b.textContent);
const searchBox = (heading: RegExp) => within(area(heading)).getByRole('textbox');

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(aboutService.get).mockResolvedValue(about());
});

describe('About AMRUT tab', () => {
  it('shows the saved section settings and description in editable fields', async () => {
    renderAt(TAB);
    expect(await screen.findByLabelText('Section heading (English) *')).toHaveValue('About AMRUT');
    expect(screen.getByLabelText('Section heading (Marathi) *')).toHaveValue('अमृत विषयी माहिती');
    expect(screen.getByLabelText('Description (English) *')).toHaveValue('AMRUT - the Academy of Maharashtra Research');
    /* Showing the section is the tab's one "Show on website" switch (Home Page Management), not a box here. */
    expect(screen.queryByRole('checkbox', { name: /Show this section/ })).not.toBeInTheDocument();
  });

  it('saves the section settings without touching whether the website shows the section', async () => {
    vi.mocked(aboutService.updateSection).mockResolvedValue({ ...about().section, heading: pair('अमृत विषयी माहिती', 'About AMRUT!') });
    renderAt(TAB);
    await userEvent.type(await screen.findByLabelText('Section heading (English) *'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(aboutService.updateSection).toHaveBeenCalledWith({
        heading: pair('अमृत विषयी माहिती', 'About AMRUT!'),
        subtitle: pair('', ''),
        expectedUpdatedAt: T.updatedAt,
      }),
    );
  });

  it('lists the information rows and the cards as FAQ-style tables', async () => {
    renderAt(TAB);
    await screen.findByText('Headquarters');

    expect(screen.getByRole('heading', { name: FACTS })).toHaveTextContent('3. Organisation information live from the backend');
    expect(screen.getByRole('heading', { name: CARDS })).toHaveTextContent('4. Mission, Vision and Values cards live from the backend');
    expect(headings(FACTS)).toEqual(['Sr. No.', 'Order', 'Label', 'Value', 'Status', 'Updated', 'Action']);
    expect(headings(CARDS)).toEqual(['Sr. No.', 'Order', 'Title', 'Status', 'Updated', 'Action']);
    expect(within(area(FACTS)).getByPlaceholderText('Search label or value...')).toBeInTheDocument();
    expect(within(area(CARDS)).getByPlaceholderText('Search title or description...')).toBeInTheDocument();

    /* Title: English in the brand colour, Marathi underneath; the fact's value beside it. */
    const hq = row('Headquarters');
    expect(within(hq).getByText('Headquarters', { selector: 'b.lnk' })).toBeInTheDocument();
    expect(within(hq).getByText('मुख्यालय')).toBeInTheDocument();
    expect(within(hq).getByText('Headquarters: Pune')).toBeInTheDocument();
    expect(within(hq).getByText('मुख्यालय: पुणे')).toBeInTheDocument();
    expect(within(hq).getByText('Active')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(hq).getAllByRole('cell')[0]).toHaveTextContent('2');
    expect(titles(FACTS)).toEqual(['Established', 'Headquarters']);
    expect(titles(CARDS)).toEqual(['Our Mission', 'Our Vision', 'Our Values', 'Our Objectives']);

    /* Each action of FAQ Management: view, edit, the status switch and delete. */
    const objectives = row('Our Objectives');
    expect(within(objectives).getByRole('button', { name: 'View Our Objectives' })).toBeInTheDocument();
    expect(within(objectives).getByRole('button', { name: 'Edit Our Objectives' })).toBeInTheDocument();
    expect(within(objectives).getByRole('switch', { name: 'Our Objectives: active' })).toBeInTheDocument();
    expect(within(objectives).getByRole('button', { name: 'Delete Our Objectives' })).toBeInTheDocument();
    /* Required cards: viewed, edited and reordered, but never switched off or deleted. */
    const mission = row('Our Mission');
    expect(within(mission).getByText('Required')).toBeInTheDocument();
    expect(within(mission).getByRole('button', { name: 'View Our Mission' })).toBeInTheDocument();
    expect(within(mission).getByRole('button', { name: 'Edit Our Mission' })).toBeInTheDocument();
    expect(within(mission).queryByRole('switch')).toBeNull();
    expect(within(mission).queryByRole('button', { name: /Delete/ })).toBeNull();

    /* The MasterTable footer. */
    expect(
      within(area(FACTS))
        .getByText(/^Showing/)
        .closest('.info'),
    ).toHaveTextContent('Showing 1-2 of 2 records');
    expect(
      within(area(CARDS))
        .getByText(/^Showing/)
        .closest('.info'),
    ).toHaveTextContent('Showing 1-4 of 4 records');
    expect(within(area(CARDS)).getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
  });

  it('keeps both Add buttons in the tab head', async () => {
    const { unmount } = renderAt(TAB);
    await screen.findByText('Headquarters');
    let head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add New Information Row/ }));
    expect(currentPath()).toBe('/cms/about-amrut/facts/create');
    unmount();

    renderAt(TAB);
    await screen.findByText('Headquarters');
    head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add New About Card/ }));
    expect(currentPath()).toBe('/cms/about-amrut/cards/create');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(aboutService.getItem).mockResolvedValue(toItem('facts', about().facts[1]!));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Headquarters' }));
    expect(currentPath()).toBe(aboutViewPath('facts', 'f2'));
    expect(currentPath()).toBe('/cms/about-amrut/facts/f2/view');
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Our Objectives'));
    expect(currentPath()).toBe('/cms/about-amrut/cards/c4/view');
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Our Objectives' }));
    expect(currentPath()).toBe(aboutEditPath('cards', 'c4'));
    expect(currentPath()).toBe('/cms/about-amrut/cards/c4/edit');
  });

  it('switches an additional card off through the status toggle after asking, by id', async () => {
    vi.mocked(aboutService.setItemStatus).mockResolvedValue();
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Our Objectives: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate आमची उद्दिष्टे / Our Objectives?');
    expect(aboutService.setItemStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(aboutService.setItemStatus).toHaveBeenCalledWith('cards', 'c4', false));
    await waitFor(() => expect(toasts()).toHaveTextContent('About Card deactivated'));
    expect(aboutService.get).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('deletes an additional card after confirmation, by id — and Cancel deletes nothing', async () => {
    vi.mocked(aboutService.removeItem).mockResolvedValue();
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Our Objectives' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete आमची उद्दिष्टे / Our Objectives?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(aboutService.removeItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Our Objectives' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(aboutService.removeItem).toHaveBeenCalledWith('cards', 'c4'));
    expect(aboutService.removeItem).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('About Card deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('searches each table on its own, in both languages', async () => {
    renderAt(TAB);
    await screen.findByText('Headquarters');

    await userEvent.type(searchBox(FACTS), 'pune');
    await waitFor(() => expect(titles(FACTS)).toEqual(['Headquarters']));
    expect(within(area(FACTS)).getByText('filtered')).toBeInTheDocument();
    expect(
      within(area(FACTS))
        .getByText(/^Showing/)
        .closest('.info'),
    ).toHaveTextContent('Showing 1-1 of 1 records');
    /* The cards table is not searched. */
    expect(titles(CARDS)).toHaveLength(4);
    expect(within(area(CARDS)).queryByText('filtered')).toBeNull();

    await userEvent.type(searchBox(CARDS), 'मूल्ये');
    await waitFor(() => expect(titles(CARDS)).toEqual(['Our Values']));
    await userEvent.clear(searchBox(CARDS));
    await userEvent.type(searchBox(CARDS), 'Description 4');
    await waitFor(() => expect(titles(CARDS)).toEqual(['Our Objectives']));

    await userEvent.clear(searchBox(FACTS));
    await userEvent.type(searchBox(FACTS), 'nothing like this');
    expect(await within(area(FACTS)).findByText('No records found')).toBeInTheDocument();
    expect(within(area(FACTS)).getByText('No information row matches the current search.')).toBeInTheDocument();
    expect(aboutService.get).toHaveBeenCalledTimes(1);
  });

  it('sorts by the title, and by Order back to the website order', async () => {
    renderAt(TAB);
    await screen.findByText('Our Objectives');
    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Title/ }));
    expect(titles(CARDS)).toEqual(['Our Mission', 'Our Objectives', 'Our Values', 'Our Vision']);
    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Title/ }));
    expect(titles(CARDS)).toEqual(['Our Vision', 'Our Values', 'Our Objectives', 'Our Mission']);
    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Order/ }));
    expect(titles(CARDS)).toEqual(['Our Mission', 'Our Vision', 'Our Values', 'Our Objectives']);
    /* The facts table keeps its own sort. */
    expect(titles(FACTS)).toEqual(['Established', 'Headquarters']);
  });

  it('reorders rows by sending the whole list of ids', async () => {
    vi.mocked(aboutService.reorder).mockResolvedValue();
    renderAt(TAB);
    expect(await screen.findByRole('button', { name: 'Move Established up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Headquarters down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Headquarters up' }));
    await waitFor(() => expect(aboutService.reorder).toHaveBeenCalledWith('facts', ['f2', 'f1']));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));

    await userEvent.click(screen.getByRole('button', { name: 'Move Our Values down' }));
    await waitFor(() => expect(aboutService.reorder).toHaveBeenLastCalledWith('cards', ['c1', 'c2', 'c4', 'c3']));
    expect(currentPath()).toBe(TAB);
  });

  it('allows re-ordering only while a table shows the website order: by Order ascending, nothing searched', async () => {
    renderAt(TAB);
    await screen.findByText('Our Objectives');
    const up = () => screen.getByRole('button', { name: 'Move Our Objectives up' });
    expect(up()).toBeEnabled();

    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Order/ }));
    expect(titles(CARDS)).toEqual(['Our Objectives', 'Our Values', 'Our Vision', 'Our Mission']);
    expect(up()).toBeDisabled();
    expect(within(area(CARDS)).getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();
    /* The other table is unaffected. */
    expect(screen.getByRole('button', { name: 'Move Headquarters up' })).toBeEnabled();
    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Updated/ }));
    expect(up()).toBeDisabled();
    await userEvent.click(within(area(CARDS)).getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await userEvent.type(searchBox(CARDS), 'Objectives');
    await waitFor(() => expect(titles(CARDS)).toEqual(['Our Objectives']));
    expect(up()).toBeDisabled();
    expect(aboutService.reorder).not.toHaveBeenCalled();
  });

  it('is read-only for a view-only administrator: View only, no Add, Edit, status switch, Delete or reorder', async () => {
    auth.permissions = new Set(['cms-about.view']);
    renderAt(TAB);
    expect(await screen.findByLabelText('Section heading (English) *')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Headquarters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Our Mission' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save|Add New|Edit |Delete |Move / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('View Information Row / View About Card', () => {
  it('shows every field of a row in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(aboutService.getItem).mockResolvedValue(toItem('facts', about().facts[1]!));
    renderAt(aboutViewPath('facts', 'f2'));

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('HeadquartersOrder 2');
    expect(aboutService.getItem).toHaveBeenCalledWith('facts', 'f2');
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'About AMRUT', 'View']);
    const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;
    expect(field('Label')).toHaveTextContent('मुख्यालयHeadquarters');
    expect(field('Value')).toHaveTextContent('मुख्यालय: पुणेHeadquarters: Pune');
    expect(field('Display order')).toHaveTextContent('2');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Shown in the About AMRUT section');
    expect(field('Created')).not.toHaveTextContent('—');
    expect(field('Last updated')).not.toHaveTextContent('—');
    expect(screen.queryByText('Required card')).toBeNull();

    /* The tab crumb goes back to the tab. */
    await userEvent.click(screen.getByText('About AMRUT', { selector: '.crumb > a' }));
    expect(currentPath()).toBe(TAB);
  });

  it('edits, deactivates and deletes (after asking) a card by id, and goes Back to the tab', async () => {
    const objectives = toItem('cards', about().cards[3]!);
    vi.mocked(aboutService.getItem).mockResolvedValue(objectives);
    vi.mocked(aboutService.setItemStatus).mockResolvedValue();
    vi.mocked(aboutService.removeItem).mockResolvedValue();
    const { unmount } = renderAt(aboutViewPath('cards', 'c4'));

    expect(await screen.findByText('Card heading', { selector: 'td b' })).toBeInTheDocument();
    const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;
    expect(field('Card heading')).toHaveTextContent('आमची उद्दिष्टेOur Objectives');
    expect(field('Card description')).toHaveTextContent('वर्णन 4Description 4');
    expect(field('Required card')).toHaveTextContent('No');

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(aboutService.setItemStatus).toHaveBeenCalledWith('cards', 'c4', false));
    await waitFor(() => expect(aboutService.getItem).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete आमची उद्दिष्टे / Our Objectives?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(aboutService.removeItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(aboutService.removeItem).toHaveBeenCalledWith('cards', 'c4'));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    unmount();

    const again = renderAt(aboutViewPath('cards', 'c4'));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe('/cms/about-amrut/cards/c4/edit');
    again.unmount();

    renderAt(aboutViewPath('cards', 'c4'));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('offers only Edit on a required card, and no write buttons to a view-only administrator', async () => {
    vi.mocked(aboutService.getItem).mockResolvedValue(toItem('cards', about().cards[0]!));
    const { unmount } = renderAt(aboutViewPath('cards', 'c1'));
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Required card', { selector: 'td b' }).closest('tr')).toHaveTextContent(/Yes/);
    expect(screen.queryByRole('button', { name: /^(Delete|Deactivate|Activate)$/ })).toBeNull();
    unmount();

    auth.permissions = new Set(['cms-about.view']);
    vi.mocked(aboutService.getItem).mockResolvedValue(toItem('facts', about().facts[0]!));
    renderAt(aboutViewPath('facts', 'f1'));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Established');
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });

  it('reports a record that cannot be loaded', async () => {
    vi.mocked(aboutService.getItem).mockRejectedValue(new ApiError('Information row not found', 404, 'NOT_FOUND'));
    renderAt(aboutViewPath('facts', 'gone'));
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });
});

describe('Row and card editors', () => {
  it('adds an information row with an Idempotency-Key, after naming missing fields', async () => {
    vi.mocked(aboutService.createItem).mockResolvedValue(toItem('facts', fact(9, pair('a', 'a'), pair('b', 'b'))));
    renderAt('/cms/about-amrut/facts/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save information row' }));
    expect(await screen.findByText('Label (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Value (English) is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Label (Marathi) *'), 'सीएमएस चाचणी क्षेत्र');
    await userEvent.type(screen.getByLabelText('Label (English) *'), 'CMS Test Field');
    await userEvent.type(screen.getByLabelText('Value (Marathi) *'), 'चाचणी मूल्य');
    await userEvent.type(screen.getByLabelText('Value (English) *'), 'Test value');
    expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('सीएमएस चाचणी क्षेत्रचाचणी मूल्य');
    await userEvent.click(screen.getByRole('button', { name: 'Save information row' }));
    await waitFor(() => expect(aboutService.createItem).toHaveBeenCalledTimes(1));
    const [kind, input, key] = vi.mocked(aboutService.createItem).mock.calls[0]!;
    expect(kind).toBe('facts');
    expect(input).toEqual({
      first: pair('सीएमएस चाचणी क्षेत्र', 'CMS Test Field'),
      second: pair('चाचणी मूल्य', 'Test value'),
      isActive: true,
    });
    expect(key).toBeTruthy();
    await waitFor(() => expect(currentPath()).toBe(TAB));
  });

  it('edits a required card: only the changed description is sent, and it cannot be switched off', async () => {
    const mission = toItem('cards', card(1, pair('आमचे ध्येय', 'Our Mission'), true));
    vi.mocked(aboutService.getItem).mockResolvedValue(mission);
    vi.mocked(aboutService.updateItem).mockResolvedValue(mission);
    renderAt('/cms/about-amrut/cards/c1/edit');
    const desc = await screen.findByLabelText('Card description (English) *');
    expect(screen.getByRole('checkbox', { name: /Active/ })).toBeDisabled();
    /* The display order is editable here too. */
    expect(screen.getByLabelText('Display order')).toHaveValue(1);
    await userEvent.clear(desc);
    await userEvent.type(desc, 'Temporary mission');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(aboutService.updateItem).toHaveBeenCalledWith('cards', 'c1', {
        second: pair('वर्णन 1', 'Temporary mission'),
        expectedUpdatedAt: T.updatedAt,
      }),
    );
  });

  it('shows the server message when a save is refused', async () => {
    vi.mocked(aboutService.createItem).mockRejectedValue(
      new ApiError('About card "आमचे ध्येय" / "Our Mission" already exists.', 409, 'CONFLICT'),
    );
    renderAt('/cms/about-amrut/cards/create');
    for (const [label, text] of [
      ['Card heading (Marathi) *', 'आमचे ध्येय'],
      ['Card heading (English) *', 'Our Mission'],
      ['Card description (Marathi) *', 'क'],
      ['Card description (English) *', 'x'],
    ]) {
      await userEvent.type(screen.getByLabelText(label!), text!);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Save about card' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
  });
});

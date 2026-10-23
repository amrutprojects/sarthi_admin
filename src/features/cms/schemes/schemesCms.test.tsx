import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { fmtDeadline, isExpired, schemeEditPath, schemeViewPath } from './constants';
import SchemeCreate from './pages/SchemeCreate';
import SchemeEdit from './pages/SchemeEdit';
import SchemeView from './pages/SchemeView';
import SchemesTab from './components/SchemesTab';
import SchemesSettingsEdit from './pages/SchemesSettingsEdit';
import { schemesService } from './services/schemesService';
import type { ApiScheme, ApiSchemesSection, Bilingual } from './types/schemes.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/schemesService', () => ({
  schemesService: {
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
const ALL = ['cms-schemes.view', 'cms-schemes.create', 'cms-schemes.update', 'cms-schemes.delete'];

const scheme = (n: number, extra: Partial<ApiScheme> = {}): ApiScheme => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  title: pair(`योजना ${n}`, `Scheme ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  badge: BLANK,
  deadline: '2030-12-31',
  link: null,
  buttonLabel: BLANK,
  featured: false,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiSchemesSection => ({
  id: 's1',
  heading: pair('अमृत योजना विभाग', 'AMRUT Schemes'),
  subtitle: pair(
    'अमृत संस्थेद्वारे राबवल्या जाणाऱ्या विविध प्रशिक्षण व विकास योजना.',
    'Training and development schemes implemented by AMRUT.',
  ),
  buttonLabel: pair('अधिक जाणून घ्या', 'Learn more'),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
});

const toasts = () => document.getElementById('toast-root')!;

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<SchemesTab />} />
        <Route path="/cms/amrut-schemes/create" element={<SchemeCreate />} />
        <Route path="/cms/amrut-schemes/settings" element={<SchemesSettingsEdit />} />
        <Route path="/cms/amrut-schemes/:id/edit" element={<SchemeEdit />} />
        <Route path="/cms/amrut-schemes/:id/view" element={<SchemeView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=schemes';
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* The English title of each row, top to bottom. */
const titles = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('b.lnk')?.textContent);
const SEARCH = 'Search title, description, badge or link...';
const search = (text: string) => userEvent.type(screen.getByPlaceholderText(SEARCH), text);
const info = () => screen.getByText(/^Showing/).closest('.info');

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText('Scheme title (Marathi) *'), 'अमृत सीएमएस चाचणी योजना');
  await userEvent.type(screen.getByLabelText('Scheme title (English) *'), 'AMRUT CMS Test Scheme');
  await userEvent.type(screen.getByLabelText('Description (Marathi) *'), 'चाचणी वर्णन');
  await userEvent.type(screen.getByLabelText('Description (English) *'), 'Test description');
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(schemesService.list).mockResolvedValue([]);
  vi.mocked(schemesService.getSection).mockResolvedValue(section());
});

describe('AMRUT Schemes list', () => {
  it('is a FAQ-style table: Sr. No., Order, Scheme, Link, Last date, Status, Updated and Action', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([
      scheme(1, {
        title: pair('अमृत कलश - कौशल्य प्रशिक्षण', 'AMRUT Kalash - Skill Training'),
        badge: pair('हा कार्यक्रम', 'This programme'),
        deadline: '2027-03-31',
        link: '/programme',
        featured: true,
      }),
      scheme(2, { deadline: '2020-03-11' }),
      scheme(3, { deadline: null, link: 'https://example.gov.in/x', buttonLabel: pair('भेट द्या', 'Visit'), isActive: false }),
    ]);
    renderAt(TAB);

    await screen.findByText('AMRUT Kalash - Skill Training');
    expect(screen.getByRole('heading', { name: /^Schemes/ })).toHaveTextContent('Schemes live from the backend');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Scheme', 'Link', 'Last date', 'Status', 'Updated', 'Action']);
    const kalash = row('AMRUT Kalash - Skill Training');
    /* English in the brand colour, Marathi underneath, as the FAQ question. */
    expect(within(kalash).getByText('AMRUT Kalash - Skill Training')).toHaveClass('lnk');
    expect(within(kalash).getByText('अमृत कलश - कौशल्य प्रशिक्षण')).toBeInTheDocument();
    expect(within(kalash).getByText('Highlighted')).toBeInTheDocument();
    expect(within(kalash).getByText('31 Mar 2027')).toBeInTheDocument();
    expect(within(kalash).getByText('/programme')).toBeInTheDocument();
    expect(within(kalash).getByText('Active')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText('11 Mar 2020')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText('Date passed')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText('No link')).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText('No last date')).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText('Inactive')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(kalash).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(info()).toHaveTextContent('Showing 1-3 of 3 records');
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
    /* Section settings summary */
    expect(await screen.findByText('अमृत योजना विभाग')).toBeInTheDocument();
  });

  it('shows No records found when there are no schemes, and a retryable error', async () => {
    vi.mocked(schemesService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add New Scheme to create the first card/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add New Scheme/ })).toHaveLength(1);
    unmount();

    vi.mocked(schemesService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([scheme(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Scheme 1')).toBeInTheDocument();
  });

  it('keeps Add New Scheme and Edit settings in the tab head', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1)]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Scheme 1');
    let head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add New Scheme/ }));
    expect(currentPath()).toBe('/cms/amrut-schemes/create');
    unmount();

    renderAt(TAB);
    head = document.querySelector('.cms-tab-head') as HTMLElement;
    const settings = within(head).getByRole('button', { name: /Edit settings/ });
    await waitFor(() => expect(settings).toBeEnabled());
    await userEvent.click(settings);
    expect(currentPath()).toBe('/cms/amrut-schemes/settings');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    vi.mocked(schemesService.get).mockResolvedValue(scheme(2));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Scheme 2' }));
    expect(currentPath()).toBe(schemeViewPath(scheme(2).id));
    expect(currentPath()).toBe(`/cms/amrut-schemes/${scheme(2).id}/view`);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Scheme 1'));
    expect(currentPath()).toBe(schemeViewPath(scheme(1).id));
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Scheme 2' }));
    expect(currentPath()).toBe(schemeEditPath(scheme(2).id));
    expect(currentPath()).toBe(`/cms/amrut-schemes/${scheme(2).id}/edit`);
  });

  it('switches a scheme off through the status toggle after asking, by id', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    vi.mocked(schemesService.setStatus).mockResolvedValue(scheme(2, { isActive: false }));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Scheme 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate योजना 2 / Scheme 2?');
    expect(schemesService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(schemesService.setStatus).toHaveBeenCalledWith(scheme(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Scheme deactivated'));
    expect(schemesService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('deletes the scheme named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2), scheme(3)]);
    vi.mocked(schemesService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Scheme 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete योजना 2 / Scheme 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(schemesService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(schemesService.remove).toHaveBeenCalledWith(scheme(2).id));
    expect(schemesService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Scheme deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('reports a failed delete and keeps the list', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    vi.mocked(schemesService.remove).mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'));
    renderAt(TAB);
    await screen.findByText('Scheme 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Database unavailable'));
    expect(screen.getByText('Scheme 2')).toBeInTheDocument();
  });

  it('searches titles, descriptions, badges and links in both languages', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2, { badge: pair('नवीन', 'New') }), scheme(3, { link: '/apply' })]);
    renderAt(TAB);
    await screen.findByText('Scheme 1');

    await search('वर्णन 1');
    await waitFor(() => expect(titles()).toEqual(['Scheme 1']));
    expect(screen.getByText('filtered')).toBeInTheDocument();
    expect(info()).toHaveTextContent('Showing 1-1 of 1 records');

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('new');
    await waitFor(() => expect(titles()).toEqual(['Scheme 2']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('/apply');
    await waitFor(() => expect(titles()).toEqual(['Scheme 3']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('nothing like it');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No scheme matches the current search.')).toBeInTheDocument();
    expect(schemesService.list).toHaveBeenCalledTimes(1);
  });

  it('sorts by title and by last date, keeping blank dates last, and pages 15 at a time', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([
      scheme(1, { title: pair('झ', 'Zilla Scheme'), deadline: '2028-01-01' }),
      scheme(2, { title: pair('ब', 'Bhavan Scheme'), deadline: null }),
      scheme(3, { title: pair('अ', 'Apprentice Scheme'), deadline: '2027-01-01' }),
    ]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Zilla Scheme');
    expect(titles()).toEqual(['Zilla Scheme', 'Bhavan Scheme', 'Apprentice Scheme']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Scheme/ }));
    expect(titles()).toEqual(['Apprentice Scheme', 'Bhavan Scheme', 'Zilla Scheme']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Scheme/ }));
    expect(titles()).toEqual(['Zilla Scheme', 'Bhavan Scheme', 'Apprentice Scheme']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Last date/ }));
    expect(titles()).toEqual(['Apprentice Scheme', 'Zilla Scheme', 'Bhavan Scheme']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Last date/ }));
    expect(titles()).toEqual(['Zilla Scheme', 'Apprentice Scheme', 'Bhavan Scheme']);
    unmount();

    vi.mocked(schemesService.list).mockResolvedValue(Array.from({ length: 17 }, (_, i) => scheme(i + 1)));
    renderAt(TAB);
    await screen.findByText('Scheme 15');
    expect(screen.queryByText('Scheme 16')).toBeNull();
    expect(info()).toHaveTextContent('Showing 1-15 of 17 records');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Scheme 17')).toBeInTheDocument();
    expect(info()).toHaveTextContent('Showing 16-17 of 17 records');
  });

  it('reorders by sending the whole list of ids, across pages too', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2), scheme(3)]);
    vi.mocked(schemesService.reorder).mockResolvedValue([]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Scheme 3');
    expect(screen.getByRole('button', { name: 'Move Scheme 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Scheme 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Scheme 1 down' }));
    await waitFor(() => expect(schemesService.reorder).toHaveBeenCalledWith([scheme(2).id, scheme(1).id, scheme(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    /* The buttons stay on the list page. */
    expect(currentPath()).toBe(TAB);
    unmount();

    const many = Array.from({ length: 17 }, (_, i) => scheme(i + 1));
    vi.mocked(schemesService.list).mockResolvedValue(many);
    vi.mocked(schemesService.reorder).mockClear();
    renderAt(TAB);
    await screen.findByText('Scheme 15');
    await userEvent.click(screen.getByRole('button', { name: 'Move Scheme 15 down' }));
    const ids = many.map((s) => s.id);
    [ids[14], ids[15]] = [ids[15]!, ids[14]!];
    await waitFor(() => expect(schemesService.reorder).toHaveBeenCalledWith(ids));
  });

  it('allows re-ordering only while the table shows the website order: by Order ascending, nothing searched', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2), scheme(3)]);
    renderAt(TAB);
    await screen.findByText('Scheme 3');
    const up = () => screen.getByRole('button', { name: 'Move Scheme 3 up' });
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(titles()).toEqual(['Scheme 3', 'Scheme 2', 'Scheme 1']);
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await search('Scheme 3');
    await waitFor(() => expect(titles()).toEqual(['Scheme 3']));
    expect(up()).toBeDisabled();
    expect(schemesService.reorder).not.toHaveBeenCalled();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-schemes.view']);
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    renderAt(TAB);
    await screen.findByText('Scheme 1');
    expect(screen.getByRole('button', { name: 'View Scheme 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add New Scheme/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Hide|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit settings/ })).toBeNull();
  });
});

describe('View Scheme', () => {
  const viewed = () =>
    scheme(7, {
      badge: pair('हा कार्यक्रम', 'This programme'),
      deadline: '2030-03-31',
      link: 'https://example.gov.in/scheme',
      buttonLabel: pair('भेट द्या', 'Visit'),
      featured: true,
    });
  const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;

  it('shows every field in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(schemesService.get).mockResolvedValue(viewed());
    renderAt(schemeViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Scheme 7/ })).toHaveTextContent('Scheme 7Order 7');
    expect(schemesService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'AMRUT Schemes', 'View']);
    expect(field('Scheme title')).toHaveTextContent('योजना 7Scheme 7');
    expect(field('Description')).toHaveTextContent('वर्णन 7Description 7');
    expect(field('Badge')).toHaveTextContent('हा कार्यक्रमThis programme');
    expect(field('Last date')).toHaveTextContent('31 Mar 2030');
    expect(field('Last date')).not.toHaveTextContent('Date passed');
    expect(field('Button label')).toHaveTextContent('भेट द्याVisit');
    expect(field('Destination (link)')).toHaveTextContent('https://example.gov.in/scheme');
    expect(field('Destination (link)')).toHaveTextContent('Another site, opened in a new tab');
    expect(field('Card style')).toHaveTextContent('Highlighted');
    expect(field('Display order')).toHaveTextContent('7');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Shown in the AMRUT Schemes section');
    expect(field('Created')).not.toHaveTextContent('—');
    expect(field('Last updated')).not.toHaveTextContent('—');
    /* The card as the website draws it, in both languages. */
    expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('अंतिम दिनांक: 31 Mar 2030');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Visit');
  });

  it('marks a blank badge, no link, a passed date and the section’s default button label', async () => {
    vi.mocked(schemesService.get).mockResolvedValue(scheme(8, { deadline: '2020-01-31', isActive: false }));
    renderAt(schemeViewPath(scheme(8).id));
    expect(await screen.findByRole('heading', { name: /Scheme 8/ })).toBeInTheDocument();
    expect(field('Badge')).toHaveTextContent('—');
    expect(field('Last date')).toHaveTextContent('31 Jan 2020');
    expect(field('Last date')).toHaveTextContent('Date passed');
    expect(field('Destination (link)')).toHaveTextContent('No link');
    await waitFor(() => expect(field('Button label')).toHaveTextContent('अधिक जाणून घ्याLearn more'));
    expect(field('Button label')).toHaveTextContent('The section’s default label');
    expect(field('Card style')).toHaveTextContent('Standard');
    expect(within(field('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Hidden from the website');
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('edits, deactivates and deletes (after asking) the scheme, and goes Back to the tab', async () => {
    vi.mocked(schemesService.get).mockResolvedValue(viewed());
    vi.mocked(schemesService.setStatus).mockResolvedValue(viewed());
    vi.mocked(schemesService.remove).mockResolvedValue();
    const { unmount } = renderAt(schemeViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(schemesService.setStatus).toHaveBeenCalledWith(viewed().id, false));
    await waitFor(() => expect(schemesService.get).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete योजना 7 / Scheme 7?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(schemesService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(schemesService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    unmount();

    const again = renderAt(schemeViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(schemeEditPath(viewed().id));
    again.unmount();

    renderAt(schemeViewPath(viewed().id));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('gives a view-only administrator no Edit, Activate / Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-schemes.view']);
    vi.mocked(schemesService.get).mockResolvedValue(viewed());
    renderAt(schemeViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Scheme 7/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });

  it('shows a retryable error when the scheme cannot be loaded', async () => {
    vi.mocked(schemesService.get)
      .mockRejectedValueOnce(new ApiError('Scheme not found', 404, 'NOT_FOUND'))
      .mockResolvedValueOnce(viewed());
    renderAt(schemeViewPath(viewed().id));
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Scheme 7/ })).toBeInTheDocument();
  });
});

describe('Add New Scheme', () => {
  it('names each missing required field', async () => {
    renderAt('/cms/amrut-schemes/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(await screen.findByText('Scheme title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Scheme title (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Description (English) is required')).toBeInTheDocument();
    expect(schemesService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe destination, a half-filled badge and an impossible date before sending anything', async () => {
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Destination'), 'javascript:alert(1)');
    await userEvent.type(screen.getByLabelText('Badge (Marathi)'), 'नवीन');
    /* A date input yields only YYYY-MM-DD or ''; typed text can still reach it in browsers without a picker. */
    const date = screen.getByLabelText('Last date');
    date.setAttribute('type', 'text');
    await userEvent.type(date, '2026-02-30');
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or an address starting with https://'),
    ).toBeInTheDocument();
    expect(screen.getByText('Badge (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(screen.getByText('Last date is not a real calendar date')).toBeInTheDocument();
    expect(schemesService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(schemesService.create)
      .mockRejectedValueOnce(new ApiError('A scheme titled "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(scheme(9));
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Badge (Marathi)'), 'नवीन');
    await userEvent.type(screen.getByLabelText('Badge (English)'), 'New');
    await userEvent.type(screen.getByLabelText('Last date'), '2027-01-15');
    await userEvent.type(screen.getByLabelText('Destination'), '/apply');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('अमृत सीएमएस चाचणी योजना');
    expect(preview).toHaveTextContent('नवीन');
    expect(preview).toHaveTextContent('अंतिम दिनांक: 15 Jan 2027');
    expect(preview).toHaveTextContent('अधिक जाणून घ्या');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Last date: 15 Jan 2027');

    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(schemesService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(schemesService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({
      title: pair('अमृत सीएमएस चाचणी योजना', 'AMRUT CMS Test Scheme'),
      description: pair('चाचणी वर्णन', 'Test description'),
      badge: pair('नवीन', 'New'),
      deadline: '2027-01-15',
      link: '/apply',
      buttonLabel: BLANK,
      featured: false,
      isActive: true,
    });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('saves a scheme with no badge, no last date and no link', async () => {
    vi.mocked(schemesService.create).mockResolvedValueOnce(scheme(9));
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(schemesService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(schemesService.create).mock.calls[0]![0]).toMatchObject({ badge: BLANK, deadline: null, link: null });
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(schemesService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.deadline', message: 'Last date must be between the years 2000 and 2100' },
      ]),
    );
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(await screen.findByText('Last date must be between the years 2000 and 2100')).toBeInTheDocument();
  });
});

describe('Edit Scheme', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = scheme(4, { link: '/apply', deadline: '2026-06-30', badge: pair('नवीन', 'New') });
    vi.mocked(schemesService.get).mockResolvedValue(saved);
    vi.mocked(schemesService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-schemes/${saved.id}/edit`);
    expect(await screen.findByLabelText('Destination')).toHaveValue('/apply');
    expect(screen.getByLabelText('Last date')).toHaveValue('2026-06-30');
    expect(screen.getByLabelText('Badge (English)')).toHaveValue('New');
    await userEvent.clear(screen.getByLabelText('Last date'));
    await userEvent.type(screen.getByLabelText('Last date'), '2027-07-31');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(schemesService.update).toHaveBeenCalledWith(saved.id, { deadline: '2027-07-31', expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('can clear the last date and the badge', async () => {
    const saved = scheme(6, { badge: pair('नवीन', 'New') });
    vi.mocked(schemesService.get).mockResolvedValue(saved);
    vi.mocked(schemesService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-schemes/${saved.id}/edit`);
    await userEvent.click(await screen.findByRole('button', { name: 'Clear date' }));
    await userEvent.clear(screen.getByLabelText('Badge (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Badge (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(schemesService.update).toHaveBeenCalledWith(saved.id, { deadline: null, badge: BLANK, expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(schemesService.get).mockResolvedValue(scheme(5));
    renderAt(`/cms/amrut-schemes/${scheme(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Scheme title (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(schemesService.update).not.toHaveBeenCalled();
  });
});

describe('Section settings', () => {
  it('requires the heading and default button label, then saves with the loaded version', async () => {
    vi.mocked(schemesService.updateSection).mockResolvedValue(section());
    renderAt('/cms/amrut-schemes/settings');
    const heading = await screen.findByLabelText('Heading (English) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (English) is required')).toBeInTheDocument();
    expect(schemesService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'Schemes of AMRUT');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show this section on the public website' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(schemesService.updateSection).toHaveBeenCalledWith({
        heading: pair('अमृत योजना विभाग', 'Schemes of AMRUT'),
        subtitle: section().subtitle,
        buttonLabel: section().buttonLabel,
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
  });
});

describe('Deadline helpers', () => {
  it('formats like the website and never shifts the day', () => {
    expect(fmtDeadline('2027-03-31')).toBe('31 Mar 2027');
    expect(fmtDeadline('2026-06-09')).toBe('9 Jun 2026');
    expect(fmtDeadline(null)).toBe('');
    expect(isExpired('2026-03-11', '2026-10-22')).toBe(true);
    expect(isExpired('2026-10-22', '2026-10-22')).toBe(false);
    expect(isExpired(null, '2026-10-22')).toBe(false);
  });
});

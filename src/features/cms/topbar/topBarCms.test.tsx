import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import TopBarPreview from './components/TopBarPreview';
import TopBarTab from './components/TopBarTab';
import { topBarLinkEditPath, topBarLinkViewPath } from './constants';
import TopBarLinkCreate from './pages/TopBarLinkCreate';
import TopBarLinkEdit from './pages/TopBarLinkEdit';
import TopBarLinkView from './pages/TopBarLinkView';
import TopBarSettingsEdit from './pages/TopBarSettingsEdit';
import { topBarService } from './services/topBarService';
import type { ApiTopBarLink, ApiTopBarSettings, Bilingual } from './types/topbar.types';
import {
  settingsPayload,
  settingsToForm,
  topBarLinkChanges,
  topBarLinkPayload,
  topBarLinkToForm,
  validateSettingsForm,
  validateTopBarLinkForm,
} from './validation/topbar.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/topBarService', () => ({
  topBarService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-topbar.view', 'cms-topbar.create', 'cms-topbar.update', 'cms-topbar.delete'];
/* The two seeded buttons: what the website's strip showed before it could be managed. */
const VERIFY = pair('प्रमाणपत्र पडताळणी', 'Verify Certificate');
const STATUS = pair('अर्जाची स्थिती पहा', 'Check Application Status');
const GOVERNMENT = pair('महाराष्ट्र शासन', 'Government of Maharashtra');

const link = (n: number, extra: Partial<ApiTopBarLink> = {}): ApiTopBarLink => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  label: pair(`दुवा ${n}`, `Link ${n}`),
  link: `/page-${n}`,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const settings = (extra: Partial<ApiTopBarSettings> = {}): ApiTopBarSettings => ({
  id: 's1',
  governmentName: GOVERNMENT,
  showLanguageToggle: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
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
        <Route path="/cms/home-page" element={<TopBarTab />} />
        <Route path="/cms/top-bar/create" element={<TopBarLinkCreate />} />
        <Route path="/cms/top-bar/settings" element={<TopBarSettingsEdit />} />
        <Route path="/cms/top-bar/:id/edit" element={<TopBarLinkEdit />} />
        <Route path="/cms/top-bar/:id/view" element={<TopBarLinkView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=top-bar';
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* The English label of each row, top to bottom. */
const labels = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('b.lnk')?.textContent);
const SEARCH = 'Search label or link...';
const search = (text: string) => userEvent.type(screen.getByPlaceholderText(SEARCH), text);
const info = () => screen.getByText(/^Showing/).closest('.info');
const strip = (lang: 'Marathi' | 'English') => screen.getByRole('figure', { name: `${lang} preview` });

const fillLabel = async () => {
  await userEvent.type(screen.getByLabelText('Label (Marathi) *'), VERIFY.mr);
  await userEvent.type(screen.getByLabelText('Label (English) *'), VERIFY.en);
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(topBarService.list).mockResolvedValue([]);
  vi.mocked(topBarService.getSettings).mockResolvedValue(settings());
});

describe('Top Bar list', () => {
  it('is a FAQ-style table: Sr. No., Order, Label, Link, Status, Updated and Action', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([
      link(1, { label: VERIFY, link: '/verify' }),
      link(2, { label: STATUS, link: '/track' }),
      link(3, { link: 'https://example.gov.in/x', isActive: false }),
    ]);
    renderAt(TAB);

    await screen.findByText(VERIFY.en);
    expect(screen.getByRole('heading', { name: /^Links/ })).toHaveTextContent('Links live from the backend');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Label', 'Link', 'Status', 'Updated', 'Action']);
    const verify = row(VERIFY.en);
    /* English in the brand colour, Marathi underneath, as the FAQ question. */
    expect(within(verify).getByText(VERIFY.en)).toHaveClass('lnk');
    expect(within(verify).getByText(VERIFY.mr)).toBeInTheDocument();
    expect(within(verify).getByText('/verify')).toBeInTheDocument();
    expect(within(verify).getByText('Active')).toBeInTheDocument();
    expect(within(row(STATUS.en)).getByText('/track')).toBeInTheDocument();
    expect(within(row('Link 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Link 3')).getByText('Inactive')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(verify).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(info()).toHaveTextContent('Showing 1-3 of 3 records');
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    /* Top bar settings summary */
    const summary = screen.getByRole('heading', { name: 'Top bar settings' }).closest('.card') as HTMLElement;
    expect(await within(summary).findByText(GOVERNMENT.mr)).toBeInTheDocument();
    expect(within(summary).getByText(GOVERNMENT.en)).toBeInTheDocument();
    expect(within(summary).getByText('Shown')).toBeInTheDocument();
  });

  it('says so when the government name is blank and the language switch is hidden', async () => {
    vi.mocked(topBarService.getSettings).mockResolvedValue(settings({ governmentName: null, showLanguageToggle: false }));
    renderAt(TAB);
    const summary = screen.getByRole('heading', { name: 'Top bar settings' }).closest('.card') as HTMLElement;
    expect(await within(summary).findByText('None — no bold text is shown')).toBeInTheDocument();
    expect(within(summary).getByText('Hidden')).toBeInTheDocument();
  });

  it('shows No records found when there are no links, and a retryable error', async () => {
    vi.mocked(topBarService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add link to create the first one/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add link/ })).toHaveLength(1);
    unmount();

    vi.mocked(topBarService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([link(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Link 1')).toBeInTheDocument();
  });

  it('keeps Add link and Edit settings in the tab head', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1)]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Link 1');
    let head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add link/ }));
    expect(currentPath()).toBe('/cms/top-bar/create');
    unmount();

    renderAt(TAB);
    head = document.querySelector('.cms-tab-head') as HTMLElement;
    const edit = within(head).getByRole('button', { name: /Edit settings/ });
    await waitFor(() => expect(edit).toBeEnabled());
    await userEvent.click(edit);
    expect(currentPath()).toBe('/cms/top-bar/settings');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2)]);
    vi.mocked(topBarService.get).mockResolvedValue(link(2));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Link 2' }));
    expect(currentPath()).toBe(topBarLinkViewPath(link(2).id));
    expect(currentPath()).toBe(`/cms/top-bar/${link(2).id}/view`);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Link 1'));
    expect(currentPath()).toBe(topBarLinkViewPath(link(1).id));
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Link 2' }));
    expect(currentPath()).toBe(topBarLinkEditPath(link(2).id));
  });

  it('switches a link off through the status toggle after asking, by id', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2)]);
    vi.mocked(topBarService.setStatus).mockResolvedValue(link(2, { isActive: false }));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Link 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate दुवा 2 / Link 2?');
    expect(topBarService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(topBarService.setStatus).toHaveBeenCalledWith(link(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Link deactivated'));
    expect(topBarService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('switches an inactive link back on, by id', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2, { isActive: false })]);
    vi.mocked(topBarService.setStatus).mockResolvedValue(link(2));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Link 2: inactive' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Activate दुवा 2 / Link 2?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, activate' }));
    await waitFor(() => expect(topBarService.setStatus).toHaveBeenCalledWith(link(2).id, true));
    await waitFor(() => expect(toasts()).toHaveTextContent('Link activated'));
  });

  it('deletes the link named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2), link(3)]);
    vi.mocked(topBarService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Link 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Link 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete दुवा 2 / Link 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(topBarService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Link 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(topBarService.remove).toHaveBeenCalledWith(link(2).id));
    expect(topBarService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Link deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('searches labels and links in both languages', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([
      link(1),
      link(2, { label: VERIFY, link: '/verify' }),
      link(3, { link: 'https://example.gov.in/x' }),
    ]);
    renderAt(TAB);
    await screen.findByText('Link 1');

    await search('दुवा 1');
    await waitFor(() => expect(labels()).toEqual(['Link 1']));
    expect(screen.getByText('filtered')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('verify certificate');
    await waitFor(() => expect(labels()).toEqual(['Verify Certificate']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('example.gov.in');
    await waitFor(() => expect(labels()).toEqual(['Link 3']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('nothing like it');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No link matches the current search.')).toBeInTheDocument();
    expect(topBarService.list).toHaveBeenCalledTimes(1);
  });

  it('reorders by sending the whole list of ids', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2), link(3)]);
    vi.mocked(topBarService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Link 3');
    expect(screen.getByRole('button', { name: 'Move Link 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Link 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Link 1 down' }));
    await waitFor(() => expect(topBarService.reorder).toHaveBeenCalledWith([link(2).id, link(1).id, link(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    expect(currentPath()).toBe(TAB);
  });

  it('allows re-ordering only while the table shows the website order: by Order ascending, nothing searched', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2), link(3)]);
    renderAt(TAB);
    await screen.findByText('Link 3');
    const up = () => screen.getByRole('button', { name: 'Move Link 3 up' });
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(labels()).toEqual(['Link 3', 'Link 2', 'Link 1']);
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await search('Link 3');
    await waitFor(() => expect(labels()).toEqual(['Link 3']));
    expect(up()).toBeDisabled();
    expect(topBarService.reorder).not.toHaveBeenCalled();
  });

  it('offers no reordering for a single link', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([link(1)]);
    renderAt(TAB);
    await screen.findByText('Link 1');
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-topbar.view']);
    vi.mocked(topBarService.list).mockResolvedValue([link(1), link(2)]);
    renderAt(TAB);
    await screen.findByText('Link 1');
    expect(screen.getByRole('button', { name: 'View Link 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add link/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit settings/ })).toBeNull();
  });
});

describe('View Top Bar link', () => {
  const viewed = () => link(7, { label: VERIFY, link: 'https://example.gov.in/verify' });
  const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;

  it('shows every field in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(topBarService.get).mockResolvedValue(viewed());
    renderAt(topBarLinkViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Verify Certificate/ })).toHaveTextContent('Verify CertificateOrder 7');
    expect(topBarService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Top Bar', 'View']);
    expect(field('Label')).toHaveTextContent('प्रमाणपत्र पडताळणीVerify Certificate');
    expect(field('Link')).toHaveTextContent('https://example.gov.in/verify');
    expect(field('Link')).toHaveTextContent('Another website');
    expect(field('Display order')).toHaveTextContent('7');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Shown as a button in the top bar');
    /* The button as the strip draws it, between the government name and the language switch, in both languages. */
    await waitFor(() => expect(strip('Marathi')).toHaveTextContent('महाराष्ट्र शासनप्रमाणपत्र पडताळणी ↗मराठीEnglish'));
    expect(strip('English')).toHaveTextContent('Government of MaharashtraVerify Certificate ↗मराठीEnglish');
  });

  it('draws the strip with the settings: no bold text and no switch when they are off', async () => {
    vi.mocked(topBarService.get).mockResolvedValue(link(8, { link: '/verify' }));
    vi.mocked(topBarService.getSettings).mockResolvedValue(settings({ governmentName: null, showLanguageToggle: false }));
    renderAt(topBarLinkViewPath(link(8).id));
    await screen.findByRole('heading', { name: /Link 8/ });
    await waitFor(() => expect(strip('Marathi')).not.toHaveTextContent(GOVERNMENT.mr));
    expect(strip('Marathi')).toHaveTextContent('दुवा 8');
    expect(strip('Marathi')).not.toHaveTextContent('मराठी');
    expect(strip('English')).not.toHaveTextContent('English');
    expect(field('Link')).toHaveTextContent('A page of the public website');
  });

  it('marks an inactive link', async () => {
    vi.mocked(topBarService.get).mockResolvedValue(link(8, { isActive: false }));
    renderAt(topBarLinkViewPath(link(8).id));
    expect(await screen.findByRole('heading', { name: /Link 8/ })).toBeInTheDocument();
    expect(within(field('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Hidden from the website');
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('edits, deactivates and deletes (after asking) the link, and goes Back to the tab', async () => {
    vi.mocked(topBarService.get).mockResolvedValue(viewed());
    vi.mocked(topBarService.setStatus).mockResolvedValue(viewed());
    vi.mocked(topBarService.remove).mockResolvedValue();
    const { unmount } = renderAt(topBarLinkViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(topBarService.setStatus).toHaveBeenCalledWith(viewed().id, false));
    await waitFor(() => expect(topBarService.get).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete प्रमाणपत्र पडताळणी / Verify Certificate?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(topBarService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(topBarService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    unmount();

    const again = renderAt(topBarLinkViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(topBarLinkEditPath(viewed().id));
    again.unmount();

    renderAt(topBarLinkViewPath(viewed().id));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('gives a view-only administrator no Edit, Activate / Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-topbar.view']);
    vi.mocked(topBarService.get).mockResolvedValue(viewed());
    renderAt(topBarLinkViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Verify Certificate/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });
});

describe('Add Top Bar link', () => {
  it('names each missing required field, the link included', async () => {
    renderAt('/cms/top-bar/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(await screen.findByText('Label (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Label (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Link is required')).toBeInTheDocument();
    expect(topBarService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe link before sending anything', async () => {
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or a web address starting with https:// or www.'),
    ).toBeInTheDocument();
    expect(topBarService.create).not.toHaveBeenCalled();
  });

  it('stops each label at 40 characters and the link at 500', () => {
    renderAt('/cms/top-bar/create');
    expect(screen.getByLabelText('Label (Marathi) *')).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText('Label (English) *')).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText('Link *')).toHaveAttribute('maxlength', '500');
  });

  it('says what the link field takes: a page starting with /, or an address starting with https:// or www.', () => {
    renderAt('/cms/top-bar/create');
    expect(screen.getByText(/starting with \/ \(for example \/verify\), or an address starting with https:\/\/ or www\./)).toBeInTheDocument();
  });

  it('previews the button in the strip and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(topBarService.create)
      .mockRejectedValueOnce(new ApiError('A link labelled "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(link(9));
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), '/verify');

    /* The government name and the switch come from the settings; the button is the one being typed. */
    await waitFor(() => expect(strip('Marathi')).toHaveTextContent('महाराष्ट्र शासनप्रमाणपत्र पडताळणीमराठीEnglish'));
    expect(strip('English')).toHaveTextContent('Government of MaharashtraVerify CertificateमराठीEnglish');

    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(topBarService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(topBarService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({ label: VERIFY, link: '/verify', isActive: true });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('stores a www. address with https://, as the server does, and marks it as another site in the preview', async () => {
    vi.mocked(topBarService.create).mockResolvedValueOnce(link(9));
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), 'www.example.gov.in');
    expect(strip('English')).toHaveTextContent('Verify Certificate ↗');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(topBarService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(topBarService.create).mock.calls[0]![0]).toMatchObject({ link: 'https://www.example.gov.in' });
  });

  it('sends a typed display order, and returns to the tab after saving', async () => {
    vi.mocked(topBarService.create).mockResolvedValueOnce(link(9));
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), '/verify');
    await userEvent.type(screen.getByLabelText('Display order'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(topBarService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(topBarService.create).mock.calls[0]![0]).toMatchObject({ displayOrder: 2 });
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Link added');
  });

  it('refuses a display order outside 1 to 999', async () => {
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), '/verify');
    await userEvent.type(screen.getByLabelText('Display order'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(await screen.findByText('Display order must be a whole number from 1 to 999')).toBeInTheDocument();
    expect(topBarService.create).not.toHaveBeenCalled();
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(topBarService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.link', message: 'Enter a full address, e.g. https://example.gov.in' },
      ]),
    );
    renderAt('/cms/top-bar/create');
    await fillLabel();
    await userEvent.type(screen.getByLabelText('Link *'), '/verify');
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(await screen.findByText('Enter a full address, e.g. https://example.gov.in')).toBeInTheDocument();
  });

  it('tells an administrator without the Add permission so, with no form', async () => {
    auth.permissions = new Set(['cms-topbar.view']);
    renderAt('/cms/top-bar/create');
    expect(await screen.findByText('You can view this section but not add links')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save link' })).toBeNull();
  });
});

describe('Edit Top Bar link', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = link(4, { link: '/verify' });
    vi.mocked(topBarService.get).mockResolvedValue(saved);
    vi.mocked(topBarService.update).mockResolvedValue(saved);
    renderAt(`/cms/top-bar/${saved.id}/edit`);
    expect(await screen.findByLabelText('Link *')).toHaveValue('/verify');
    expect(screen.getByLabelText('Label (English) *')).toHaveValue('Link 4');
    await userEvent.clear(screen.getByLabelText('Link *'));
    await userEvent.type(screen.getByLabelText('Link *'), '/track');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(topBarService.update).toHaveBeenCalledWith(saved.id, { link: '/track', expectedUpdatedAt: saved.updatedAt }));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Link updated');
  });

  it('sends a changed label as a pair, and nothing else', async () => {
    const saved = link(5);
    vi.mocked(topBarService.get).mockResolvedValue(saved);
    vi.mocked(topBarService.update).mockResolvedValue(saved);
    renderAt(`/cms/top-bar/${saved.id}/edit`);
    const en = await screen.findByLabelText('Label (English) *');
    await userEvent.clear(en);
    await userEvent.type(en, 'Verify Certificate');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(topBarService.update).toHaveBeenCalledWith(saved.id, {
        label: pair(saved.label.mr, 'Verify Certificate'),
        expectedUpdatedAt: saved.updatedAt,
      }),
    );
  });

  it('cannot clear the link: a button without a destination is refused before anything is sent', async () => {
    const saved = link(6, { link: '/verify' });
    vi.mocked(topBarService.get).mockResolvedValue(saved);
    renderAt(`/cms/top-bar/${saved.id}/edit`);
    await userEvent.clear(await screen.findByLabelText('Link *'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Link is required')).toBeInTheDocument();
    expect(topBarService.update).not.toHaveBeenCalled();
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(topBarService.get).mockResolvedValue(link(5));
    renderAt(`/cms/top-bar/${link(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Label (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(topBarService.update).not.toHaveBeenCalled();
  });

  it('tells an administrator without the Update permission so, with no form', async () => {
    auth.permissions = new Set(['cms-topbar.view']);
    vi.mocked(topBarService.get).mockResolvedValue(link(5));
    renderAt(`/cms/top-bar/${link(5).id}/edit`);
    expect(await screen.findByText('You can view this section but not edit links')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});

describe('Top bar settings', () => {
  it('saves the government name and the language switch with the loaded version', async () => {
    vi.mocked(topBarService.updateSettings).mockResolvedValue(settings());
    renderAt('/cms/top-bar/settings');
    expect(await screen.findByRole('heading', { name: 'Top Bar Settings' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Top Bar', 'Top bar settings']);
    const english = await screen.findByLabelText('Government name (English)');
    expect(english).toHaveValue(GOVERNMENT.en);

    /* Both languages or neither: clearing only one is refused, naming the missing half. */
    await userEvent.clear(english);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Government name (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(topBarService.updateSettings).not.toHaveBeenCalled();

    await userEvent.type(english, 'Maharashtra Government');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the language switch' }));
    expect(screen.getByText(/While hidden, visitors cannot change the language/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(topBarService.updateSettings).toHaveBeenCalledWith({
        governmentName: pair(GOVERNMENT.mr, 'Maharashtra Government'),
        showLanguageToggle: false,
        expectedUpdatedAt: settings().updatedAt,
      }),
    );
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Top bar settings updated');
  });

  it('leaves the bold text out when both languages are cleared', async () => {
    vi.mocked(topBarService.updateSettings).mockResolvedValue(settings({ governmentName: null }));
    renderAt('/cms/top-bar/settings');
    await userEvent.clear(await screen.findByLabelText('Government name (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Government name (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(topBarService.updateSettings).toHaveBeenCalledWith({
        governmentName: pair('', ''),
        showLanguageToggle: true,
        expectedUpdatedAt: settings().updatedAt,
      }),
    );
  });

  it('starts from a blank government name when none is stored', async () => {
    vi.mocked(topBarService.getSettings).mockResolvedValue(settings({ governmentName: null }));
    renderAt('/cms/top-bar/settings');
    expect(await screen.findByLabelText('Government name (Marathi)')).toHaveValue('');
    expect(screen.getByLabelText('Government name (English)')).toHaveValue('');
  });

  it('stops the government name at 80 characters in each language', async () => {
    renderAt('/cms/top-bar/settings');
    const mr = await screen.findByLabelText('Government name (Marathi)');
    expect(mr).toHaveAttribute('maxlength', '80');
    expect(screen.getByLabelText('Government name (English)')).toHaveAttribute('maxlength', '80');
  });

  it('previews the strip with the name, the active buttons and the switch, following what is typed', async () => {
    vi.mocked(topBarService.list).mockResolvedValue([
      link(1, { label: VERIFY, link: '/verify' }),
      link(2, { label: STATUS, link: '/track' }),
      link(3, { isActive: false }),
    ]);
    renderAt('/cms/top-bar/settings');
    await screen.findByLabelText('Government name (English)');
    await waitFor(() => expect(strip('English')).toHaveTextContent('Government of MaharashtraVerify CertificateCheck Application StatusमराठीEnglish'));
    /* A hidden link is not on the website, so it is not in the preview. */
    expect(strip('English')).not.toHaveTextContent('Link 3');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the language switch' }));
    expect(strip('English')).not.toHaveTextContent('मराठी');
    await userEvent.clear(screen.getByLabelText('Government name (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Government name (English)'));
    expect(strip('English')).not.toHaveTextContent('Government of Maharashtra');
    expect(strip('English')).toHaveTextContent('Verify Certificate');
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(topBarService.updateSettings).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.governmentName.en', message: 'Government name (English) must be at most 80 characters' },
      ]),
    );
    renderAt('/cms/top-bar/settings');
    await screen.findByLabelText('Government name (English)');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Government name (English) must be at most 80 characters')).toBeInTheDocument();
    expect(currentPath()).toBe('/cms/top-bar/settings');
  });

  it('gives a view-only administrator no form', async () => {
    auth.permissions = new Set(['cms-topbar.view']);
    renderAt('/cms/top-bar/settings');
    expect(await screen.findByText('You can view this section but not change it')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });
});

describe('<TopBarPreview>', () => {
  const buttons = [
    { label: VERIFY, link: '/verify' },
    { label: STATUS, link: 'https://example.gov.in/track' },
  ];

  it('draws the strip in Marathi and in English: name, buttons in order, then the two-label switch', () => {
    renderWithProviders(<TopBarPreview governmentName={GOVERNMENT} showLanguageToggle buttons={buttons} />);
    expect(strip('Marathi')).toHaveAttribute('lang', 'mr');
    expect(strip('English')).toHaveAttribute('lang', 'en');
    expect(strip('Marathi')).toHaveTextContent('महाराष्ट्र शासनप्रमाणपत्र पडताळणीअर्जाची स्थिती पहा ↗मराठीEnglish');
    expect(strip('English')).toHaveTextContent('Government of MaharashtraVerify CertificateCheck Application Status ↗मराठीEnglish');
    expect(within(strip('Marathi')).getByText(GOVERNMENT.mr).tagName).toBe('B');
  });

  it('highlights the language of the strip on the switch, Marathi on the left and English on the right', () => {
    renderWithProviders(<TopBarPreview governmentName={GOVERNMENT} showLanguageToggle buttons={buttons} />);
    const active = (lang: 'Marathi' | 'English') =>
      [...strip(lang).querySelectorAll('[data-active]')].map((n) => [n.textContent, n.getAttribute('data-active')]);
    expect(active('Marathi')).toEqual([
      ['मराठी', 'true'],
      ['English', 'false'],
    ]);
    expect(active('English')).toEqual([
      ['मराठी', 'false'],
      ['English', 'true'],
    ]);
  });

  it('leaves out the bold text when there is no government name, and the switch when it is off', () => {
    renderWithProviders(<TopBarPreview governmentName={null} showLanguageToggle={false} buttons={buttons} />);
    expect(strip('Marathi').querySelector('b')).toBeNull();
    expect(strip('Marathi')).not.toHaveTextContent('मराठी');
    expect(strip('English')).not.toHaveTextContent('English');
    expect(strip('English')).toHaveTextContent('Verify Certificate');
  });

  it('leaves out the bold text for a name that is blank in both languages', () => {
    renderWithProviders(<TopBarPreview governmentName={pair('', '')} showLanguageToggle buttons={[]} />);
    expect(strip('Marathi').querySelector('b')).toBeNull();
  });

  it('shows a placeholder for a button that has no label yet', () => {
    renderWithProviders(<TopBarPreview governmentName={GOVERNMENT} showLanguageToggle buttons={[{ label: pair('', ''), link: '' }]} />);
    expect(strip('Marathi')).toHaveTextContent('बटणाचा मजकूर');
    expect(strip('English')).toHaveTextContent('Button label');
  });
});

describe('top bar payloads', () => {
  const typed = {
    label: pair('  प्रमाणपत्र   पडताळणी ', ' Verify\n Certificate '),
    link: ' /verify ',
    displayOrder: '',
    isActive: true,
  };

  it('normalise whitespace like the server, and store a www. address with https://', () => {
    expect(topBarLinkPayload(typed)).toEqual({ label: VERIFY, link: '/verify', isActive: true });
    expect(topBarLinkPayload({ ...typed, displayOrder: ' 3 ' })).toMatchObject({ displayOrder: 3 });
    expect(topBarLinkPayload({ ...typed, link: ' www.example.gov.in ' })).toMatchObject({ link: 'https://www.example.gov.in' });
    expect(topBarLinkPayload({ ...typed, link: 'https://example.gov.in/x' })).toMatchObject({ link: 'https://example.gov.in/x' });
  });

  it('send nothing but the version when nothing changed', () => {
    const saved = link(2, { link: 'https://www.example.gov.in' });
    expect(topBarLinkChanges(saved, topBarLinkToForm(saved))).toEqual({ expectedUpdatedAt: saved.updatedAt });
    /* The address typed the short way is the address already stored. */
    expect(topBarLinkChanges(saved, { ...topBarLinkToForm(saved), link: 'www.example.gov.in' })).toEqual({
      expectedUpdatedAt: saved.updatedAt,
    });
    const internal = link(3);
    expect(topBarLinkChanges(internal, topBarLinkToForm(internal))).toEqual({ expectedUpdatedAt: internal.updatedAt });
  });

  it('send a changed order, status, label and link, each on its own', () => {
    const saved = link(2);
    const form = topBarLinkToForm(saved);
    expect(topBarLinkChanges(saved, { ...form, displayOrder: '5' })).toEqual({ displayOrder: 5, expectedUpdatedAt: saved.updatedAt });
    expect(topBarLinkChanges(saved, { ...form, isActive: false })).toEqual({ isActive: false, expectedUpdatedAt: saved.updatedAt });
    expect(topBarLinkChanges(saved, { ...form, label: pair(saved.label.mr, 'Other') })).toEqual({
      label: pair(saved.label.mr, 'Other'),
      expectedUpdatedAt: saved.updatedAt,
    });
    expect(topBarLinkChanges(saved, { ...form, link: '/track' })).toEqual({ link: '/track', expectedUpdatedAt: saved.updatedAt });
  });

  it('send the settings with the version, and a blank government name as a blank pair', () => {
    expect(settingsPayload({ governmentName: pair(' महाराष्ट्र  शासन ', ' Government  of Maharashtra '), showLanguageToggle: false }, 'v1')).toEqual({
      governmentName: GOVERNMENT,
      showLanguageToggle: false,
      expectedUpdatedAt: 'v1',
    });
    expect(settingsPayload({ governmentName: pair('  ', ''), showLanguageToggle: true }, 'v1')).toMatchObject({
      governmentName: pair('', ''),
    });
    /* A stored null and a stored blank pair both open as an empty form. */
    expect(settingsToForm(settings({ governmentName: null })).governmentName).toEqual(pair('', ''));
    expect(settingsToForm(settings({ governmentName: pair('', '') })).governmentName).toEqual(pair('', ''));
    expect(settingsToForm(settings()).governmentName).toEqual(GOVERNMENT);
  });
});

describe('top bar validation', () => {
  const ok = { label: VERIFY, link: '/verify', displayOrder: '', isActive: true };

  it('accepts a complete link', () => {
    expect(Object.values(validateTopBarLinkForm(ok)).filter(Boolean)).toEqual([]);
    expect(Object.values(validateTopBarLinkForm({ ...ok, link: 'www.example.gov.in', displayOrder: '999' })).filter(Boolean)).toEqual([]);
  });

  it('requires both halves of the label, at most 40 characters each', () => {
    const blank = validateTopBarLinkForm({ ...ok, label: pair(' ', '') });
    expect(blank['label.mr']).toBe('Label (Marathi) is required');
    expect(blank['label.en']).toBe('Label (English) is required');
    expect(validateTopBarLinkForm({ ...ok, label: pair('अ'.repeat(40), 'A'.repeat(40)) })['label.en']).toBeUndefined();
    const long = validateTopBarLinkForm({ ...ok, label: pair('अ'.repeat(41), 'A'.repeat(41)) });
    expect(long['label.mr']).toBe('Label (Marathi) must be at most 40 characters');
    expect(long['label.en']).toBe('Label (English) must be at most 40 characters');
  });

  it('requires a link, and holds it to the rule every other CMS link follows', () => {
    expect(validateTopBarLinkForm({ ...ok, link: '  ' }).link).toBe('Link is required');
    expect(validateTopBarLinkForm({ ...ok, link: 'verify' }).link).toMatch(/^Destination must be a page on this site/);
    expect(validateTopBarLinkForm({ ...ok, link: 'javascript:alert(1)' }).link).toMatch(/^Destination must be a page on this site/);
    expect(validateTopBarLinkForm({ ...ok, link: '//evil.example' }).link).toMatch(/^A page on this site must start with a single \//);
    expect(validateTopBarLinkForm({ ...ok, link: 'https://localhost' }).link).toBe('Enter a full address, e.g. https://example.gov.in');
    expect(validateTopBarLinkForm({ ...ok, link: 'https://example.gov.in' }).link).toBeUndefined();
  });

  it('holds the display order to 1 to 999 when one is typed', () => {
    for (const bad of ['0', '1000', '-1', '1.5', 'x']) {
      expect(validateTopBarLinkForm({ ...ok, displayOrder: bad }).displayOrder).toBe('Display order must be a whole number from 1 to 999');
    }
    expect(validateTopBarLinkForm({ ...ok, displayOrder: '12' }).displayOrder).toBeUndefined();
  });

  it('takes a government name in both languages or in neither, at most 80 characters each', () => {
    const run = (name: Bilingual) => validateSettingsForm({ governmentName: name, showLanguageToggle: true });
    expect(Object.values(run(pair('', ''))).filter(Boolean)).toEqual([]);
    expect(Object.values(run(GOVERNMENT)).filter(Boolean)).toEqual([]);
    expect(run(pair('महाराष्ट्र शासन', ''))['governmentName.en']).toBe('Government name (English) is required when the Marathi text is filled in');
    expect(run(pair('', 'Government'))['governmentName.mr']).toBe('Government name (Marathi) is required when the English text is filled in');
    const long = run(pair('अ'.repeat(81), 'A'.repeat(81)));
    expect(long['governmentName.mr']).toBe('Government name (Marathi) must be at most 80 characters');
    expect(long['governmentName.en']).toBe('Government name (English) must be at most 80 characters');
    expect(Object.values(run(pair('अ'.repeat(80), 'A'.repeat(80)))).filter(Boolean)).toEqual([]);
  });
});

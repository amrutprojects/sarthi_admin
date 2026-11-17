import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { ECOSYSTEM_ICONS } from '../ecosystem/constants';
import QuickActionsPreview from './components/QuickActionsPreview';
import QuickActionsTab from './components/QuickActionsTab';
import { QUICK_ACTION_ICONS, QUICK_ACTION_ICON_IDS, quickActionEditPath, quickActionIconLabel, quickActionViewPath } from './constants';
import QuickActionCreate from './pages/QuickActionCreate';
import QuickActionEdit from './pages/QuickActionEdit';
import QuickActionView from './pages/QuickActionView';
import { quickActionsService } from './services/quickActionsService';
import type { ApiQuickAction, Bilingual } from './types/quickactions.types';
import {
  quickActionChanges,
  quickActionPayload,
  quickActionToForm,
  validateQuickActionForm,
  type QuickActionFormValues,
} from './validation/quickactions.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/quickActionsService', () => ({
  quickActionsService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const BLANK = pair('', '');
const ALL = ['cms-quickactions.view', 'cms-quickactions.create', 'cms-quickactions.update', 'cms-quickactions.delete'];
/* Two of the tiles the strip showed before it could be managed. */
const APPLY = pair('अर्ज करा', 'Apply Now');
const APPLY_SUB = pair('नवीन नोंदणी करा', 'Register as a new candidate');
const STATUS = pair('अर्जाची स्थिती पहा', 'Check Application Status');
const STATUS_SUB = pair('अर्ज क्रमांकाने तपासा', 'Track by application ID');

const action = (n: number, extra: Partial<ApiQuickAction> = {}): ApiQuickAction => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  title: pair(`कृती ${n}`, `Action ${n}`),
  subtitle: BLANK,
  icon: 'doc',
  link: `/page-${n}`,
  displayOrder: n,
  isActive: true,
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
        <Route path="/cms/home-page" element={<QuickActionsTab />} />
        <Route path="/cms/quick-actions/create" element={<QuickActionCreate />} />
        <Route path="/cms/quick-actions/:id/edit" element={<QuickActionEdit />} />
        <Route path="/cms/quick-actions/:id/view" element={<QuickActionView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=quick-actions';
const CREATE = '/cms/quick-actions/create';
const row = (text: string) => screen.getByText(text, { selector: 'b.lnk' }).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* The English title of each row, top to bottom. */
const titles = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('b.lnk')?.textContent);
const SEARCH = 'Search title, subtitle or link...';
const search = (text: string) => userEvent.type(screen.getByPlaceholderText(SEARCH), text);
const info = () => screen.getByText(/^Showing/).closest('.info');
const strip = (lang: 'Marathi' | 'English') => screen.getByRole('figure', { name: `${lang} preview` });

const fillTile = async () => {
  await userEvent.type(screen.getByLabelText('Title (Marathi) *'), APPLY.mr);
  await userEvent.type(screen.getByLabelText('Title (English) *'), APPLY.en);
  await userEvent.click(screen.getByRole('radio', { name: 'Add / apply' }));
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(quickActionsService.list).mockResolvedValue([]);
});

describe('Quick Actions list', () => {
  it('is a FAQ-style table: Sr. No., Order, Icon, Title, Subtitle, Link, Status, Updated and Action', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([
      action(1, { title: APPLY, subtitle: APPLY_SUB, icon: 'plus', link: '/apply' }),
      action(2, { title: STATUS, subtitle: STATUS_SUB, icon: 'search', link: '/track' }),
      action(3, { link: 'https://example.gov.in/x', isActive: false }),
    ]);
    renderAt(TAB);

    await screen.findByText(APPLY.en, { selector: 'b.lnk' });
    expect(screen.getByRole('heading', { name: /^Quick actions live/ })).toHaveTextContent('Quick actions live from the backend');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Icon', 'Title', 'Subtitle', 'Link', 'Status', 'Updated', 'Action']);
    const apply = row(APPLY.en);
    /* English in the brand colour, Marathi underneath, as the FAQ question; the subtitle beside it, in both languages. */
    expect(within(apply).getByText(APPLY.mr)).toBeInTheDocument();
    expect(within(apply).getByText(APPLY_SUB.en)).toBeInTheDocument();
    expect(within(apply).getByText(APPLY_SUB.mr)).toBeInTheDocument();
    expect(within(apply).getByRole('img', { name: 'Icon: Add / apply' })).toBeInTheDocument();
    expect(within(apply).getByText('/apply')).toBeInTheDocument();
    expect(within(apply).getByText('Active')).toBeInTheDocument();
    expect(within(row(STATUS.en)).getByRole('img', { name: 'Icon: Search / track' })).toBeInTheDocument();
    expect(within(row('Action 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Action 3')).getByText('Inactive')).toBeInTheDocument();
    /* No subtitle: said so, not left blank. */
    expect(within(row('Action 3')).getByText('None')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(apply).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(info()).toHaveTextContent('Showing 1-3 of 3 records');
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    /* The icon and the subtitle are not something to sort by. */
    expect(screen.getByRole('columnheader', { name: 'Icon' })).not.toHaveClass('sortable');
    expect(screen.getByRole('columnheader', { name: 'Subtitle' })).not.toHaveClass('sortable');
  });

  it('previews the strip with the active tiles only, in display order, in Marathi and in English', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([
      action(1, { title: APPLY, subtitle: APPLY_SUB, icon: 'plus', link: '/apply' }),
      action(2, { isActive: false }),
      action(3, { title: STATUS, subtitle: STATUS_SUB, icon: 'search', link: '/track' }),
    ]);
    renderAt(TAB);

    await screen.findByText(APPLY.en, { selector: 'b.lnk' });
    expect(screen.getByRole('heading', { name: /^Quick actions preview/ })).toBeInTheDocument();
    expect(strip('Marathi')).toHaveAttribute('lang', 'mr');
    expect(strip('Marathi')).toHaveTextContent(`${APPLY.mr}${APPLY_SUB.mr}${STATUS.mr}${STATUS_SUB.mr}`);
    expect(strip('English')).toHaveTextContent(`${APPLY.en}${APPLY_SUB.en}${STATUS.en}${STATUS_SUB.en}`);
    /* A hidden tile is not on the website, so it is not in the preview. */
    expect(strip('English')).not.toHaveTextContent('Action 2');
  });

  it('shows No records found when there are no tiles, and a retryable error', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add quick action to create the first one/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add quick action/ })).toHaveLength(1);
    /* The preview says the website shows no strip. */
    expect(screen.getByText(/No tile is shown/)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).toBeNull();
    unmount();

    vi.mocked(quickActionsService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([action(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Action 1', { selector: 'b.lnk' })).toBeInTheDocument();
  });

  it('keeps Add quick action in the tab head, and has no settings page', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1)]);
    renderAt(TAB);
    await screen.findByText('Action 1', { selector: 'b.lnk' });
    const head = document.querySelector('.cms-tab-head') as HTMLElement;
    expect(within(head).queryByRole('button', { name: /settings/i })).toBeNull();
    await userEvent.click(within(head).getByRole('button', { name: /Add quick action/ }));
    expect(currentPath()).toBe(CREATE);
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2)]);
    vi.mocked(quickActionsService.get).mockResolvedValue(action(2));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Action 2' }));
    expect(currentPath()).toBe(quickActionViewPath(action(2).id));
    expect(currentPath()).toBe(`/cms/quick-actions/${action(2).id}/view`);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Action 1', { selector: 'b.lnk' }));
    expect(currentPath()).toBe(quickActionViewPath(action(1).id));
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Action 2' }));
    expect(currentPath()).toBe(quickActionEditPath(action(2).id));
  });

  it('hides a tile through the status switch after asking, by id', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2)]);
    vi.mocked(quickActionsService.setStatus).mockResolvedValue(action(2, { isActive: false }));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Action 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate कृती 2 / Action 2?');
    expect(quickActionsService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(quickActionsService.setStatus).toHaveBeenCalledWith(action(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Quick action hidden from the website'));
    expect(quickActionsService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('shows a hidden tile again, by id', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2, { isActive: false })]);
    vi.mocked(quickActionsService.setStatus).mockResolvedValue(action(2));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Action 2: inactive' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Activate कृती 2 / Action 2?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, activate' }));
    await waitFor(() => expect(quickActionsService.setStatus).toHaveBeenCalledWith(action(2).id, true));
    await waitFor(() => expect(toasts()).toHaveTextContent('Quick action shown on the website'));
  });

  it('deletes the tile named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2), action(3)]);
    vi.mocked(quickActionsService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Action 2', { selector: 'b.lnk' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete Action 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete कृती 2 / Action 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(quickActionsService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Action 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(quickActionsService.remove).toHaveBeenCalledWith(action(2).id));
    expect(quickActionsService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Quick action deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('searches titles, subtitles and links in both languages', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([
      action(1),
      action(2, { title: APPLY, subtitle: APPLY_SUB, link: '/apply' }),
      action(3, { link: 'https://example.gov.in/x' }),
    ]);
    renderAt(TAB);
    await screen.findByText('Action 1', { selector: 'b.lnk' });

    await search('कृती 1');
    await waitFor(() => expect(titles()).toEqual(['Action 1']));
    expect(screen.getByText('filtered')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('new candidate');
    await waitFor(() => expect(titles()).toEqual(['Apply Now']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('example.gov.in');
    await waitFor(() => expect(titles()).toEqual(['Action 3']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('nothing like it');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No quick action matches the current search.')).toBeInTheDocument();
    expect(quickActionsService.list).toHaveBeenCalledTimes(1);
  });

  it('reorders by sending the whole list of ids', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2), action(3)]);
    vi.mocked(quickActionsService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Action 3', { selector: 'b.lnk' });
    expect(screen.getByRole('button', { name: 'Move Action 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Action 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Action 1 down' }));
    await waitFor(() => expect(quickActionsService.reorder).toHaveBeenCalledWith([action(2).id, action(1).id, action(3).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    expect(currentPath()).toBe(TAB);
  });

  it('reloads the list when the server refuses a reorder because the list changed', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2)]);
    vi.mocked(quickActionsService.reorder).mockRejectedValueOnce(new ApiError('The list has changed; reload it.', 409, 'CONFLICT'));
    renderAt(TAB);
    await screen.findByText('Action 2', { selector: 'b.lnk' });
    await userEvent.click(screen.getByRole('button', { name: 'Move Action 2 up' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The list has changed'));
    await waitFor(() => expect(quickActionsService.list).toHaveBeenCalledTimes(2));
  });

  it('allows re-ordering only while the table shows the website order: by Order ascending, nothing searched', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2), action(3)]);
    renderAt(TAB);
    await screen.findByText('Action 3', { selector: 'b.lnk' });
    const up = () => screen.getByRole('button', { name: 'Move Action 3 up' });
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(titles()).toEqual(['Action 3', 'Action 2', 'Action 1']);
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await search('Action 3');
    await waitFor(() => expect(titles()).toEqual(['Action 3']));
    expect(up()).toBeDisabled();
    expect(quickActionsService.reorder).not.toHaveBeenCalled();
  });

  it('offers no reordering for a single tile', async () => {
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1)]);
    renderAt(TAB);
    await screen.findByText('Action 1', { selector: 'b.lnk' });
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete or reorder', async () => {
    auth.permissions = new Set(['cms-quickactions.view']);
    vi.mocked(quickActionsService.list).mockResolvedValue([action(1), action(2)]);
    renderAt(TAB);
    await screen.findByText('Action 1', { selector: 'b.lnk' });
    expect(screen.getByRole('button', { name: 'View Action 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add quick action/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('View quick action', () => {
  const viewed = () => action(7, { title: APPLY, subtitle: APPLY_SUB, icon: 'plus', link: 'https://example.gov.in/apply' });
  const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;

  it('shows every field in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(quickActionsService.get).mockResolvedValue(viewed());
    renderAt(quickActionViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Apply Now/ })).toHaveTextContent('Apply NowOrder 7');
    expect(quickActionsService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Quick Actions', 'View']);
    expect(screen.getByRole('heading', { name: 'Quick action details' })).toBeInTheDocument();
    expect(field('Title')).toHaveTextContent('अर्ज कराApply Now');
    expect(field('Subtitle')).toHaveTextContent('नवीन नोंदणी कराRegister as a new candidate');
    expect(field('Icon')).toHaveTextContent('Add / apply');
    expect(field('Destination')).toHaveTextContent('https://example.gov.in/apply');
    expect(field('Destination')).toHaveTextContent('Another website');
    expect(field('Display order')).toHaveTextContent('7');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Shown as a tile in the strip under the banner');
    /* The tile as the strip draws it, in both languages. */
    expect(strip('Marathi')).toHaveTextContent('अर्ज करानवीन नोंदणी करा');
    expect(strip('English')).toHaveTextContent('Apply NowRegister as a new candidate');
  });

  it('says when the tile has no subtitle, and draws the title alone', async () => {
    vi.mocked(quickActionsService.get).mockResolvedValue(action(8, { link: '/apply' }));
    renderAt(quickActionViewPath(action(8).id));
    await screen.findByRole('heading', { name: /Action 8/ });
    expect(field('Subtitle')).toHaveTextContent('None — the tile shows the title alone');
    expect(strip('English')).toHaveTextContent(/^Action 8$/);
    expect(field('Destination')).toHaveTextContent('A page of the public website');
  });

  it('marks an inactive tile', async () => {
    vi.mocked(quickActionsService.get).mockResolvedValue(action(8, { isActive: false }));
    renderAt(quickActionViewPath(action(8).id));
    expect(await screen.findByRole('heading', { name: /Action 8/ })).toBeInTheDocument();
    expect(within(field('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Hidden from the website');
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('edits, hides and deletes (after asking) the tile, and goes Back to the tab', async () => {
    vi.mocked(quickActionsService.get).mockResolvedValue(viewed());
    vi.mocked(quickActionsService.setStatus).mockResolvedValue(viewed());
    vi.mocked(quickActionsService.remove).mockResolvedValue();
    const { unmount } = renderAt(quickActionViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(quickActionsService.setStatus).toHaveBeenCalledWith(viewed().id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Quick action hidden from the website'));
    await waitFor(() => expect(quickActionsService.get).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete अर्ज करा / Apply Now?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(quickActionsService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(quickActionsService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Quick action deleted');
    unmount();

    const again = renderAt(quickActionViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(quickActionEditPath(viewed().id));
    again.unmount();

    renderAt(quickActionViewPath(viewed().id));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('gives a view-only administrator no Edit, Activate / Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-quickactions.view']);
    vi.mocked(quickActionsService.get).mockResolvedValue(viewed());
    renderAt(quickActionViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Apply Now/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });
});

describe('Add quick action', () => {
  it('names each missing required field: both titles, the icon and the destination', async () => {
    renderAt(CREATE);
    expect(screen.getByRole('heading', { name: 'Add quick action' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Quick Actions', 'Add quick action']);
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    expect(await screen.findByText('Title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Title (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Choose an icon')).toBeInTheDocument();
    expect(screen.getByText('Destination is required')).toBeInTheDocument();
    /* The subtitle is optional. */
    expect(screen.queryByText(/Subtitle \((Marathi|English)\) is required/)).toBeNull();
    expect(quickActionsService.create).not.toHaveBeenCalled();
  });

  it('takes a subtitle in both languages or in neither', async () => {
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');
    await userEvent.type(screen.getByLabelText('Subtitle (English)'), APPLY_SUB.en);
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    expect(await screen.findByText('Subtitle (Marathi) is required when the English text is filled in')).toBeInTheDocument();
    expect(quickActionsService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe destination before sending anything', async () => {
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or a web address starting with https:// or www.'),
    ).toBeInTheDocument();
    expect(quickActionsService.create).not.toHaveBeenCalled();
  });

  it('stops each title at 40 characters, each subtitle at 60 and the destination at 500', () => {
    renderAt(CREATE);
    expect(screen.getByLabelText('Title (Marathi) *')).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText('Title (English) *')).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText('Subtitle (Marathi)')).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Subtitle (English)')).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Destination *')).toHaveAttribute('maxlength', '500');
  });

  it('offers exactly the listed icons, in order, each named, and marks the one picked', async () => {
    renderAt(CREATE);
    const group = screen.getByRole('radiogroup', { name: /Icon/ });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('title'))).toEqual(QUICK_ACTION_ICONS.map((i) => `${i.label} (${i.id})`));
    expect(radios.slice(0, 4).map((r) => r.getAttribute('aria-label'))).toEqual([
      'Add / apply',
      'Search / track',
      'Verification',
      'Building / market',
    ]);
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    await userEvent.click(within(group).getByRole('radio', { name: 'Verification' }));
    expect(within(group).getByRole('radio', { name: 'Verification' })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('previews the tile and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(quickActionsService.create)
      .mockRejectedValueOnce(new ApiError('A quick action titled "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(action(9));
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Subtitle (Marathi)'), APPLY_SUB.mr);
    await userEvent.type(screen.getByLabelText('Subtitle (English)'), APPLY_SUB.en);
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');

    expect(strip('Marathi')).toHaveTextContent('अर्ज करानवीन नोंदणी करा');
    expect(strip('English')).toHaveTextContent('Apply NowRegister as a new candidate');

    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    await waitFor(() => expect(quickActionsService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(quickActionsService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({ title: APPLY, subtitle: APPLY_SUB, icon: 'plus', link: '/apply', isActive: true });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('sends a tile without a subtitle with subtitle null, and shows the title alone in the preview', async () => {
    vi.mocked(quickActionsService.create).mockResolvedValueOnce(action(9));
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');
    expect(strip('English')).toHaveTextContent(/^Apply Now$/);
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    await waitFor(() => expect(quickActionsService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(quickActionsService.create).mock.calls[0]![0]).toEqual({
      title: APPLY,
      subtitle: null,
      icon: 'plus',
      link: '/apply',
      isActive: true,
    });
  });

  it('stores a www. address with https://, as the server does', async () => {
    vi.mocked(quickActionsService.create).mockResolvedValueOnce(action(9));
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), 'www.example.gov.in');
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    await waitFor(() => expect(quickActionsService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(quickActionsService.create).mock.calls[0]![0]).toMatchObject({ link: 'https://www.example.gov.in' });
  });

  it('sends a typed display order and the status, and returns to the tab after saving', async () => {
    vi.mocked(quickActionsService.create).mockResolvedValueOnce(action(9));
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');
    await userEvent.type(screen.getByLabelText('Display order'), '2');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    await waitFor(() => expect(quickActionsService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(quickActionsService.create).mock.calls[0]![0]).toMatchObject({ displayOrder: 2, isActive: false });
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Quick action added');
  });

  it('refuses a display order outside 1 to 999', async () => {
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');
    await userEvent.type(screen.getByLabelText('Display order'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    expect(await screen.findByText('Display order must be a whole number from 1 to 999')).toBeInTheDocument();
    expect(quickActionsService.create).not.toHaveBeenCalled();
  });

  it('shows the server’s field messages on the fields', async () => {
    vi.mocked(quickActionsService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.title.en', message: 'Title (English) must be a single line' },
        { field: 'body.icon', message: 'Choose one of the listed icons' },
      ]),
    );
    renderAt(CREATE);
    await fillTile();
    await userEvent.type(screen.getByLabelText('Destination *'), '/apply');
    await userEvent.click(screen.getByRole('button', { name: 'Save quick action' }));
    expect(await screen.findByText('Title (English) must be a single line')).toBeInTheDocument();
    expect(screen.getByText('Choose one of the listed icons')).toBeInTheDocument();
    expect(currentPath()).toBe(CREATE);
  });

  it('tells an administrator without the Add permission so, with no form', async () => {
    auth.permissions = new Set(['cms-quickactions.view']);
    renderAt(CREATE);
    expect(await screen.findByText('You can view this section but not add quick actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save quick action' })).toBeNull();
  });
});

describe('Edit quick action', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = action(4, { link: '/apply', icon: 'plus' });
    vi.mocked(quickActionsService.get).mockResolvedValue(saved);
    vi.mocked(quickActionsService.update).mockResolvedValue(saved);
    renderAt(quickActionEditPath(saved.id));
    expect(await screen.findByLabelText('Destination *')).toHaveValue('/apply');
    expect(screen.getByRole('heading', { name: 'Edit Action 4' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Quick Actions', 'Edit']);
    expect(screen.getByLabelText('Title (English) *')).toHaveValue('Action 4');
    expect(screen.getByRole('radio', { name: 'Add / apply' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.clear(screen.getByLabelText('Destination *'));
    await userEvent.type(screen.getByLabelText('Destination *'), '/track');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(quickActionsService.update).toHaveBeenCalledWith(saved.id, { link: '/track', expectedUpdatedAt: saved.updatedAt }),
    );
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Quick action updated');
  });

  it('sends a changed title as a pair, and a changed icon, and nothing else', async () => {
    const saved = action(5);
    vi.mocked(quickActionsService.get).mockResolvedValue(saved);
    vi.mocked(quickActionsService.update).mockResolvedValue(saved);
    renderAt(quickActionEditPath(saved.id));
    const en = await screen.findByLabelText('Title (English) *');
    await userEvent.clear(en);
    await userEvent.type(en, 'Apply Now');
    await userEvent.click(screen.getByRole('radio', { name: 'Search / track' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(quickActionsService.update).toHaveBeenCalledWith(saved.id, {
        title: pair(saved.title.mr, 'Apply Now'),
        icon: 'search',
        expectedUpdatedAt: saved.updatedAt,
      }),
    );
  });

  it('clears the subtitle by sending null once both languages are emptied', async () => {
    const saved = action(6, { subtitle: APPLY_SUB });
    vi.mocked(quickActionsService.get).mockResolvedValue(saved);
    vi.mocked(quickActionsService.update).mockResolvedValue(saved);
    renderAt(quickActionEditPath(saved.id));
    await userEvent.clear(await screen.findByLabelText('Subtitle (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Subtitle (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(quickActionsService.update).toHaveBeenCalledWith(saved.id, { subtitle: null, expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('cannot clear the destination: a tile without one is refused before anything is sent', async () => {
    const saved = action(6, { link: '/apply' });
    vi.mocked(quickActionsService.get).mockResolvedValue(saved);
    renderAt(quickActionEditPath(saved.id));
    await userEvent.clear(await screen.findByLabelText('Destination *'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Destination is required')).toBeInTheDocument();
    expect(quickActionsService.update).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal of a stale save, keeping what was typed', async () => {
    const saved = action(5);
    vi.mocked(quickActionsService.get).mockResolvedValue(saved);
    vi.mocked(quickActionsService.update).mockRejectedValueOnce(
      new ApiError(
        'This was changed after you opened it. Reload to see the latest version, then make your changes again.',
        409,
        'CONFLICT',
      ),
    );
    renderAt(quickActionEditPath(saved.id));
    const en = await screen.findByLabelText('Title (English) *');
    await userEvent.type(en, ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('This was changed after you opened it'));
    expect(en).toHaveValue('Action 5 X');
    expect(currentPath()).toBe(quickActionEditPath(saved.id));
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(quickActionsService.get).mockResolvedValue(action(5));
    renderAt(quickActionEditPath(action(5).id));
    await userEvent.type(await screen.findByLabelText('Title (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(quickActionsService.update).not.toHaveBeenCalled();
  });

  it('tells an administrator without the Update permission so, with no form', async () => {
    auth.permissions = new Set(['cms-quickactions.view']);
    vi.mocked(quickActionsService.get).mockResolvedValue(action(5));
    renderAt(quickActionEditPath(action(5).id));
    expect(await screen.findByText('You can view this section but not edit quick actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});

describe('<QuickActionsPreview>', () => {
  const tiles = [
    { icon: 'plus', title: APPLY, subtitle: APPLY_SUB },
    { icon: 'search', title: STATUS, subtitle: null },
  ];

  it('draws the strip in Marathi and in English: each tile’s icon square, bold title and muted subtitle, in order', () => {
    renderWithProviders(<QuickActionsPreview tiles={tiles} />);
    expect(strip('Marathi')).toHaveAttribute('lang', 'mr');
    expect(strip('English')).toHaveAttribute('lang', 'en');
    expect(strip('Marathi')).toHaveTextContent(`${APPLY.mr}${APPLY_SUB.mr}${STATUS.mr}`);
    expect(strip('English')).toHaveTextContent(`${APPLY.en}${APPLY_SUB.en}${STATUS.en}`);
    expect(within(strip('English')).getByText(APPLY.en).tagName).toBe('B');
    expect(within(strip('English')).getByText(APPLY_SUB.en)).toHaveClass('muted');
    expect(strip('English').querySelectorAll('svg')).toHaveLength(2);
  });

  it('shows a placeholder for a tile that has no title yet, and leaves out a blank subtitle', () => {
    renderWithProviders(<QuickActionsPreview tiles={[{ icon: '', title: BLANK, subtitle: BLANK }]} />);
    expect(strip('Marathi')).toHaveTextContent(/^शीर्षक$/);
    expect(strip('English')).toHaveTextContent(/^Title$/);
    expect(strip('English').querySelector('svg')).toBeNull();
  });

  it('says the website shows no strip when no tile is active', () => {
    renderWithProviders(<QuickActionsPreview tiles={[]} />);
    expect(screen.getByText('No tile is shown: the website leaves the strip out while no quick action is active.')).toBeInTheDocument();
    expect(screen.queryByRole('figure')).toBeNull();
  });
});

describe('quick action icons', () => {
  it('are exactly the icons the API accepts, the four original tiles’ icons first', () => {
    expect(QUICK_ACTION_ICONS.map((i) => i.id)).toEqual([...QUICK_ACTION_ICON_IDS]);
    expect(QUICK_ACTION_ICON_IDS.slice(0, 4)).toEqual(['plus', 'search', 'qr', 'building']);
    expect(QUICK_ACTION_ICON_IDS).toHaveLength(31);
    expect(new Set(QUICK_ACTION_ICON_IDS).size).toBe(31);
  });

  it('each have a name, the same one as in The AMRUT Ecosystem’s picker when it offers the icon too', () => {
    for (const { id, label } of QUICK_ACTION_ICONS) {
      expect(label).not.toBe(id);
      const eco = ECOSYSTEM_ICONS.find((i) => i.id === id);
      if (eco) expect(label).toBe(eco.label);
    }
    expect(quickActionIconLabel('plus')).toBe('Add / apply');
    expect(quickActionIconLabel('unknown')).toBe('unknown');
  });
});

describe('quick action payloads', () => {
  const typed: QuickActionFormValues = {
    title: pair('  अर्ज   करा ', ' Apply\n Now '),
    subtitle: pair(' नवीन  नोंदणी करा ', ' Register as a  new candidate'),
    icon: 'plus',
    link: ' /apply ',
    displayOrder: '',
    isActive: true,
  };

  it('normalise whitespace like the server, store a www. address with https://, and send a blank subtitle as null', () => {
    expect(quickActionPayload(typed)).toEqual({ title: APPLY, subtitle: APPLY_SUB, icon: 'plus', link: '/apply', isActive: true });
    expect(quickActionPayload({ ...typed, displayOrder: ' 3 ' })).toMatchObject({ displayOrder: 3 });
    expect(quickActionPayload({ ...typed, link: ' www.example.gov.in ' })).toMatchObject({ link: 'https://www.example.gov.in' });
    expect(quickActionPayload({ ...typed, link: 'https://example.gov.in/x' })).toMatchObject({ link: 'https://example.gov.in/x' });
    expect(quickActionPayload({ ...typed, subtitle: pair('  ', '') })).toMatchObject({ subtitle: null });
  });

  it('send nothing but the version when nothing changed', () => {
    const saved = action(2, { link: 'https://www.example.gov.in', subtitle: APPLY_SUB });
    expect(quickActionChanges(saved, quickActionToForm(saved))).toEqual({ expectedUpdatedAt: saved.updatedAt });
    /* The address typed the short way is the address already stored. */
    expect(quickActionChanges(saved, { ...quickActionToForm(saved), link: 'www.example.gov.in' })).toEqual({
      expectedUpdatedAt: saved.updatedAt,
    });
    /* No subtitle stored (a blank pair) and none typed: nothing to send. */
    const plain = action(3);
    expect(quickActionChanges(plain, quickActionToForm(plain))).toEqual({ expectedUpdatedAt: plain.updatedAt });
  });

  it('send a changed order, status, title, subtitle, icon and link, each on its own', () => {
    const saved = action(2);
    const form = quickActionToForm(saved);
    const v = saved.updatedAt;
    expect(quickActionChanges(saved, { ...form, displayOrder: '5' })).toEqual({ displayOrder: 5, expectedUpdatedAt: v });
    expect(quickActionChanges(saved, { ...form, isActive: false })).toEqual({ isActive: false, expectedUpdatedAt: v });
    expect(quickActionChanges(saved, { ...form, title: pair(saved.title.mr, 'Other') })).toEqual({
      title: pair(saved.title.mr, 'Other'),
      expectedUpdatedAt: v,
    });
    expect(quickActionChanges(saved, { ...form, subtitle: APPLY_SUB })).toEqual({ subtitle: APPLY_SUB, expectedUpdatedAt: v });
    expect(quickActionChanges(saved, { ...form, icon: 'qr' })).toEqual({ icon: 'qr', expectedUpdatedAt: v });
    expect(quickActionChanges(saved, { ...form, link: '/track' })).toEqual({ link: '/track', expectedUpdatedAt: v });
    /* A stored subtitle cleared in both languages is removed with null. */
    const withSub = action(4, { subtitle: APPLY_SUB });
    expect(quickActionChanges(withSub, { ...quickActionToForm(withSub), subtitle: BLANK })).toEqual({
      subtitle: null,
      expectedUpdatedAt: withSub.updatedAt,
    });
  });
});

describe('quick action validation', () => {
  const ok: QuickActionFormValues = { title: APPLY, subtitle: BLANK, icon: 'plus', link: '/apply', displayOrder: '', isActive: true };
  const errorsOf = (v: QuickActionFormValues) => Object.values(validateQuickActionForm(v)).filter(Boolean);

  it('accepts a complete tile, with or without a subtitle', () => {
    expect(errorsOf(ok)).toEqual([]);
    expect(errorsOf({ ...ok, subtitle: APPLY_SUB, link: 'www.example.gov.in', displayOrder: '999' })).toEqual([]);
  });

  it('requires both halves of the title, at most 40 characters each', () => {
    const blank = validateQuickActionForm({ ...ok, title: pair(' ', '') });
    expect(blank['title.mr']).toBe('Title (Marathi) is required');
    expect(blank['title.en']).toBe('Title (English) is required');
    expect(validateQuickActionForm({ ...ok, title: pair('अ'.repeat(40), 'A'.repeat(40)) })['title.en']).toBeUndefined();
    const long = validateQuickActionForm({ ...ok, title: pair('अ'.repeat(41), 'A'.repeat(41)) });
    expect(long['title.mr']).toBe('Title (Marathi) must be at most 40 characters');
    expect(long['title.en']).toBe('Title (English) must be at most 40 characters');
  });

  it('takes a subtitle in both languages or in neither, at most 60 characters each', () => {
    const run = (subtitle: Bilingual) => validateQuickActionForm({ ...ok, subtitle });
    expect(run(pair('नवीन नोंदणी करा', ''))['subtitle.en']).toBe('Subtitle (English) is required when the Marathi text is filled in');
    expect(run(pair('', 'Register'))['subtitle.mr']).toBe('Subtitle (Marathi) is required when the English text is filled in');
    expect(errorsOf({ ...ok, subtitle: pair('अ'.repeat(60), 'A'.repeat(60)) })).toEqual([]);
    const long = run(pair('अ'.repeat(61), 'A'.repeat(61)));
    expect(long['subtitle.mr']).toBe('Subtitle (Marathi) must be at most 60 characters');
    expect(long['subtitle.en']).toBe('Subtitle (English) must be at most 60 characters');
  });

  it('requires one of the listed icons', () => {
    expect(validateQuickActionForm({ ...ok, icon: '' }).icon).toBe('Choose an icon');
    expect(validateQuickActionForm({ ...ok, icon: 'plug' }).icon).toBe('Choose one of the listed icons');
    for (const id of QUICK_ACTION_ICON_IDS) expect(validateQuickActionForm({ ...ok, icon: id }).icon).toBeUndefined();
  });

  it('requires a destination, and holds it to the rule every other CMS link follows', () => {
    expect(validateQuickActionForm({ ...ok, link: '  ' }).link).toBe('Destination is required');
    expect(validateQuickActionForm({ ...ok, link: 'apply' }).link).toMatch(/^Destination must be a page on this site/);
    expect(validateQuickActionForm({ ...ok, link: 'javascript:alert(1)' }).link).toMatch(/^Destination must be a page on this site/);
    expect(validateQuickActionForm({ ...ok, link: '//evil.example' }).link).toMatch(/^A page on this site must start with a single \//);
    expect(validateQuickActionForm({ ...ok, link: 'https://localhost' }).link).toBe('Enter a full address, e.g. https://example.gov.in');
    expect(validateQuickActionForm({ ...ok, link: 'https://example.gov.in' }).link).toBeUndefined();
  });

  it('holds the display order to 1 to 999 when one is typed', () => {
    for (const bad of ['0', '1000', '-1', '1.5', 'x']) {
      expect(validateQuickActionForm({ ...ok, displayOrder: bad }).displayOrder).toBe('Display order must be a whole number from 1 to 999');
    }
    expect(validateQuickActionForm({ ...ok, displayOrder: '12' }).displayOrder).toBeUndefined();
  });
});

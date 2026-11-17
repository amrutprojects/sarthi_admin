import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import NavMenuTab from './components/NavMenuTab';
import { NAV_MENU_ITEMS } from './constants';
import { navMenuService } from './services/navMenuService';
import type { NavMenuItem } from './types/navmenu.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const ALL = ['cms-navmenu.view', 'cms-navmenu.update'];
const CHANGED = '2026-11-17T10:00:00.000Z';
const ENGLISH = [
  'Home',
  'About AMRUT',
  'AMRUT Kalash',
  'AMRUT Advisory Committee',
  'Modules',
  'Eligibility',
  'How to Apply',
  'FAQs',
  'Contact',
  'Login / Register',
];
const MARATHI = [
  'मुख्यपृष्ठ',
  'अमृत विषयी',
  'अमृत कलश',
  'अमृत कलश सल्लागार समिती',
  'मॉड्यूल्स',
  'पात्रता',
  'अर्ज कसा करावा',
  'प्रश्नोत्तरे',
  'संपर्क',
  'लॉगिन / नोंदणी करा',
];
const PAGES = ['/', '/about', '/programme', '/advisory-committee', '/modules', '/eligibility', '/apply', '/faq', '/contact', 'Login portal'];

/* What GET /cms/nav-menu lists, kept up to date by the PUTs below: all ten keys in menu order, every one shown. */
let items: NavMenuItem[];
/* A PUT's answer when it is not the default success, e.g. a 403. */
let refusal: { status: number; message: string } | null;

const respond = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) }) as Response;
/* The backend, behind the real service and api-client: the tab is tested down to the request it sends. */
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const path = new URL(url, 'http://admin.test').pathname;
  if ((init.method ?? 'GET') === 'GET' && path.endsWith('/cms/nav-menu')) {
    return respond(200, { success: true, message: 'Navigation menu', data: items });
  }
  const put = path.match(/\/cms\/nav-menu\/([^/]+)$/);
  if (init.method === 'PUT' && put) {
    if (refusal) return respond(refusal.status, { success: false, message: refusal.message, error: { code: 'REFUSED' } });
    const key = decodeURIComponent(put[1]!);
    const { show } = JSON.parse(String(init.body)) as { show: boolean };
    const next = { key, show, updatedAt: CHANGED };
    items = items.map((i) => (i.key === key ? next : i));
    return respond(200, { success: true, message: 'Navigation menu item updated', data: next });
  }
  return respond(404, { success: false, message: 'Not found', error: { code: 'NOT_FOUND' } });
});
const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
const gets = () => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET');

const toasts = () => document.getElementById('toast-root')!;
const renderTab = () => renderWithProviders(<NavMenuTab />, { route: '/cms/home-page?tab=nav-menu' });
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const rowOf = (english: string) => screen.getByText(english, { selector: 'b' }).closest('tr') as HTMLElement;
const switchOf = (english: string) => screen.getByRole('switch', { name: `Show ${english} in the menu` });
const findTable = () => screen.findByRole('table');

beforeEach(() => {
  auth.permissions = new Set(ALL);
  items = NAV_MENU_ITEMS.map((i) => ({ key: i.key, show: true, updatedAt: null }));
  refusal = null;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('navigation menu API', () => {
  it('lists the items, and sends one item’s switch as PUT /cms/nav-menu/<key> {show}', async () => {
    expect(await navMenuService.list()).toEqual(items);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cms\/nav-menu$/);

    expect(await navMenuService.set('faq', false)).toEqual({ key: 'faq', show: false, updatedAt: CHANGED });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toMatch(/\/cms\/nav-menu\/faq$/);
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ show: false }) });
  });

  it('knows the ten items of the website’s menu bar, in menu order', () => {
    expect(NAV_MENU_ITEMS.map((i) => i.key)).toEqual([
      'home',
      'about',
      'programme',
      'advisory',
      'modules',
      'eligibility',
      'apply',
      'faq',
      'contact',
      'login',
    ]);
    expect(NAV_MENU_ITEMS.map((i) => i.label.en)).toEqual(ENGLISH);
    expect(NAV_MENU_ITEMS.map((i) => i.label.mr)).toEqual(MARATHI);
    expect(NAV_MENU_ITEMS.map((i) => i.path ?? 'Login portal')).toEqual(PAGES);
  });
});

describe('Navigation Menu tab', () => {
  it('lists the ten menu items in menu order, each with its Marathi label, page and switch', async () => {
    renderTab();
    await findTable();

    expect(
      screen.getByText(
        'The menu bar under the brand bar on every page of the website. Hide an item to take it out of the menu bar and the mobile menu — its page still opens from other links.',
      ),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      '#',
      'Menu item',
      'Page',
      'Status',
    ]);
    expect(rows()).toHaveLength(10);
    rows().forEach((row, i) => {
      const cells = within(row).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent(String(i + 1));
      expect(cells[1]).toHaveTextContent(`${ENGLISH[i]}${MARATHI[i]}`);
      expect(within(cells[1]!).getByText(MARATHI[i]!)).toHaveAttribute('lang', 'mr');
      expect(cells[2]).toHaveTextContent(PAGES[i]!);
      const toggle = within(cells[3]!).getByRole('switch', { name: `Show ${ENGLISH[i]} in the menu` });
      expect(toggle).toBeChecked();
      expect(toggle).toHaveClass('switch', 'on');
      expect(cells[3]).toHaveTextContent('Shown');
    });
    expect(screen.getByText('10 of 10 shown in the menu')).toHaveClass('tag');
    expect(gets()).toHaveLength(1);
  });

  it('hides an item after asking, sending only that item’s switch, then reloads the list', async () => {
    renderTab();
    await findTable();

    await userEvent.click(switchOf('AMRUT Advisory Committee'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide "AMRUT Advisory Committee" from the menu?');
    expect(dialog).toHaveTextContent('still opens from other links');
    expect(puts()).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('AMRUT Advisory Committee is now hidden from the menu'));
    expect(puts()).toHaveLength(1);
    const [url, init] = puts()[0]!;
    expect(url).toMatch(/\/cms\/nav-menu\/advisory$/);
    expect(JSON.parse(String(init!.body))).toEqual({ show: false });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    /* Reloaded: the switch, its text and the count follow the server. */
    await waitFor(() => expect(gets()).toHaveLength(2));
    expect(switchOf('AMRUT Advisory Committee')).not.toBeChecked();
    expect(rowOf('AMRUT Advisory Committee')).toHaveTextContent('Hidden');
    expect(switchOf('Modules')).toBeChecked();
    expect(screen.getByText('9 of 10 shown in the menu')).toBeInTheDocument();
  });

  it('sends nothing when hiding is cancelled', async () => {
    renderTab();
    await findTable();

    await userEvent.click(switchOf('Home'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    expect(switchOf('Home')).toBeChecked();
  });

  it('shows a hidden item again without asking', async () => {
    items = items.map((i) => (i.key === 'faq' ? { ...i, show: false, updatedAt: CHANGED } : i));
    renderTab();
    await findTable();

    expect(switchOf('FAQs')).not.toBeChecked();
    expect(rowOf('FAQs')).toHaveTextContent('Hidden');
    expect(screen.getByText('9 of 10 shown in the menu')).toBeInTheDocument();

    await userEvent.click(switchOf('FAQs'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(toasts()).toHaveTextContent('FAQs is now shown in the menu'));
    expect(puts()).toHaveLength(1);
    expect(puts()[0]![0]).toMatch(/\/cms\/nav-menu\/faq$/);
    expect(JSON.parse(String(puts()[0]![1]!.body))).toEqual({ show: true });
    await waitFor(() => expect(switchOf('FAQs')).toBeChecked());
    expect(screen.getByText('10 of 10 shown in the menu')).toBeInTheDocument();
  });

  it('says what hiding the Login / Register button does', async () => {
    renderTab();
    await findTable();

    await userEvent.click(switchOf('Login / Register'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide "Login / Register" from the menu?');
    expect(dialog).toHaveTextContent('Login / Register button in the menu bar or the mobile menu');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]![0]).toMatch(/\/cms\/nav-menu\/login$/);
  });

  it('shows a refusal as the server sent it, and reloads so the switch shows what the website has', async () => {
    refusal = { status: 403, message: 'You do not have permission to do this' };
    renderTab();
    await findTable();

    await userEvent.click(switchOf('Contact'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Not permitted: You do not have permission to do this'));
    await waitFor(() => expect(gets()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(switchOf('Contact')).toBeChecked();
    expect(screen.getByText('10 of 10 shown in the menu')).toBeInTheDocument();
  });

  it('gives a view-only administrator a Shown / Hidden badge per item instead of the switches', async () => {
    auth.permissions = new Set(['cms-navmenu.view']);
    items = items.map((i) => (i.key === 'modules' ? { ...i, show: false } : i));
    renderTab();
    await findTable();

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(within(rowOf('Modules')).getByText('Hidden')).toHaveClass('badge');
    expect(within(rowOf('Home')).getByText('Shown')).toHaveClass('badge');
    expect(screen.getAllByText('Shown', { selector: '.badge' })).toHaveLength(9);
    expect(screen.getByText('9 of 10 shown in the menu')).toBeInTheDocument();
  });

  it('says when the list cannot be loaded, and retries', async () => {
    fetchMock.mockImplementationOnce(async () => respond(500, { success: false, message: 'Server error', error: { code: 'ERROR' } }));
    renderTab();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await findTable();
    expect(rows()).toHaveLength(10);
  });
});

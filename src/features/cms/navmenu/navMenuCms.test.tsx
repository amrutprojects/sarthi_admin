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
/* A PUT's answer when it is not the default success, e.g. a 403, or a 422 with field details. */
let refusal: { status: number; message: string; details?: { field: string; message: string }[] } | null;

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
    if (refusal) {
      return respond(refusal.status, { success: false, message: refusal.message, error: { code: 'REFUSED', details: refusal.details } });
    }
    const key = decodeURIComponent(put[1]!);
    const body = JSON.parse(String(init.body)) as { show?: boolean; label?: NavMenuItem['label'] };
    const current = items.find((i) => i.key === key)!;
    const label = 'label' in body ? (body.label && body.label.mr && body.label.en ? body.label : null) : current.label;
    const next: NavMenuItem = { key, show: body.show ?? current.show, label, updatedAt: CHANGED };
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
  items = NAV_MENU_ITEMS.map((i) => ({ key: i.key, show: true, label: null, updatedAt: null }));
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

    expect(await navMenuService.set('faq', false)).toEqual({ key: 'faq', show: false, label: null, updatedAt: CHANGED });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toMatch(/\/cms\/nav-menu\/faq$/);
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ show: false }) });
  });

  it('sends a name as PUT /cms/nav-menu/<key> {label}, and null for the default name', async () => {
    const name = { mr: 'प्रश्न', en: 'Questions' };
    expect(await navMenuService.setLabel('faq', name)).toEqual({ key: 'faq', show: true, label: name, updatedAt: CHANGED });
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cms\/nav-menu\/faq$/);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ label: name }) });

    expect((await navMenuService.setLabel('faq', null)).label).toBeNull();
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ label: null }) });
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
      'Action',
    ]);
    expect(rows()).toHaveLength(10);
    rows().forEach((row, i) => {
      const cells = within(row).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent(String(i + 1));
      expect(cells[1]).toHaveTextContent(`${ENGLISH[i]}${MARATHI[i]}Default name`);
      expect(within(cells[4]!).getByRole('button', { name: `Edit name of ${ENGLISH[i]}` })).toHaveTextContent('Edit name');
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
    expect(screen.queryByRole('button', { name: /Edit name/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Action' })).not.toBeInTheDocument();
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

describe('Navigation Menu tab — item names', () => {
  const CUSTOM = { mr: 'प्रश्न', en: 'Questions' };
  const openEdit = async (english: string) => {
    await userEvent.click(screen.getByRole('button', { name: `Edit name of ${english}` }));
    return screen.getByRole('dialog');
  };
  const inputs = (dialog: HTMLElement) => ({
    mr: within(dialog).getByLabelText('Name (Marathi)') as HTMLInputElement,
    en: within(dialog).getByLabelText('Name (English)') as HTMLInputElement,
  });
  const labelPuts = () => puts().map(([, init]) => JSON.parse(String(init!.body)) as unknown);

  it('shows an item’s own name in its row, with the switch and the hide question using it', async () => {
    items = items.map((i) => (i.key === 'faq' ? { ...i, label: CUSTOM } : i));
    renderTab();
    await findTable();

    const row = rowOf('Questions');
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('Questionsप्रश्नCustom name');
    expect(within(row).getByText('प्रश्न')).toHaveAttribute('lang', 'mr');
    expect(screen.queryByText('FAQs', { selector: 'b' })).not.toBeInTheDocument();
    expect(rowOf('Home')).toHaveTextContent('Default name');

    await userEvent.click(switchOf('Questions'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Hide "Questions" from the menu?');
  });

  it('opens with the current name and saves a new one in both languages, trimmed, then reloads the list', async () => {
    renderTab();
    await findTable();

    const dialog = await openEdit('FAQs');
    const { mr, en } = inputs(dialog);
    expect(mr).toHaveValue('प्रश्नोत्तरे');
    expect(en).toHaveValue('FAQs');
    expect(mr).toHaveAttribute('maxLength', '40');
    expect(en).toHaveAttribute('maxLength', '40');
    expect(dialog).toHaveTextContent("Shown in the website’s menu bar and mobile menu. Leave both blank to use the default name.");
    /* No name of its own yet, so nothing to reset. */
    expect(within(dialog).queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();

    await userEvent.clear(mr);
    await userEvent.type(mr, '  प्रश्न ');
    await userEvent.clear(en);
    await userEvent.type(en, ' Questions ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toasts()).toHaveTextContent('Menu item renamed to "Questions"'));
    expect(puts()).toHaveLength(1);
    expect(puts()[0]![0]).toMatch(/\/cms\/nav-menu\/faq$/);
    expect(labelPuts()).toEqual([{ label: CUSTOM }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(gets()).toHaveLength(2));
    expect(rowOf('Questions')).toHaveTextContent('Custom name');
    /* Only the name changed. */
    expect(switchOf('Questions')).toBeChecked();
  });

  it('refuses one half without the other, and saves both blank as the default name', async () => {
    items = items.map((i) => (i.key === 'contact' ? { ...i, label: { mr: 'संपर्क साधा', en: 'Reach us' } } : i));
    renderTab();
    await findTable();

    const dialog = await openEdit('Reach us');
    const { mr, en } = inputs(dialog);
    await userEvent.clear(en);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter the English name too, or leave both blank to use the default name');
    expect(en).toHaveAttribute('aria-invalid', 'true');
    expect(puts()).toHaveLength(0);

    await userEvent.clear(mr);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('"Contact" now uses its default name'));
    expect(labelPuts()).toEqual([{ label: null }]);
    await waitFor(() => expect(rowOf('Contact')).toHaveTextContent('Default name'));
  });

  it('refuses a name over 40 characters', async () => {
    items = items.map((i) => (i.key === 'home' ? { ...i, label: { mr: 'मुख्य', en: 'H'.repeat(41) } } : i));
    renderTab();
    await findTable();

    const dialog = await openEdit('H'.repeat(41));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('English name must be at most 40 characters');
    expect(puts()).toHaveLength(0);
  });

  it('saves the default name typed back as the default name', async () => {
    items = items.map((i) => (i.key === 'about' ? { ...i, label: { mr: 'आमच्याबद्दल', en: 'About us' } } : i));
    renderTab();
    await findTable();

    const { mr, en } = inputs(await openEdit('About us'));
    await userEvent.clear(mr);
    await userEvent.type(mr, 'अमृत विषयी');
    await userEvent.clear(en);
    await userEvent.type(en, 'About AMRUT');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(labelPuts()).toEqual([{ label: null }]);
  });

  it('puts the default name back with "Reset to default"', async () => {
    items = items.map((i) => (i.key === 'login' ? { ...i, label: { mr: 'प्रवेश', en: 'Sign in' } } : i));
    renderTab();
    await findTable();

    const dialog = await openEdit('Sign in');
    expect(dialog).toHaveTextContent('Default name: Login / Register · लॉगिन / नोंदणी करा');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset to default' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('"Login / Register" now uses its default name'));
    expect(puts()[0]![0]).toMatch(/\/cms\/nav-menu\/login$/);
    expect(labelPuts()).toEqual([{ label: null }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(rowOf('Login / Register')).toHaveTextContent('Default name'));
  });

  it('shows the server’s field messages on the form and keeps the dialog open', async () => {
    refusal = { status: 422, message: 'Validation failed', details: [{ field: 'body.label.en', message: 'English name is not allowed' }] };
    renderTab();
    await findTable();

    const dialog = await openEdit('Modules');
    await userEvent.type(inputs(dialog).en, ' list');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('English name is not allowed'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(inputs(dialog).en).toHaveValue('Modules list');
  });

  it('closes without sending anything on Cancel', async () => {
    renderTab();
    await findTable();

    const dialog = await openEdit('Home');
    await userEvent.type(inputs(dialog).en, ' page');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });
});

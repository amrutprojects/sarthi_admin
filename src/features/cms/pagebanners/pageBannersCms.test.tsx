import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { PAGE_BANNERS } from './constants';
import PageBannersPage from './pages/PageBannersPage';
import { pageBannersService } from './services/pageBannersService';
import type { PageBanner } from './types/pagebanners.types';
import { bannerPayload, toBannerForm, validateBanner } from './validation/pagebanners.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const ALL = ['cms-pagebanners.view', 'cms-pagebanners.update'];
const CHANGED = '2026-11-17T10:00:00.000Z';
const PAGES = ['About AMRUT', 'FAQs', 'Sarthi programme', 'Check Application Status', 'Verify Certificate'];
const PATHS = ['/about', '/faq', '/programme', '/track', '/verify'];

/* What GET /cms/page-banners lists, kept up to date by the PUTs below: all five keys in list order, every one default. */
let items: PageBanner[];
/* A PUT's answer when it is not the default success, e.g. a 403, or a 422 with field details. */
let refusal: { status: number; message: string; details?: { field: string; message: string }[] } | null;

const respond = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) }) as Response;
/* The backend, behind the real service and api-client: the screen is tested down to the request it sends. */
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const path = new URL(url, 'http://admin.test').pathname;
  if ((init.method ?? 'GET') === 'GET' && path.endsWith('/cms/page-banners')) {
    return respond(200, { success: true, message: 'Page banners', data: items });
  }
  const put = path.match(/\/cms\/page-banners\/([^/]+)$/);
  if (init.method === 'PUT' && put) {
    if (refusal) {
      return respond(refusal.status, { success: false, message: refusal.message, error: { code: 'REFUSED', details: refusal.details } });
    }
    const key = decodeURIComponent(put[1]!);
    const body = JSON.parse(String(init.body)) as Partial<Pick<PageBanner, 'title' | 'subtitle'>>;
    const current = items.find((i) => i.key === key)!;
    const next: PageBanner = {
      key,
      title: 'title' in body ? (body.title ?? null) : current.title,
      subtitle: 'subtitle' in body ? (body.subtitle ?? null) : current.subtitle,
      updatedAt: CHANGED,
    };
    items = items.map((i) => (i.key === key ? next : i));
    return respond(200, { success: true, message: 'Page banner updated', data: next });
  }
  return respond(404, { success: false, message: 'Not found', error: { code: 'NOT_FOUND' } });
});
const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
const gets = () => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET');
const bodies = () => puts().map(([, init]) => JSON.parse(String(init!.body)) as unknown);

const toasts = () => document.getElementById('toast-root')!;
const renderPage = () => renderWithProviders(<PageBannersPage />, { route: '/cms/page-banners' });
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const rowOf = (page: string) => screen.getByText(page, { selector: 'td > b' }).closest('tr') as HTMLElement;
const cell = (row: HTMLElement, i: number) => within(row).getAllByRole('cell')[i]!;
const findTable = () => screen.findByRole('table');

const openEdit = async (page: string) => {
  await userEvent.click(screen.getByRole('button', { name: `Edit banner of ${page}` }));
  return screen.getByRole('dialog');
};
const inputs = (dialog: HTMLElement) => ({
  titleMr: within(dialog).getByLabelText('Title (Marathi)') as HTMLInputElement,
  titleEn: within(dialog).getByLabelText('Title (English)') as HTMLInputElement,
  subMr: within(dialog).getByLabelText('Subtitle (Marathi)') as HTMLTextAreaElement,
  subEn: within(dialog).getByLabelText('Subtitle (English)') as HTMLTextAreaElement,
});

beforeEach(() => {
  auth.permissions = new Set(ALL);
  items = PAGE_BANNERS.map((p) => ({ key: p.key, title: null, subtitle: null, updatedAt: null }));
  refusal = null;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('page banners API', () => {
  it('lists the banners, and sends one page’s banner as PUT /cms/page-banners/<key>', async () => {
    expect(await pageBannersService.list()).toEqual(items);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cms\/page-banners$/);

    const title = { mr: 'प्रश्न', en: 'Questions' };
    expect(await pageBannersService.update('faq', { title, subtitle: null })).toEqual({ key: 'faq', title, subtitle: null, updatedAt: CHANGED });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toMatch(/\/cms\/page-banners\/faq$/);
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ title, subtitle: null }) });
  });

  it('knows the five pages, in list order, with the website’s default banner text', () => {
    expect(PAGE_BANNERS.map((p) => p.key)).toEqual(['about', 'faq', 'programme', 'track', 'verify']);
    expect(PAGE_BANNERS.map((p) => p.page)).toEqual(PAGES);
    expect(PAGE_BANNERS.map((p) => p.path)).toEqual(PATHS);
    expect(PAGE_BANNERS.map((p) => p.title)).toEqual([
      { en: 'About AMRUT', mr: 'अमृत विषयी माहिती' },
      { en: 'FAQs', mr: 'प्रश्नोत्तरे' },
      { en: 'SARTHI', mr: 'सारथी' },
      { en: 'Check Application Status', mr: 'अर्जाची स्थिती पहा' },
      { en: 'Verify Certificate', mr: 'प्रमाणपत्र पडताळणी' },
    ]);
    /* About's default subtitle follows the About AMRUT description, so it has no fixed text. */
    expect(PAGE_BANNERS[0]!.subtitle).toBeNull();
    expect(PAGE_BANNERS.slice(1).every((p) => p.subtitle && p.subtitle.mr && p.subtitle.en)).toBe(true);
  });
});

describe('banner form rules', () => {
  const faq = PAGE_BANNERS[1]!;
  const blank = { mr: '', en: '' };

  it('opens with what the website shows now', () => {
    expect(toBannerForm({ key: 'faq', title: null, subtitle: null, updatedAt: null }, faq)).toEqual({ title: faq.title, subtitle: faq.subtitle });
    expect(toBannerForm({ key: 'about', title: null, subtitle: null, updatedAt: null }, PAGE_BANNERS[0]!).subtitle).toEqual(blank);
    const own = { mr: 'प्रश्न', en: 'Questions' };
    expect(toBannerForm({ key: 'faq', title: own, subtitle: null, updatedAt: CHANGED }, faq).title).toEqual(own);
  });

  it('sends a blank pair, or the default typed back, as null; otherwise both halves trimmed', () => {
    expect(bannerPayload({ title: blank, subtitle: { mr: '  ', en: ' ' } }, faq)).toEqual({ title: null, subtitle: null });
    expect(bannerPayload({ title: { ...faq.title }, subtitle: { ...faq.subtitle! } }, faq)).toEqual({ title: null, subtitle: null });
    expect(bannerPayload({ title: { mr: ' प्रश्न ', en: ' Questions ' }, subtitle: blank }, faq)).toEqual({
      title: { mr: 'प्रश्न', en: 'Questions' },
      subtitle: null,
    });
  });

  it('refuses one half without the other, over-long text, and a line break in the title', () => {
    expect(validateBanner({ title: { mr: 'प्रश्न', en: '' }, subtitle: { mr: '', en: 'Sub' } })).toEqual({
      'title.mr': undefined,
      'title.en': 'Enter the English title too, or leave both blank to use the default title',
      'subtitle.mr': 'Enter the Marathi subtitle too, or leave both blank to use the default subtitle',
      'subtitle.en': undefined,
    });
    const long = validateBanner({ title: { mr: 'x'.repeat(151), en: 'x'.repeat(150) }, subtitle: { mr: 'x'.repeat(300), en: 'x'.repeat(301) } });
    expect(long['title.mr']).toBe('Marathi title must be at most 150 characters');
    expect(long['title.en']).toBeUndefined();
    expect(long['subtitle.mr']).toBeUndefined();
    expect(long['subtitle.en']).toBe('English subtitle must be at most 300 characters');
    expect(validateBanner({ title: { mr: 'एक\nदोन', en: 'One' }, subtitle: blank })['title.mr']).toBe(
      'Marathi title may not contain line breaks or control characters',
    );
  });
});

describe('Page Banners screen', () => {
  it('lists the five pages, each with its current title and subtitle and whether they are custom or default', async () => {
    items = items.map((i) => (i.key === 'faq' ? { ...i, title: { mr: 'प्रश्न', en: 'Questions' }, updatedAt: CHANGED } : i));
    renderPage();
    await findTable();

    expect(screen.getByRole('heading', { name: 'Page Banners' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      '#',
      'Page',
      'Title',
      'Subtitle',
      'Action',
    ]);
    expect(rows()).toHaveLength(5);
    rows().forEach((row, i) => {
      expect(cell(row, 0)).toHaveTextContent(String(i + 1));
      expect(cell(row, 1)).toHaveTextContent(`${PAGES[i]}${PATHS[i]}`);
      expect(within(cell(row, 4)).getByRole('button', { name: `Edit banner of ${PAGES[i]}` })).toHaveTextContent('Edit');
    });

    /* A default title, English first and Marathi underneath. */
    const verify = rowOf('Verify Certificate');
    expect(cell(verify, 2)).toHaveTextContent('Verify Certificateप्रमाणपत्र पडताळणीDefault title');
    expect(within(cell(verify, 2)).getByText('प्रमाणपत्र पडताळणी')).toHaveAttribute('lang', 'mr');
    expect(cell(verify, 3)).toHaveTextContent('Check a certificate number against the programme register.');
    expect(cell(verify, 3)).toHaveTextContent('Default subtitle');
    /* The page's own title, marked as such; its subtitle is still the default. */
    const faq = rowOf('FAQs');
    expect(cell(faq, 2)).toHaveTextContent('Questionsप्रश्नCustom title');
    expect(cell(faq, 3)).toHaveTextContent('Frequently asked questions.वारंवार विचारले जाणारे प्रश्न.Default subtitle');
    /* About's default subtitle is described, not quoted. */
    expect(cell(rowOf('About AMRUT'), 3)).toHaveTextContent('The first 160 characters of the About AMRUT descriptionDefault subtitle');

    expect(screen.getByText('1 of 5 customised')).toHaveClass('tag');
    expect(gets()).toHaveLength(1);
  });

  it('opens with the current banner and saves a new title in both languages, trimmed, then reloads the list', async () => {
    renderPage();
    await findTable();

    const dialog = await openEdit('Check Application Status');
    expect(dialog).toHaveTextContent('Edit banner — Check Application Status');
    const { titleMr, titleEn, subMr, subEn } = inputs(dialog);
    expect(titleMr).toHaveValue('अर्जाची स्थिती पहा');
    expect(titleEn).toHaveValue('Check Application Status');
    expect(subEn).toHaveValue('Enter your Application / Candidate ID or registered mobile number.');
    expect(subMr).toHaveValue('अर्ज / उमेदवार क्रमांक किंवा नोंदणीकृत मोबाइल क्रमांक टाका.');
    expect(titleEn).toHaveAttribute('maxLength', '150');
    expect(subEn).toHaveAttribute('maxLength', '300');
    expect(dialog).toHaveTextContent('Default title: Check Application Status · अर्जाची स्थिती पहा');
    /* Nothing of its own yet, so nothing to reset. */
    expect(within(dialog).queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();

    await userEvent.clear(titleMr);
    await userEvent.type(titleMr, '  अर्ज स्थिती ');
    await userEvent.clear(titleEn);
    await userEvent.type(titleEn, ' Track your application ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toasts()).toHaveTextContent('Check Application Status banner updated'));
    expect(puts()).toHaveLength(1);
    expect(puts()[0]![0]).toMatch(/\/cms\/page-banners\/track$/);
    /* The subtitle was left as the default, so it stays the default rather than a copy of it. */
    expect(bodies()).toEqual([{ title: { mr: 'अर्ज स्थिती', en: 'Track your application' }, subtitle: null }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(gets()).toHaveLength(2));
    expect(cell(rowOf('Check Application Status'), 2)).toHaveTextContent('Track your applicationअर्ज स्थितीCustom title');
    expect(screen.getByText('1 of 5 customised')).toBeInTheDocument();
  });

  it('saves a subtitle for About, whose default is the opening of its description', async () => {
    renderPage();
    await findTable();

    const dialog = await openEdit('About AMRUT');
    const { subMr, subEn } = inputs(dialog);
    expect(subMr).toHaveValue('');
    expect(subEn).toHaveValue('');
    expect(dialog).toHaveTextContent('Default subtitle: The first 160 characters of the About AMRUT description.');
    await userEvent.type(subMr, 'महाराष्ट्रातील युवकांसाठी');
    await userEvent.type(subEn, 'For the youth of Maharashtra');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(bodies()).toEqual([{ title: null, subtitle: { mr: 'महाराष्ट्रातील युवकांसाठी', en: 'For the youth of Maharashtra' } }]);
  });

  it('shows the both-or-neither and length errors in the dialog and sends nothing', async () => {
    renderPage();
    await findTable();

    const dialog = await openEdit('FAQs');
    const { titleEn, subMr } = inputs(dialog);
    await userEvent.clear(titleEn);
    await userEvent.clear(subMr);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(within(dialog).getByText('Enter the English title too, or leave both blank to use the default title')).toBeInTheDocument();
    expect(titleEn).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByText('Enter the Marathi subtitle too, or leave both blank to use the default subtitle')).toBeInTheDocument();
    expect(subMr).toHaveAttribute('aria-invalid', 'true');
    expect(puts()).toHaveLength(0);
  });

  it('puts the default banner back with "Reset to default"', async () => {
    items = items.map((i) =>
      i.key === 'programme' ? { ...i, title: { mr: 'सारथी', en: 'Sarthi' }, subtitle: { mr: 'उप', en: 'Sub' }, updatedAt: CHANGED } : i,
    );
    renderPage();
    await findTable();

    const dialog = await openEdit('Sarthi programme');
    expect(inputs(dialog).titleEn).toHaveValue('Sarthi');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset to default' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Sarthi programme banner now uses the default title and subtitle'));
    expect(puts()[0]![0]).toMatch(/\/cms\/page-banners\/programme$/);
    expect(bodies()).toEqual([{ title: null, subtitle: null }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(cell(rowOf('Sarthi programme'), 2)).toHaveTextContent('SARTHIसारथीDefault title'));
    expect(screen.getByText('0 of 5 customised')).toBeInTheDocument();
  });

  it('shows the server’s field messages on the form and keeps the dialog open with what was typed', async () => {
    refusal = {
      status: 422,
      message: 'Validation failed',
      details: [
        { field: 'body.title.en', message: 'English title is not allowed' },
        { field: 'body.subtitle', message: 'Subtitle must have Marathi and English text' },
      ],
    };
    renderPage();
    await findTable();

    const dialog = await openEdit('Verify Certificate');
    await userEvent.type(inputs(dialog).titleEn, ' now');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(dialog).getByText('English title is not allowed')).toBeInTheDocument());
    /* A message on the pair as a whole sits on its Marathi half. */
    expect(within(dialog).getByText('Subtitle must have Marathi and English text')).toBeInTheDocument();
    expect(inputs(dialog).subMr).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(inputs(dialog).titleEn).toHaveValue('Verify Certificate now');
    expect(toasts()).toBeEmptyDOMElement();

    /* Editing a pair clears the server's message about it. */
    await userEvent.type(inputs(dialog).titleEn, '!');
    expect(within(dialog).queryByText('English title is not allowed')).not.toBeInTheDocument();
  });

  it('shows a refusal without field details as a toast, and keeps the dialog open', async () => {
    refusal = { status: 422, message: 'Unknown page' };
    renderPage();
    await findTable();

    const dialog = await openEdit('FAQs');
    await userEvent.type(inputs(dialog).titleEn, '!');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Unknown page'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes without sending anything on Cancel', async () => {
    renderPage();
    await findTable();

    const dialog = await openEdit('FAQs');
    await userEvent.type(inputs(dialog).titleEn, ' and answers');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it('is read-only for a view-only administrator', async () => {
    auth.permissions = new Set(['cms-pagebanners.view']);
    renderPage();
    await findTable();

    expect(rows()).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /Edit banner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Action' })).not.toBeInTheDocument();
  });

  it('says when the list cannot be loaded, and retries', async () => {
    fetchMock.mockImplementationOnce(async () => respond(500, { success: false, message: 'Server error', error: { code: 'ERROR' } }));
    renderPage();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await findTable();
    expect(rows()).toHaveLength(5);
  });
});

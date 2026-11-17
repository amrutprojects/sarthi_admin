import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { HOME_PAGE_TABS, type HomePageTab } from '../../../../constants/navigation';
import { ACTION_ACCESS } from '../../../../modules/auth/permissions';
import HomePageView from '../../homePage/pages/HomePageView';
import { HIDE_CONSEQUENCE, VISIBILITY_TABS, VISIBILITY_UPDATE_ACTION, isVisibilitySection } from '../constants';
import type { SectionVisibility, SectionVisibilityKey } from '../visibility.types';
import { visibilityService } from '../visibilityService';

/* The signed-in user, as AuthProvider would expose it; switched per test. */
const auth = vi.hoisted(() => ({
  permissions: new Set<string>(),
  hiddenMenus: new Set<string>(),
  portal: 'admin' as 'admin' | 'website',
}));
vi.mock('../../../../modules/auth/auth-context', () => ({ useAuth: () => auth }));

/*
 * Each tab's own content, reduced to a line naming its section and a count of its mounts, so the bar above it is
 * tested on its own (the sections' screens have tests of their own). It also shows the switch's result when the
 * page hands it one, as it does to the tabs it keeps mounted.
 */
const mounts = vi.hoisted(() => ({}) as Record<string, number>);
const stubTab = vi.hoisted(() => async (key: string) => {
  const { createElement, Fragment, useEffect } = await import('react');
  return function TabStub({ switched }: { switched?: { visible: boolean; updatedAt: string | null } }) {
    useEffect(() => {
      mounts[key] = (mounts[key] ?? 0) + 1;
    }, []);
    return createElement(
      Fragment,
      null,
      createElement('p', null, `${key} content`),
      switched ? createElement('output', { 'data-testid': 'switched' }, `${switched.visible} at ${switched.updatedAt}`) : null,
    );
  };
});
vi.mock('../../topbar/components/TopBarTab', async () => ({ default: await stubTab('top-bar') }));
vi.mock('../../brandbar/components/BrandBarTab', async () => ({ default: await stubTab('brand-bar') }));
vi.mock('../../navmenu/components/NavMenuTab', async () => ({ default: await stubTab('nav-menu') }));
vi.mock('../../announcements/components/AnnouncementsTab', async () => ({ default: await stubTab('announcements') }));
vi.mock('../../hero/components/HeroTabs', async () => ({ HeroSlidesTab: await stubTab('hero'), HeroGlanceTab: await stubTab('glance') }));
vi.mock('../../highlight/components/HighlightTab', async () => ({ default: await stubTab('diploma') }));
vi.mock('../../board/components/BoardMembersTab', async () => ({ default: await stubTab('board') }));
vi.mock('../../impact/components/ImpactTab', async () => ({ default: await stubTab('impact') }));
vi.mock('../../ecosystem/components/EcosystemTab', async () => ({ default: await stubTab('ecosystem') }));
vi.mock('../../schemes/components/SchemesTab', async () => ({ default: await stubTab('schemes') }));
vi.mock('../../about/components/AboutTab', async () => ({ default: await stubTab('about') }));

const UPDATED = '2026-11-02T10:00:00.000Z';
const SWITCHED = '2026-11-16T10:00:00.000Z';
const row = (k: SectionVisibilityKey, over: Partial<SectionVisibility> = {}): SectionVisibility => ({
  key: k,
  menu: HOME_PAGE_TABS.find((t) => t.k === k)!.menu,
  visible: true,
  configured: true,
  updatedAt: UPDATED,
  ...over,
});

/* What GET /cms/section-visibility lists, kept up to date by the PUTs below. */
let rows: SectionVisibility[];
/* A PUT's answer when it is not the default success, e.g. a 409. */
let refusal: { status: number; message: string } | null;

const respond = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) }) as Response;
/* The backend, behind the real api-client: the bar is tested down to the request it sends. */
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const path = new URL(url, 'http://admin.test').pathname;
  if ((init.method ?? 'GET') === 'GET' && path.endsWith('/cms/section-visibility')) {
    return respond(200, { success: true, message: 'Section visibility', data: rows });
  }
  const put = path.match(/\/cms\/section-visibility\/([^/]+)$/);
  if (init.method === 'PUT' && put) {
    if (refusal) return respond(refusal.status, { success: false, message: refusal.message, error: { code: 'REFUSED' } });
    const key = decodeURIComponent(put[1]!);
    const { visible } = JSON.parse(String(init.body)) as { visible: boolean };
    const next = { ...rows.find((r) => r.key === key)!, visible, updatedAt: SWITCHED };
    rows = rows.map((r) => (r.key === key ? next : r));
    return respond(200, { success: true, message: 'Section visibility updated', data: next });
  }
  return respond(404, { success: false, message: 'Not found', error: { code: 'NOT_FOUND' } });
});
const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
const gets = () => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET');

/* A Website Admin: every home page menu, view and update. */
const EVERY = HOME_PAGE_TABS.flatMap((t) => [`${t.menu}.view`, `${t.menu}.update`]);
const signInAs = (codes: string[]) => {
  auth.permissions = new Set(codes);
};

const renderAt = (tab: HomePageTab) => renderWithProviders(<HomePageView />, { route: `/cms/home-page?tab=${tab}` });
const panel = () => screen.getByRole('tabpanel');
const toggle = () => within(panel()).getByRole('switch', { name: 'Show on website' });
const findToggle = async () => within(panel()).findByRole('switch', { name: 'Show on website' });
const toasts = () => document.getElementById('toast-root')!;

beforeEach(() => {
  signInAs(EVERY);
  /* Every section; the Navigation Menu tab is not one, so the API has no row for it. */
  rows = VISIBILITY_TABS.map((t) => row(t.k));
  refusal = null;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  for (const k of Object.keys(mounts)) delete mounts[k];
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('section visibility API', () => {
  it('lists the sections, and sends one section’s switch as PUT /cms/section-visibility/<key> {visible}', async () => {
    expect(await visibilityService.list()).toEqual(rows);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cms\/section-visibility$/);

    expect(await visibilityService.set('brand-bar', false)).toEqual({ ...row('brand-bar'), visible: false, updatedAt: SWITCHED });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toMatch(/\/cms\/section-visibility\/brand-bar$/);
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ visible: false }) });
  });

  it('needs each section menu’s own update permission to switch it', () => {
    for (const t of VISIBILITY_TABS) expect(ACTION_ACCESS[VISIBILITY_UPDATE_ACTION[t.k]]).toEqual([`${t.menu}.update`]);
  });

  it('counts every Home Page Management tab as a section except the Navigation Menu', () => {
    expect(HOME_PAGE_TABS.filter((t) => !isVisibilitySection(t.k)).map((t) => t.k)).toEqual(['nav-menu']);
    expect(VISIBILITY_TABS.map((t) => t.k)).toEqual(HOME_PAGE_TABS.map((t) => t.k).filter((k) => k !== 'nav-menu'));
  });
});

describe('the "Show on website" bar of Home Page Management', () => {
  it('sits above every tab’s own content, and the list is loaded once for the page', async () => {
    renderAt('top-bar');

    for (const { k, l } of VISIBILITY_TABS) {
      await userEvent.click(screen.getByRole('tab', { name: l }));
      const content = await within(panel()).findByText(`${k} content`);
      const control = await findToggle();
      expect(control).toBeChecked();
      expect(control).toBeEnabled();
      expect(control).toHaveClass('switch', 'on');
      expect(within(panel()).getByText('Shown on the website')).toBeInTheDocument();
      expect(within(panel()).getByText(/Switch it off to hide it from the public website/)).toBeInTheDocument();
      expect(control.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(gets()).toHaveLength(1);
    /* Nothing is hidden, so no tab is marked. */
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  }, 15_000);

  it.each(VISIBILITY_TABS.map((t) => [t.l, t.k] as const))(
    '%s: hiding asks first with what goes with it, then shows again without asking',
    async (label, key) => {
      renderAt(key);
      await userEvent.click(await findToggle());

      /* Hiding asks first, naming the section and what else goes with it. */
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent(`Hide ${label} from the website?`);
      expect(dialog).toHaveTextContent('Nothing is deleted');
      const consequence = HIDE_CONSEQUENCE[key];
      if (consequence) expect(dialog).toHaveTextContent(consequence);
      expect(puts()).toHaveLength(0);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));

      await waitFor(() => expect(toasts()).toHaveTextContent(`${label} is now hidden on the website`));
      expect(puts()).toHaveLength(1);
      const [url, init] = puts()[0]!;
      expect(url).toMatch(new RegExp(`/cms/section-visibility/${key}$`));
      expect(JSON.parse(String(init!.body))).toEqual({ visible: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      expect(toggle()).not.toBeChecked();
      expect(within(panel()).getByText('Hidden from the website')).toBeInTheDocument();
      if (consequence) expect(within(panel()).getByText(consequence)).toBeInTheDocument();
      /* The tab strip marks it, and the tab is still named sensibly for a screen reader. */
      const tab = screen.getByRole('tab', { name: `${label} (hidden from the website)` });
      expect(within(tab).getByText('Hidden')).toHaveClass('tab-pill');
      /*
       * The tab's own content is remounted, so it reloads what the switch changed — except About AMRUT's, whose inline
       * editors would lose their unsaved edits: it stays mounted and is handed the switch's result instead.
       */
      const keepsDrafts = key === 'about';
      expect(mounts[key]).toBe(keepsDrafts ? 1 : 2);
      if (keepsDrafts) expect(within(panel()).getByTestId('switched')).toHaveTextContent(`false at ${SWITCHED}`);
      else expect(within(panel()).queryByTestId('switched')).not.toBeInTheDocument();

      /* Showing again needs no confirmation. */
      await userEvent.click(toggle());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(toasts()).toHaveTextContent(`${label} is now shown on the website`));
      expect(JSON.parse(String(puts()[1]![1]!.body))).toEqual({ visible: true });
      expect(toggle()).toBeChecked();
      expect(screen.getByRole('tab', { name: label })).not.toHaveTextContent('Hidden');
      expect(mounts[key]).toBe(keepsDrafts ? 1 : 3);
      if (keepsDrafts) expect(within(panel()).getByTestId('switched')).toHaveTextContent(`true at ${SWITCHED}`);
      expect(gets()).toHaveLength(1);
    },
  );

  it('leaves the section shown when the confirmation is cancelled', async () => {
    renderAt('impact');
    await userEvent.click(await findToggle());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    expect(toggle()).toBeChecked();
    expect(mounts.impact).toBe(1);
  });

  it('marks the hidden sections in the tab strip from the start, and says what their hiding takes along', async () => {
    rows = rows.map((r) => (r.key === 'ecosystem' || r.key === 'board' ? { ...r, visible: false } : r));
    renderAt('board');

    expect(await screen.findByRole('tab', { name: 'Leadership & Governing Board (hidden from the website)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'The AMRUT Ecosystem (hidden from the website)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AMRUT Schemes' })).toBeInTheDocument();
    expect(screen.getAllByText('Hidden', { selector: '.tab-pill' })).toHaveLength(2);
    /* The strip itself keeps its name. */
    expect(screen.getByRole('tablist', { name: 'Home page sections' })).toBeInTheDocument();

    expect(await findToggle()).not.toBeChecked();
    expect(within(panel()).getByText('Hidden on the home page and on the About page.')).toBeInTheDocument();
    expect(within(panel()).getByText(/Visitors do not see this section/)).toBeInTheDocument();
    expect(panel().querySelector('.vis-bar')).toHaveClass('off');
  });

  describe('the glance card while the banner is hidden', () => {
    const NOTE = 'The card is switched on, but visitors do not see it while the banner is hidden.';

    it('says the card is not shown, keeps its own switch on, and marks its tab Hidden', async () => {
      rows = rows.map((r) => (r.key === 'hero' ? { ...r, visible: false } : r));
      renderAt('glance');

      /* The switch is still the card's own flag… */
      expect(await findToggle()).toBeChecked();
      /* …but nothing claims the website shows it. */
      expect(within(panel()).getByText('Not shown: the banner is hidden')).toHaveClass('vis-bar-state');
      expect(within(panel()).queryByText('Shown on the website')).not.toBeInTheDocument();
      expect(within(panel()).getByText(NOTE)).toBeInTheDocument();
      expect(within(panel()).queryByText(/Visitors see this section/)).not.toBeInTheDocument();
      expect(panel().querySelector('.vis-bar')).toHaveClass('off');
      /* Both the banner's tab and the card's are marked. */
      expect(screen.getByRole('tab', { name: 'AMRUT Kalash – apply online (hidden from the website)' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Programme at a glance (hidden from the website)' })).toBeInTheDocument();
      expect(screen.getAllByText('Hidden', { selector: '.tab-pill' })).toHaveLength(2);
    });

    it('follows the banner’s switch: hiding the banner marks the card, showing it again clears the mark', async () => {
      renderAt('hero');
      await userEvent.click(await findToggle());
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
      expect(await screen.findByRole('tab', { name: 'Programme at a glance (hidden from the website)' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: /^Programme at a glance/ }));
      expect(await findToggle()).toBeChecked();
      expect(within(panel()).getByText('Not shown: the banner is hidden')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: /^AMRUT Kalash – apply online/ }));
      await userEvent.click(await findToggle());
      await waitFor(() => expect(screen.getByRole('tab', { name: 'Programme at a glance' })).not.toHaveTextContent('Hidden'));
      await userEvent.click(screen.getByRole('tab', { name: 'Programme at a glance' }));
      expect(await within(panel()).findByText('Shown on the website')).toBeInTheDocument();
      expect(within(panel()).queryByText(NOTE)).not.toBeInTheDocument();
    });

    it('says so to a view-only user too, instead of a Shown badge', async () => {
      signInAs(['cms-hero.view']);
      rows = [row('hero', { visible: false }), row('glance')];
      renderAt('glance');

      expect(await within(panel()).findByText('Not shown', { selector: '.badge' })).toBeInTheDocument();
      expect(within(panel()).queryByText('Shown', { selector: '.badge' })).not.toBeInTheDocument();
      expect(within(panel()).getByText('Changing this needs the update permission of this section.')).toBeInTheDocument();
      expect(within(panel()).getByText(NOTE)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Programme at a glance (hidden from the website)' })).toBeInTheDocument();
    });

    it('says only that the card is hidden when its own switch is off', async () => {
      rows = rows.map((r) => (r.key === 'hero' || r.key === 'glance' ? { ...r, visible: false } : r));
      renderAt('glance');

      expect(await findToggle()).not.toBeChecked();
      expect(within(panel()).getByText('Hidden from the website')).toBeInTheDocument();
      expect(within(panel()).queryByText(NOTE)).not.toBeInTheDocument();
      expect(within(panel()).getByText(HIDE_CONSEQUENCE.glance!)).toBeInTheDocument();
    });
  });

  describe('permissions', () => {
    it('gives a view-only user a Shown / Hidden badge instead of the switch', async () => {
      signInAs(['cms-impact.view', 'cms-schemes.view']);
      rows = [row('impact'), row('schemes', { visible: false })];
      renderAt('impact');

      expect(await within(panel()).findByText('Shown', { selector: '.badge' })).toBeInTheDocument();
      expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();
      expect(within(panel()).getByText('Changing this needs the update permission of this section.')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: 'AMRUT Schemes (hidden from the website)' }));
      expect(await within(panel()).findByText('Hidden', { selector: '.badge' })).toBeInTheDocument();
      expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();
      expect(puts()).toHaveLength(0);
    });

    it('checks the update permission of each tab’s own menu', async () => {
      /* May update the Diploma, but only view the hero: the hero's two tabs are read-only. */
      signInAs(['cms-hero.view', 'cms-highlight.view', 'cms-highlight.update']);
      rows = [row('hero'), row('glance'), row('diploma')];
      renderAt('hero');

      expect(await within(panel()).findByText('Shown', { selector: '.badge' })).toBeInTheDocument();
      expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('tab', { name: 'Programme at a glance' }));
      expect(await within(panel()).findByText('Shown', { selector: '.badge' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('tab', { name: 'Skill Development Diploma' }));
      expect(await findToggle()).toBeEnabled();
    });
  });

  it('cannot switch a section that has not been set up yet', async () => {
    rows = rows.map((r) => (r.key === 'brand-bar' ? { ...r, configured: false, updatedAt: null } : r));
    const { unmount } = renderAt('brand-bar');

    expect(await findToggle()).toBeDisabled();
    expect(within(panel()).getByText(/Set this section up first/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Brand Bar' })).toBeInTheDocument();
    unmount();

    /* Nor does a view-only user get a badge claiming a state. */
    signInAs(['cms-brandbar.view']);
    renderAt('brand-bar');
    expect(await within(panel()).findByText(/Set this section up first/)).toBeInTheDocument();
    expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(panel()).queryByText('Shown', { selector: '.badge' })).not.toBeInTheDocument();
  });

  it.each([
    [409, 'This section has changed since you opened it. Reload and try again.', 'This section has changed since you opened it.'],
    [404, 'This section has not been configured yet. Run the database seed to create it.', 'This section has not been configured yet.'],
    [403, 'You do not have permission to do this', 'Not permitted: You do not have permission to do this'],
  ])('shows a %i as the server sent it, and leaves the switch as it was', async (status, message, shown) => {
    refusal = { status, message };
    renderAt('schemes');
    await userEvent.click(await findToggle());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));

    await waitFor(() => expect(toasts()).toHaveTextContent(shown));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle()).toBeChecked();
    expect(within(panel()).getByText('Shown on the website')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AMRUT Schemes' })).toBeInTheDocument();
    expect(mounts.schemes).toBe(1);
  });

  it('says when the list could not be loaded, keeps the tab’s content, and retries', async () => {
    /* Only the first load fails; the retry reaches the backend as usual. */
    fetchMock.mockImplementationOnce(async () => respond(500, { success: false, message: 'Server error', error: { code: 'ERROR' } }));
    renderAt('about');

    expect(await within(panel()).findByText(/Could not load whether this section is shown: Server error/)).toBeInTheDocument();
    expect(within(panel()).getByText('about content')).toBeInTheDocument();
    expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();

    await userEvent.click(within(panel()).getByRole('button', { name: 'Retry' }));
    expect(await findToggle()).toBeChecked();
  });

  describe('the Navigation Menu tab', () => {
    /* Not a section: its menu items each have a switch of their own, on the tab (features/cms/navmenu). */
    it('has no bar above its content, and the strip never marks it', async () => {
      renderAt('nav-menu');

      expect(await within(panel()).findByText('nav-menu content')).toBeInTheDocument();
      await waitFor(() => expect(gets()).toHaveLength(1));
      expect(panel().querySelector('.vis-bar')).toBeNull();
      expect(within(panel()).queryByText('Show on website')).not.toBeInTheDocument();
      expect(within(panel()).queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Navigation Menu' })).toBeInTheDocument();
      /* The other tabs keep theirs. */
      await userEvent.click(screen.getByRole('tab', { name: 'Brand Bar' }));
      expect(await findToggle()).toBeChecked();
    });

    it('shows no loading or error line while the sections’ list is loading or has failed', async () => {
      fetchMock.mockImplementationOnce(async () => respond(500, { success: false, message: 'Server error', error: { code: 'ERROR' } }));
      renderAt('nav-menu');

      expect(await within(panel()).findByText('nav-menu content')).toBeInTheDocument();
      await waitFor(() => expect(gets()).toHaveLength(1));
      expect(within(panel()).queryByText(/Could not load whether this section is shown/)).not.toBeInTheDocument();
      expect(panel().querySelector('.vis-bar, .skel')).toBeNull();
    });
  });
});

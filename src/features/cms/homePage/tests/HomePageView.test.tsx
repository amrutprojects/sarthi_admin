import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchPath, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { AppRoutes } from '../../../../app/router';
import {
  ADMIN_ROUTES,
  HOME_PAGE_MENU,
  HOME_PAGE_TABS,
  homePageTabPath,
  sidebarKey,
  type HomePageTab,
} from '../../../../constants/navigation';
import { WEBSITE_MENUS, type Portal } from '../../../../modules/auth/permissions';
import { ApiError } from '../../../../services/api-client';
import { aboutService, toItem } from '../../about/services/aboutService';
import type * as AboutServiceModule from '../../about/services/aboutService';
import { announcementsService } from '../../announcements/services/announcementsService';
import { boardService } from '../../board/services/boardService';
import { brandBarService } from '../../brandbar/services/brandBarService';
import { ecosystemService } from '../../ecosystem/services/ecosystemService';
import { heroService } from '../../hero/services/heroService';
import { highlightService } from '../../highlight/services/highlightService';
import { impactService } from '../../impact/services/impactService';
import { NAV_MENU_ITEMS } from '../../navmenu/constants';
import { navMenuService } from '../../navmenu/services/navMenuService';
import { schemesService } from '../../schemes/services/schemesService';
import { fmtDateTime } from '../../shared';
import { topBarService } from '../../topbar/services/topBarService';
import { VISIBILITY_TABS } from '../../visibility/constants';
import { visibilityService } from '../../visibility/visibilityService';
import type { SectionVisibility } from '../../visibility/visibility.types';
/* Loaded up front, so the router's lazy import of the page resolves at once. */
import HomePageView from '../pages/HomePageView';

/* The signed-in user, as AuthProvider would expose it; switched per test. */
const auth = vi.hoisted(() => ({
  permissions: new Set<string>(),
  hiddenMenus: new Set<string>(),
  portal: 'admin' as 'admin' | 'website',
}));
vi.mock('../../../../modules/auth/auth-context', () => ({ useAuth: () => auth }));
/* The real routes, without the sidebar and top bar around them. */
vi.mock('../../../../layouts/AdminLayout', async () => {
  const { createElement } = await import('react');
  const { Outlet } = await import('react-router-dom');
  return { default: () => createElement(Outlet) };
});

/* Every section's API, so each tab loads its own data without a server. Hoisted: the vi.mock factories below use it. */
const listService = vi.hoisted(() => () => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  getSection: vi.fn(),
  updateSection: vi.fn(),
}));
/* The Top Bar's API has the same shape, but its singleton is called settings. */
const topBarApi = vi.hoisted(() => () => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock('../../topbar/services/topBarService', () => ({ topBarService: topBarApi() }));
vi.mock('../../brandbar/services/brandBarService', () => ({ brandBarService: { get: vi.fn(), update: vi.fn() } }));
vi.mock('../../navmenu/services/navMenuService', () => ({ navMenuService: { list: vi.fn(), set: vi.fn() } }));
vi.mock('../../announcements/services/announcementsService', () => ({ announcementsService: listService() }));
vi.mock('../../hero/services/heroService', () => ({ heroService: { get: vi.fn(), update: vi.fn() } }));
vi.mock('../../highlight/services/highlightService', () => ({ highlightService: { get: vi.fn(), update: vi.fn() } }));
/* Each tab's "Show on website" switch (features/cms/visibility has its own tests). */
vi.mock('../../visibility/visibilityService', () => ({ visibilityService: { list: vi.fn(), set: vi.fn() } }));
vi.mock('../../board/services/boardService', () => ({
  photoSrc: (url: string | null) => (url ? `/api/v1${url}` : null),
  boardService: listService(),
}));
vi.mock('../../impact/services/impactService', () => ({ impactService: listService() }));
vi.mock('../../ecosystem/services/ecosystemService', () => ({ ecosystemService: listService() }));
vi.mock('../../schemes/services/schemesService', () => ({ schemesService: listService() }));
vi.mock('../../about/services/aboutService', async (importOriginal) => {
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

const pair = (mr: string, en: string) => ({ mr, en });
const BLANK = pair('', '');
const T = { createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' };

/* One record per section, each with a line of text that only its own tab shows. */
const topBarLink = {
  id: 'tb1',
  label: pair('प्रमाणपत्र पडताळणी', 'Verify Certificate'),
  link: '/verify',
  displayOrder: 1,
  isActive: true,
  ...T,
};
const topBarSettings = { id: 'ts', governmentName: pair('महाराष्ट्र शासन', 'Government of Maharashtra'), showLanguageToggle: true, ...T };
const brandBar = {
  id: 'bb',
  title: 'AMRUT KALASH',
  fullName: pair('अमृत - महाराष्ट्र संशोधन, उन्नती व प्रशिक्षण प्रबोधिनी', 'Academy of Maharashtra Research, Upliftment and Training'),
  partnerLabel: pair('अंमलबजावणी भागीदार', 'Implementation Partner'),
  partnerName: 'SUMAGO INFOTECH PVT LTD',
  showPartner: true,
  ...T,
};
const announcement = {
  id: 'an1',
  title: pair('सूचना शीर्षक', 'Announcement title'),
  detail: null,
  link: null,
  displayOrder: 1,
  isActive: true,
  ...T,
};
const announcementsSection = { id: 'as', label: pair('सूचना', 'Announcements'), showSection: true, ...T };
const hero = () => ({
  id: 'h1',
  readMoreLabel: pair('अधिक जाणून घ्या', 'Learn more'),
  checkStatusLabel: pair('अर्जाची स्थिती पहा', 'Check Application Status'),
  slides: [
    {
      id: 's1',
      tag: pair('टॅग', 'Hero tag'),
      title: pair('शीर्षक', 'Hero slide heading'),
      description: pair('वर्णन', 'Hero slide text'),
      ctaLabel: pair('अर्ज करा', 'Apply now'),
      ctaLink: '/apply',
      displayOrder: 0,
      isActive: true,
    },
  ],
  isPublished: true,
  glance: { totalHours: 480, modules: 4, domains: 10, districtCount: 36, modulesLabel: '4 × 120 hours', hiddenModules: 0 },
  ...T,
});
const highlight = () => ({
  id: 'p1',
  heading: pair('कौशल्य विकास पदविका', 'Diploma band heading'),
  subheading: pair('उपशीर्षक', 'Diploma subheading'),
  tagline: pair('टॅगलाइन', 'Diploma tagline'),
  certification: pair('प्रमाणपत्र', 'Diploma certificate'),
  objectives: [],
  isPublished: true,
  hiddenRows: [],
  rowLabels: {},
  ...T,
});
const member = {
  id: '00000000-0000-4000-8000-000000000001',
  name: pair('मंडळ सदस्य', 'Board Member One'),
  category: pair('गट', 'Group'),
  designation: pair('पद', 'Chair'),
  description: BLANK,
  subtitle: BLANK,
  photoUrl: null,
  displayOrder: 1,
  isActive: true,
  ...T,
};
const boardSection = {
  id: 'b1',
  heading: pair('मंडळ', 'Board heading'),
  subtitle: pair('उपशीर्षक', 'Board subtitle'),
  noticeTitle: pair('सूचना', 'Notice'),
  noticeBody: pair('सूचना मजकूर', 'Notice text'),
  showNotice: true,
  ...T,
};
const stat = { id: 'i1', value: '6+', label: pair('जिल्हे', 'Impact districts'), displayOrder: 1, isActive: true, ...T };
const impactSection = { id: 'is', heading: pair('प्रभाव', 'Impact heading'), showSection: true, ...T };
const programme = {
  id: 'e1',
  name: pair('कार्यक्रम', 'Ecosystem programme'),
  description: pair('वर्णन', 'Ecosystem text'),
  icon: 'teacher',
  link: '/programme',
  linkLabel: BLANK,
  displayOrder: 1,
  isActive: true,
  ...T,
};
const ecosystemSection = {
  id: 'es',
  heading: pair('अमृत प्रणाली', 'Ecosystem heading'),
  subtitle: BLANK,
  linkLabel: pair('अधिक', 'More'),
  showSection: true,
  ...T,
};
const scheme = {
  id: 'sc1',
  title: pair('योजना', 'Scheme title'),
  description: pair('वर्णन', 'Scheme text'),
  badge: BLANK,
  deadline: null,
  link: null,
  buttonLabel: BLANK,
  featured: false,
  displayOrder: 1,
  isActive: true,
  ...T,
};
const schemesSection = {
  id: 'ss',
  heading: pair('योजना', 'Schemes heading'),
  subtitle: BLANK,
  buttonLabel: pair('अधिक', 'Learn more'),
  showSection: true,
  ...T,
};
const about = () => ({
  section: {
    id: 'a1',
    heading: pair('अमृत विषयी माहिती', 'About heading'),
    subtitle: BLANK,
    description: pair('वर्णन', 'About description'),
    showSection: true,
    ...T,
  },
  facts: [],
  cards: [],
});

const HOME_PAGE_MENUS = [
  'cms-topbar',
  'cms-brandbar',
  'cms-navmenu',
  'cms-announcements',
  'cms-hero',
  'cms-highlight',
  'cms-board',
  'cms-impact',
  'cms-ecosystem',
  'cms-schemes',
  'cms-about',
];
const LABELS = [
  'Top Bar',
  'Brand Bar',
  'Navigation Menu',
  'Announcements',
  'AMRUT Kalash – apply online',
  'Programme at a glance',
  'Skill Development Diploma',
  'Leadership & Governing Board',
  "AMRUT's Impact",
  'The AMRUT Ecosystem',
  'AMRUT Schemes',
  'About AMRUT',
];
/* The text each tab shows once its section has loaded. */
const CONTENT: Record<string, string> = {
  'Top Bar': 'Verify Certificate',
  'Brand Bar': 'Brand bar preview',
  'Navigation Menu': '10 of 10 shown in the menu',
  Announcements: 'Announcement title',
  'AMRUT Kalash – apply online': 'Hero slide heading',
  'Programme at a glance': '36 (entered)',
  'Skill Development Diploma': 'Diploma band heading',
  'Leadership & Governing Board': 'Board Member One',
  "AMRUT's Impact": 'Impact districts',
  'The AMRUT Ecosystem': 'Ecosystem programme',
  'AMRUT Schemes': 'Scheme title',
  'About AMRUT': '1. Section settings',
};

const signInAs = (codes: string[], { portal = 'admin', hidden = [] }: { portal?: Portal; hidden?: string[] } = {}) => {
  auth.permissions = new Set(codes);
  auth.hiddenMenus = new Set(hidden);
  auth.portal = portal;
};
/* A Website Admin: every CMS menu, view and update. */
const WEBSITE = WEBSITE_MENUS.flatMap((m) => [`${m}.view`, `${m}.update`]);

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}
const renderApp = (route: string) =>
  renderWithProviders(
    <>
      <AppRoutes />
      <Location />
    </>,
    { route },
  );

const tabLabels = () => screen.getAllByRole('tab').map((t) => t.textContent);
const openTab = async () => (await screen.findByRole('tab', { selected: true }, { timeout: 5000 })).textContent;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);

beforeEach(() => {
  signInAs(WEBSITE, { portal: 'website' });
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.mocked(topBarService.list).mockResolvedValue([topBarLink]);
  vi.mocked(topBarService.getSettings).mockResolvedValue(topBarSettings);
  vi.mocked(brandBarService.get).mockResolvedValue(brandBar);
  vi.mocked(navMenuService.list).mockResolvedValue(NAV_MENU_ITEMS.map((i) => ({ key: i.key, show: true, label: null, updatedAt: null })));
  vi.mocked(announcementsService.list).mockResolvedValue([announcement]);
  vi.mocked(announcementsService.getSection).mockResolvedValue(announcementsSection);
  vi.mocked(heroService.get).mockResolvedValue(hero());
  vi.mocked(highlightService.get).mockResolvedValue(highlight());
  vi.mocked(boardService.list).mockResolvedValue([member]);
  vi.mocked(boardService.getSection).mockResolvedValue(boardSection);
  vi.mocked(boardService.updateSection).mockResolvedValue(boardSection);
  vi.mocked(impactService.list).mockResolvedValue([stat]);
  vi.mocked(impactService.getSection).mockResolvedValue(impactSection);
  vi.mocked(ecosystemService.list).mockResolvedValue([programme]);
  vi.mocked(ecosystemService.getSection).mockResolvedValue(ecosystemSection);
  vi.mocked(schemesService.list).mockResolvedValue([scheme]);
  vi.mocked(schemesService.getSection).mockResolvedValue(schemesSection);
  vi.mocked(aboutService.get).mockResolvedValue(about());
  /* Every section shown on the website, as the API lists them for a Website Admin (the Navigation Menu is not a section). */
  vi.mocked(visibilityService.list).mockResolvedValue(
    VISIBILITY_TABS.map((t): SectionVisibility => ({ key: t.k, menu: t.menu, visible: true, configured: true, updatedAt: T.updatedAt })),
  );
});

describe('Home Page Management', () => {
  it('shows a Website Admin every section of the home page as a tab, in home page order, opening on the first', async () => {
    renderApp('/cms/home-page');

    expect(await screen.findByRole('heading', { name: 'Home Page Management' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Every section of the public home page, in Marathi and English.')).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management']);
    expect(tabLabels()).toEqual(LABELS);
    expect(HOME_PAGE_TABS.map((t) => t.l)).toEqual(LABELS);
    /* The same tab strip as Programme Page Management, inside the larger-text sections wrapper. */
    const strip = screen.getByRole('tablist', { name: 'Home page sections' });
    expect(strip).toHaveClass('tabs', 'tabs-fit');
    expect(strip.closest('.cms-sections')).not.toBeNull();
    /* The top bar comes first: it is the strip at the very top of every page of the website. */
    expect(await openTab()).toBe('Top Bar');
    expect(screen.getByRole('tab', { name: 'Top Bar' })).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(await screen.findByText('Verify Certificate')).toBeInTheDocument();
    /* Only the open tab loads its section. */
    expect(brandBarService.get).not.toHaveBeenCalled();
    expect(navMenuService.list).not.toHaveBeenCalled();
    expect(announcementsService.list).not.toHaveBeenCalled();
    expect(heroService.get).not.toHaveBeenCalled();
    expect(boardService.list).not.toHaveBeenCalled();
    expect(aboutService.get).not.toHaveBeenCalled();
  });

  it('opens each tab’s own section, with its own buttons, and keeps the open tab in the URL', async () => {
    renderApp('/cms/home-page');
    await openTab();

    for (const label of LABELS) {
      await userEvent.click(screen.getByRole('tab', { name: label }));
      expect(await openTab()).toBe(label);
      const panel = screen.getByRole('tabpanel');
      const content = await within(panel).findByText(CONTENT[label]!);
      expect(currentPath()).toBe(`/cms/home-page?tab=${HOME_PAGE_TABS.find((t) => t.l === label)!.k}`);
      if (label === 'Navigation Menu') {
        /* Not a section: no "Show on website" bar, only a switch per menu item. */
        expect(within(panel).queryByRole('switch', { name: 'Show on website' })).not.toBeInTheDocument();
        expect(panel.querySelector('.vis-bar')).toBeNull();
        expect(within(panel).getAllByRole('switch')).toHaveLength(NAV_MENU_ITEMS.length);
        continue;
      }
      /* Its section's one "Show on website" switch, above the tab's own content. */
      const toggle = await within(panel).findByRole('switch', { name: 'Show on website' });
      expect(toggle).toBeChecked();
      expect(toggle.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      /* And no second switch of the tab's own: the Hero and Diploma Publish buttons are gone. */
      expect(within(panel).queryByRole('button', { name: /^(Publish|Unpublish)$/ })).not.toBeInTheDocument();
    }
    /* The list behind the switches is loaded once for the page, not per tab. */
    expect(visibilityService.list).toHaveBeenCalledTimes(1);
    /* The section actions a Website Admin's update rights allow, in the tab's own head. */
    await userEvent.click(screen.getByRole('tab', { name: 'Skill Development Diploma' }));
    expect(await within(screen.getByRole('tabpanel')).findByRole('button', { name: 'Edit content' })).toBeInTheDocument();
    /* Opens every one of the twelve tabs in turn, so it needs more than the default 5 s on a busy run. */
  }, 15_000);

  it('opens the tab named in ?tab=', async () => {
    renderApp('/cms/home-page?tab=impact');

    expect(await openTab()).toBe("AMRUT's Impact");
    expect(await screen.findByText('Impact districts')).toBeInTheDocument();
    expect(heroService.get).not.toHaveBeenCalled();
  });

  it('shows only the tabs whose section the user may view, and opens the first of them', async () => {
    signInAs(['cms-board.view', 'cms-about.view', 'cms-hero.update']);
    const { unmount } = renderApp('/cms/home-page');

    expect(await openTab()).toBe('Leadership & Governing Board');
    expect(tabLabels()).toEqual(['Leadership & Governing Board', 'About AMRUT']);
    expect(await screen.findByText('Board Member One')).toBeInTheDocument();
    /* A view-only administrator gets no Add button, and a Shown badge instead of the "Show on website" switch. */
    expect(screen.queryByRole('button', { name: /Add Member/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).queryByRole('switch', { name: 'Show on website' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).getByText('Shown', { selector: '.vis-bar .badge' })).toBeInTheDocument();
    unmount();

    /* A link to a tab the user may not open, or to no tab at all, opens the first one they may. */
    for (const tab of ['hero', 'glance', 'nonsense']) {
      const view = renderApp(`/cms/home-page?tab=${tab}`);
      expect(await openTab()).toBe('Leadership & Governing Board');
      view.unmount();
    }
    expect(heroService.get).not.toHaveBeenCalled();
  });

  it('hides the tabs of the menus that Menu Visibility hides', async () => {
    signInAs(
      HOME_PAGE_MENUS.map((m) => `${m}.view`),
      { hidden: ['cms-topbar', 'cms-brandbar', 'cms-navmenu', 'cms-announcements', 'cms-hero', 'cms-schemes'] },
    );
    renderApp('/cms/home-page');

    expect(await openTab()).toBe('Skill Development Diploma');
    expect(tabLabels()).toEqual(
      LABELS.filter(
        (l) =>
          ![
            'Top Bar',
            'Brand Bar',
            'Navigation Menu',
            'Announcements',
            'AMRUT Kalash – apply online',
            'Programme at a glance',
            'AMRUT Schemes',
          ].includes(l),
      ),
    );
    expect(topBarService.list).not.toHaveBeenCalled();
    expect(brandBarService.get).not.toHaveBeenCalled();
    expect(navMenuService.list).not.toHaveBeenCalled();
    expect(announcementsService.list).not.toHaveBeenCalled();
  });

  it('applies the same rules in the website portal', async () => {
    signInAs(['cms-impact.view', 'cms-faqs.view'], { portal: 'website' });
    renderApp('/cms/home-page?tab=board');

    expect(await openTab()).toBe("AMRUT's Impact");
    expect(tabLabels()).toEqual(["AMRUT's Impact"]);
  });

  it('is not open to a user who may view none of the sections', async () => {
    signInAs(['cms-faqs.view', 'cms-programme.view']);
    renderApp('/cms/home-page');

    expect(await screen.findByText("You don't have access to this screen", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('opens each section’s former page as its tab', async () => {
    const moved: [string, string][] = [
      ['/cms/top-bar', 'Top Bar'],
      ['/cms/brand-bar', 'Brand Bar'],
      ['/cms/nav-menu', 'Navigation Menu'],
      ['/cms/announcements', 'Announcements'],
      ['/cms/hero', 'AMRUT Kalash – apply online'],
      ['/cms/highlight', 'Skill Development Diploma'],
      ['/cms/board-members', 'Leadership & Governing Board'],
      ['/cms/impact', "AMRUT's Impact"],
      ['/cms/amrut-ecosystem', 'The AMRUT Ecosystem'],
      ['/cms/amrut-schemes', 'AMRUT Schemes'],
      ['/cms/about-amrut', 'About AMRUT'],
    ];
    for (const [path, label] of moved) {
      const { unmount } = renderApp(path);
      expect(await openTab()).toBe(label);
      expect(currentPath()).toBe(`/cms/home-page?tab=${HOME_PAGE_TABS.find((t) => t.l === label)!.k}`);
      unmount();
    }
  });
});

describe('a home page section’s own pages', () => {
  /* [page, its last crumb, the button that leaves it, the tab it returns to] */
  const pages: [string, string, string, string][] = [
    ['/cms/top-bar/create', 'Add link', 'Back', 'Top Bar'],
    ['/cms/top-bar/settings', 'Top bar settings', 'Cancel', 'Top Bar'],
    ['/cms/brand-bar/edit', 'Edit', 'Cancel', 'Brand Bar'],
    ['/cms/announcements/create', 'Add announcement', 'Back', 'Announcements'],
    ['/cms/announcements/settings', 'Ticker settings', 'Cancel', 'Announcements'],
    ['/cms/highlight/edit', 'Edit', 'Back', 'Skill Development Diploma'],
    ['/cms/board-members/settings', 'Section settings', 'Back', 'Leadership & Governing Board'],
    ['/cms/board-members/create', 'Add Member', 'Cancel', 'Leadership & Governing Board'],
    ['/cms/impact/create', 'Add New Statistic', 'Back', "AMRUT's Impact"],
    ['/cms/amrut-ecosystem/settings', 'Section settings', 'Cancel', 'The AMRUT Ecosystem'],
    ['/cms/amrut-schemes/create', 'Add New Scheme', 'Back', 'AMRUT Schemes'],
    ['/cms/about-amrut/facts/create', 'Add New Information Row', 'Back', 'About AMRUT'],
  ];

  it.each(pages)('%s sits under its tab in the breadcrumb, and %s… returns to that tab', async (path, crumb, button, tab) => {
    signInAs(WEBSITE.concat(WEBSITE_MENUS.flatMap((m) => [`${m}.create`, `${m}.delete`])), { portal: 'website' });
    renderApp(path);

    await waitFor(() => expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', tab, crumb]), { timeout: 5000 });
    await userEvent.click(await screen.findByRole('button', { name: button }, { timeout: 5000 }));

    expect(await openTab()).toBe(tab);
    expect(currentPath()).toBe(`/cms/home-page?tab=${HOME_PAGE_TABS.find((t) => t.l === tab)!.k}`);
  });

  it('returns to its tab after a save', async () => {
    renderApp('/cms/board-members/settings');

    await userEvent.click(await screen.findByRole('button', { name: 'Save settings' }, { timeout: 5000 }));
    await waitFor(() => expect(boardService.updateSection).toHaveBeenCalledTimes(1));
    expect(await openTab()).toBe('Leadership & Governing Board');
  });

  it('links its breadcrumb back to the tab, and to Home Page Management', async () => {
    renderApp('/cms/amrut-schemes/settings');

    await userEvent.click(await screen.findByText('AMRUT Schemes', { selector: '.crumb > a' }, { timeout: 5000 }));
    expect(await openTab()).toBe('AMRUT Schemes');
    expect(currentPath()).toBe('/cms/home-page?tab=schemes');
  });
});

describe('a home page table’s View pages', () => {
  const fact = { id: 'f1', label: pair('मुख्यालय', 'Headquarters'), value: pair('मुंबई', 'Mumbai'), displayOrder: 1, isActive: true, ...T };
  const card = {
    id: 'c1',
    heading: pair('आमचे ध्येय', 'Our Mission'),
    description: pair('वर्णन', 'Mission text'),
    displayOrder: 1,
    isActive: true,
    isRequired: true,
    ...T,
  };

  beforeEach(() => {
    vi.mocked(topBarService.get).mockResolvedValue(topBarLink);
    vi.mocked(announcementsService.get).mockResolvedValue(announcement);
    vi.mocked(boardService.get).mockResolvedValue(member);
    vi.mocked(impactService.get).mockResolvedValue(stat);
    vi.mocked(ecosystemService.get).mockResolvedValue(programme);
    vi.mocked(schemesService.get).mockResolvedValue(scheme);
    vi.mocked(aboutService.get).mockResolvedValue({ ...about(), facts: [fact], cards: [card] });
    vi.mocked(aboutService.getItem).mockImplementation(async (kind) => toItem(kind, kind === 'facts' ? fact : card));
  });

  /* [tab, the row's name on its eye button, the View page it opens, that page's route name] */
  const rows: [HomePageTab, string, string, string][] = [
    ['top-bar', 'Verify Certificate', '/cms/top-bar/tb1/view', 'cmsTopBarView'],
    ['announcements', 'Announcement title', '/cms/announcements/an1/view', 'cmsAnnouncementsView'],
    ['board', 'Board Member One', `/cms/board-members/${member.id}/view`, 'cmsBoardView'],
    ['impact', 'Impact districts', '/cms/impact/i1/view', 'cmsImpactView'],
    ['ecosystem', 'Ecosystem programme', '/cms/amrut-ecosystem/e1/view', 'cmsEcosystemView'],
    ['schemes', 'Scheme title', '/cms/amrut-schemes/sc1/view', 'cmsSchemesView'],
    ['about', 'Headquarters', '/cms/about-amrut/facts/f1/view', 'cmsAboutFactView'],
    ['about', 'Our Mission', '/cms/about-amrut/cards/c1/view', 'cmsAboutCardView'],
  ];

  it.each(rows)('the %s tab’s eye button on %s opens %s, under the tab, and Back returns to it', async (tab, name, path, route) => {
    /* The route the router (and the sidebar's activeKey) picks first; its menu keeps Home Page Management lit. */
    const hit = ADMIN_ROUTES.find(([p]) => matchPath(p, path));
    expect(hit?.[1]).toBe(route);
    expect(sidebarKey(hit![2])).toBe(HOME_PAGE_MENU);

    renderApp(homePageTabPath(tab));
    const label = HOME_PAGE_TABS.find((t) => t.k === tab)!.l;
    expect(await openTab()).toBe(label);
    await userEvent.click(await within(screen.getByRole('tabpanel')).findByRole('button', { name: `View ${name}` }));

    expect(currentPath()).toBe(path);
    await waitFor(() => expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', label, 'View']), { timeout: 5000 });
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await openTab()).toBe(label);
    expect(currentPath()).toBe(homePageTabPath(tab));
  });
});

/* The page itself, rendered directly, as the router mounts it. */
describe('<HomePageView>', () => {
  it('renders one panel per visible tab, each naming its tab', async () => {
    signInAs(['cms-highlight.view', 'cms-impact.view']);
    renderWithProviders(<HomePageView />, { route: '/cms/home-page' });

    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect([...panels].map((p) => p.id)).toEqual(['home-page-panel-diploma', 'home-page-panel-impact']);
    expect(await screen.findByText('Diploma band heading')).toBeInTheDocument();
  });
});

/*
 * About AMRUT edits inline, on the tab itself: its switch must not remount it, which would throw the unsaved edits
 * away, yet its next save has to send the version the switch left, or it is refused as changed since it was opened.
 */
describe('the About AMRUT tab’s "Show on website" switch', () => {
  const SWITCHED = '2026-11-16T10:00:00.000Z';
  const SAVED = '2026-11-16T11:00:00.000Z';
  const CHANGED_ELSEWHERE = 'This section was changed elsewhere — reload to see the latest version.';
  const field = (label: string) => screen.getByLabelText(new RegExp(`^${label} \\(English\\)`));
  /* The section as the server holds it after the switch, which the tab reads again to check its version. */
  const afterSwitch = (changes: Partial<ReturnType<typeof about>['section']> = {}) =>
    vi.mocked(aboutService.get).mockResolvedValue({
      ...about(),
      section: { ...about().section, showSection: false, updatedAt: SWITCHED, ...changes },
    });

  it('keeps the inline editors’ unsaved edits, and their next saves send the newest version', async () => {
    vi.mocked(visibilityService.set).mockResolvedValue({
      key: 'about',
      menu: 'cms-about',
      visible: false,
      configured: true,
      updatedAt: SWITCHED,
    });
    vi.mocked(aboutService.updateSection).mockImplementation(async ({ expectedUpdatedAt: _sent, ...input }) => ({
      ...about().section,
      ...input,
      updatedAt: SAVED,
    }));
    renderApp('/cms/home-page?tab=about');

    await screen.findByLabelText(/^Description \(English\)/, {}, { timeout: 5000 });
    await userEvent.type(field('Description'), ' – draft');
    await userEvent.type(field('Section heading'), '!');
    const description = field('Description');
    /* Nobody else saved the section meanwhile: only the switch changed it. */
    afterSwitch();

    const panel = screen.getByRole('tabpanel');
    await userEvent.click(within(panel).getByRole('switch', { name: 'Show on website' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(within(panel).getByRole('switch', { name: 'Show on website' })).not.toBeChecked());
    expect(visibilityService.set).toHaveBeenCalledWith('about', false);

    /* Not remounted: the same fields, both drafts still there; the section is read again only to take its new version. */
    expect(await within(panel).findByText(`Last saved ${fmtDateTime(SWITCHED)}`)).toBeInTheDocument();
    expect(aboutService.get).toHaveBeenCalledTimes(2);
    expect(within(panel).queryByText(CHANGED_ELSEWHERE)).toBeNull();
    expect(field('Description')).toBe(description);
    expect(description).toHaveValue('About description – draft');
    expect(field('Section heading')).toHaveValue('About heading!');
    expect(within(panel).getAllByText('Unsaved changes')).toHaveLength(2);

    /* The first save sends the version the switch left… */
    await userEvent.click(within(panel).getByRole('button', { name: 'Save description' }));
    await waitFor(() => expect(aboutService.updateSection).toHaveBeenCalledTimes(1));
    expect(aboutService.updateSection).toHaveBeenLastCalledWith({
      description: pair('वर्णन', 'About description – draft'),
      expectedUpdatedAt: SWITCHED,
    });

    /* …and the next one the version that save left, with the other draft still unsaved until then. */
    expect(field('Section heading')).toHaveValue('About heading!');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(aboutService.updateSection).toHaveBeenCalledTimes(2));
    expect(aboutService.updateSection).toHaveBeenLastCalledWith({
      heading: pair('अमृत विषयी माहिती', 'About heading!'),
      subtitle: BLANK,
      expectedUpdatedAt: SAVED,
    });
  });

  it('keeps the old version when the section was saved elsewhere meanwhile, so the next save is refused, not an overwrite', async () => {
    const STALE = 'This was changed after you opened it. Reload to see the latest version, then make your changes again.';
    vi.mocked(visibilityService.set).mockResolvedValue({
      key: 'about',
      menu: 'cms-about',
      visible: false,
      configured: true,
      updatedAt: SWITCHED,
    });
    vi.mocked(aboutService.updateSection).mockRejectedValue(new ApiError(STALE, 409, 'CONFLICT'));
    renderApp('/cms/home-page?tab=about');

    await screen.findByLabelText(/^Description \(English\)/, {}, { timeout: 5000 });
    await userEvent.type(field('Description'), ' – draft');
    const description = field('Description');
    /* Another administrator saved a new description after this tab loaded; the switch's version covers that save. */
    afterSwitch({ description: pair('वर्णन', 'Their description') });

    const panel = screen.getByRole('tabpanel');
    await userEvent.click(within(panel).getByRole('switch', { name: 'Show on website' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));

    expect(await within(panel).findByText(CHANGED_ELSEWHERE)).toBeInTheDocument();
    /* Still not remounted, the draft kept, and the version the one this tab loaded. */
    expect(field('Description')).toBe(description);
    expect(description).toHaveValue('About description – draft');
    expect(within(panel).getByText(`Last saved ${fmtDateTime(T.updatedAt)}`)).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: 'Save description' }));
    await waitFor(() => expect(aboutService.updateSection).toHaveBeenCalledTimes(1));
    expect(aboutService.updateSection).toHaveBeenLastCalledWith({
      description: pair('वर्णन', 'About description – draft'),
      expectedUpdatedAt: T.updatedAt,
    });
    /* Refused as stale, with the draft still there to copy before reloading. */
    await waitFor(() => expect(document.getElementById('toast-root')).toHaveTextContent(STALE));
    expect(description).toHaveValue('About description – draft');
  });

  it('still remounts a tab without inline editors, so it reloads what the switch changed', async () => {
    vi.mocked(visibilityService.set).mockResolvedValue({
      key: 'impact',
      menu: 'cms-impact',
      visible: false,
      configured: true,
      updatedAt: SWITCHED,
    });
    renderApp('/cms/home-page?tab=impact');

    expect(await screen.findByText('Impact districts', {}, { timeout: 5000 })).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    await userEvent.click(await within(panel).findByRole('switch', { name: 'Show on website' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));

    await waitFor(() => expect(impactService.getSection).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Impact districts')).toBeInTheDocument();
  });
});

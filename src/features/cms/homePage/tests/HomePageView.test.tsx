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
import { aboutService, toItem } from '../../about/services/aboutService';
import type * as AboutServiceModule from '../../about/services/aboutService';
import { boardService } from '../../board/services/boardService';
import { ecosystemService } from '../../ecosystem/services/ecosystemService';
import { heroService } from '../../hero/services/heroService';
import { highlightService } from '../../highlight/services/highlightService';
import { impactService } from '../../impact/services/impactService';
import { schemesService } from '../../schemes/services/schemesService';
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
vi.mock('../../hero/services/heroService', () => ({ heroService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));
vi.mock('../../highlight/services/highlightService', () => ({
  highlightService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() },
}));
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
  ...T,
});
const member = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Board Member One',
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

const HOME_PAGE_MENUS = ['cms-hero', 'cms-highlight', 'cms-board', 'cms-impact', 'cms-ecosystem', 'cms-schemes', 'cms-about'];
const LABELS = [
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
    expect(await openTab()).toBe('AMRUT Kalash – apply online');
    expect(screen.getByRole('tab', { name: 'AMRUT Kalash – apply online' })).toHaveAttribute(
      'aria-controls',
      screen.getByRole('tabpanel').id,
    );
    expect(await screen.findByText('Hero slide heading')).toBeInTheDocument();
    /* Only the open tab loads its section. */
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
      expect(await within(panel).findByText(CONTENT[label]!)).toBeInTheDocument();
      expect(currentPath()).toBe(`/cms/home-page?tab=${HOME_PAGE_TABS.find((t) => t.l === label)!.k}`);
    }
    /* The section actions a Website Admin's update rights allow, in the tab's own head. */
    await userEvent.click(screen.getByRole('tab', { name: 'Skill Development Diploma' }));
    expect(await within(screen.getByRole('tabpanel')).findByRole('button', { name: 'Edit content' })).toBeInTheDocument();
  });

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
    /* A view-only administrator gets no Add button. */
    expect(screen.queryByRole('button', { name: /Add Member/ })).not.toBeInTheDocument();
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
      { hidden: ['cms-hero', 'cms-schemes'] },
    );
    renderApp('/cms/home-page');

    expect(await openTab()).toBe('Skill Development Diploma');
    expect(tabLabels()).toEqual(
      LABELS.filter((l) => !['AMRUT Kalash – apply online', 'Programme at a glance', 'AMRUT Schemes'].includes(l)),
    );
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
    vi.mocked(boardService.get).mockResolvedValue(member);
    vi.mocked(impactService.get).mockResolvedValue(stat);
    vi.mocked(ecosystemService.get).mockResolvedValue(programme);
    vi.mocked(schemesService.get).mockResolvedValue(scheme);
    vi.mocked(aboutService.get).mockResolvedValue({ ...about(), facts: [fact], cards: [card] });
    vi.mocked(aboutService.getItem).mockImplementation(async (kind) => toItem(kind, kind === 'facts' ? fact : card));
  });

  /* [tab, the row's name on its eye button, the View page it opens, that page's route name] */
  const rows: [HomePageTab, string, string, string][] = [
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

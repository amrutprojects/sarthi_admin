import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import RequireAccess from '../../../app/routing/RequireAccess';
import { WEBSITE_MENUS, type Portal } from '../../../modules/auth/permissions';
import Sidebar from '../Sidebar';
import Topbar from '../Topbar';

/* The signed-in user, as AuthProvider would expose it. */
const auth = {
  permissions: new Set<string>(),
  hiddenMenus: new Set<string>(),
  portal: 'admin' as Portal,
  user: { id: 'me', name: 'Test User', email: 'me@test.local', roles: [], permissions: [] },
  primaryRole: { id: 'r', name: 'Website Admin', code: 'WEBSITE_ADMIN' },
  logout: vi.fn(),
};
vi.mock('../../../modules/auth/auth-context', () => ({ useAuth: () => auth }));

const WEBSITE = WEBSITE_MENUS.flatMap((m) => [`${m}.view`, `${m}.update`]);
const CMS_LABELS = [
  'Home Page Management',
  'Advisory Committee Management',
  'Programme Page Management',
  'Modules Page Management',
  'Eligibility Page Management',
  'Apply Page Management',
  'FAQ Management',
  'Contact Page Management',
  'Footer Management',
  'Page Banners',
  'State Master',
  'District Master',
  'Taluka Master',
];

/* The menus behind Home Page Management's tabs, the top bar first, then the brand bar, the navigation menu and the announcements ticker. */
const HOME_PAGE_MENUS = [
  'cms-topbar',
  'cms-brandbar',
  'cms-navmenu',
  'cms-announcements',
  'cms-hero',
  'cms-quickactions',
  'cms-livedashboard',
  'cms-highlight',
  'cms-board',
  'cms-impact',
  'cms-ecosystem',
  'cms-schemes',
  'cms-about',
];

const signInAs = (portal: Portal, codes: string[]) => {
  auth.portal = portal;
  auth.permissions = new Set(codes);
  auth.hiddenMenus = new Set();
};
const sidebar = (active = '') => renderWithProviders(<Sidebar active={active} collapsed={false} open={false} onToggle={() => {}} />);
const labels = (container: HTMLElement) => [...container.querySelectorAll('.sb-item .sb-label')].map((l) => l.textContent);
const activeLabel = (container: HTMLElement) => container.querySelector('.sb-item.active .sb-label')?.textContent;

describe('website portal layout', () => {
  beforeEach(() => signInAs('admin', []));

  it('the sidebar shows a Website Admin the CMS menu and nothing else', () => {
    signInAs('website', WEBSITE);
    const { container } = sidebar();
    expect([...container.querySelectorAll('.sb-group')].map((g) => g.textContent)).toEqual(['CMS']);
    expect([...container.querySelectorAll('.sb-item .sb-label')].map((l) => l.textContent)).toEqual(CMS_LABELS);
    expect(screen.getByText('Amrut Kalash Admin')).toBeInTheDocument();
    expect(screen.queryByText('Certificate Verification')).not.toBeInTheDocument();
    expect(screen.queryByText('AMRUT Public Site')).not.toBeInTheDocument();
  });

  it('the sidebar shows only the CMS pages the role grants', () => {
    signInAs('website', ['cms-faqs.view', 'cms-states.view']);
    const { container } = sidebar();
    expect(labels(container)).toEqual(['FAQ Management', 'State Master']);
  });

  it('shows one Home Page Management entry for any one of the twelve home page menus, in its place', () => {
    for (const menu of HOME_PAGE_MENUS) {
      signInAs('website', ['cms-apply.view', `${menu}.view`, 'cms-programme.view']);
      const { container, unmount } = sidebar();
      expect(labels(container)).toEqual(['Home Page Management', 'Programme Page Management', 'Apply Page Management']);
      unmount();
    }
  });

  it('drops Home Page Management when no home page menu opens, or Menu Visibility hides all twelve', () => {
    signInAs('website', ['cms-faqs.view']);
    const { container, unmount } = sidebar();
    expect(labels(container)).not.toContain('Home Page Management');
    unmount();

    signInAs('website', ['cms-faqs.view', ...HOME_PAGE_MENUS.map((m) => `${m}.view`)]);
    auth.hiddenMenus = new Set(HOME_PAGE_MENUS);
    const hidden = sidebar();
    expect(labels(hidden.container)).toEqual(['FAQ Management']);
    hidden.unmount();

    /* One menu left visible keeps the entry. */
    auth.hiddenMenus = new Set(HOME_PAGE_MENUS.slice(1));
    expect(labels(sidebar().container)).toEqual(['Home Page Management', 'FAQ Management']);
  });

  it('marks Home Page Management active on its page and on every home page section’s own pages', () => {
    signInAs('website', WEBSITE);
    for (const active of ['cms-home-page', ...HOME_PAGE_MENUS]) {
      const { container, unmount } = sidebar(active);
      expect(activeLabel(container)).toBe('Home Page Management');
      unmount();
    }
    /* Advisory Committee is an entry of its own, not a home page tab. */
    const advisory = sidebar('cms-advisory');
    expect(activeLabel(advisory.container)).toBe('Advisory Committee Management');
    advisory.unmount();
    const { container } = sidebar('cms-programme');
    expect(activeLabel(container)).toBe('Programme Page Management');
  });

  it('the full panel is unchanged for other roles', () => {
    signInAs('admin', ['dashboard.view', 'cms-faqs.view']);
    sidebar();
    expect(screen.getByText('Amrut Kalash Admin')).toBeInTheDocument();
    expect(screen.getByAltText('AMRUT')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('FAQ Management')).toBeInTheDocument();
    expect(screen.getByText('Certificate Verification')).toBeInTheDocument();
    expect(screen.getByText('AMRUT Public Site')).toBeInTheDocument();
  });

  it('the topbar drops programme alerts and tours for a Website Admin', () => {
    signInAs('website', WEBSITE);
    const { unmount } = renderWithProviders(<Topbar onBurger={() => {}} />);
    expect(screen.queryByTitle('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Help')).not.toBeInTheDocument();
    unmount();

    signInAs('admin', ['dashboard.view']);
    renderWithProviders(<Topbar onBurger={() => {}} />);
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
    expect(screen.getByTitle('Help')).toBeInTheDocument();
  });
});

describe('<RequireAccess> for a Website Admin', () => {
  const app = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<RequireAccess navKey="dashboard">Dashboard page</RequireAccess>} />
        <Route path="/users" element={<RequireAccess navKey="users">Users page</RequireAccess>} />
        <Route path="/cms/contact" element={<RequireAccess navKey="cms-contact">Contact page</RequireAccess>} />
        <Route path="/cms/home-page" element={<RequireAccess navKey="cms-home-page">Home page sections</RequireAccess>} />
      </Routes>,
      { route },
    );

  it('sends every Dashboard link to the first CMS page', async () => {
    signInAs('website', WEBSITE);
    app('/dashboard');
    expect(await screen.findByText('Home page sections')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('starts on Home Page Management when a home page section is the first CMS screen the role opens', async () => {
    signInAs('website', ['cms-board.view', 'cms-states.view']);
    app('/dashboard');
    expect(await screen.findByText('Home page sections')).toBeInTheDocument();
  });

  it('opens Home Page Management with any one home page menu, and shows the notice with none', () => {
    signInAs('website', ['cms-impact.view']);
    const { unmount } = app('/cms/home-page');
    expect(screen.getByText('Home page sections')).toBeInTheDocument();
    unmount();

    signInAs('website', ['cms-faqs.view']);
    app('/cms/home-page');
    expect(screen.queryByText('Home page sections')).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this screen")).toBeInTheDocument();
  });

  it('shows the access notice for any other screen, pointing back to the CMS', () => {
    signInAs('website', [...WEBSITE, 'users.view']);
    app('/users');
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this screen")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Home Page Management' })).toBeInTheDocument();
  });

  it('keeps the Dashboard notice for a programme role that cannot open the screen', () => {
    signInAs('admin', ['dashboard.view']);
    app('/users');
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  });
});

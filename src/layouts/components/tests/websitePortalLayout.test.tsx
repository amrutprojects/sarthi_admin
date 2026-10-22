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
  'Contact Page Management',
  'Footer Management',
  'Modules Page Management',
  'FAQ Management',
  'Eligibility Page Management',
  'Apply Page Management',
  'Home Hero Section',
  'Home Programme Section',
  'AMRUT Impact Management',
  'Programme Page Management',
  'State Master',
  'District Master',
  'Taluka Master',
];

const signInAs = (portal: Portal, codes: string[]) => {
  auth.portal = portal;
  auth.permissions = new Set(codes);
  auth.hiddenMenus = new Set();
};
const sidebar = () => renderWithProviders(<Sidebar active="" collapsed={false} open={false} onToggle={() => {}} />);

describe('website portal layout', () => {
  beforeEach(() => signInAs('admin', []));

  it('the sidebar shows a Website Admin the CMS menu and nothing else', () => {
    signInAs('website', WEBSITE);
    const { container } = sidebar();
    expect([...container.querySelectorAll('.sb-group')].map((g) => g.textContent)).toEqual(['CMS']);
    expect([...container.querySelectorAll('.sb-item .sb-label')].map((l) => l.textContent)).toEqual(CMS_LABELS);
    expect(screen.getByText('Website Admin')).toBeInTheDocument();
    expect(screen.queryByText('Certificate Verification')).not.toBeInTheDocument();
    expect(screen.queryByText('AMRUT Public Site')).not.toBeInTheDocument();
  });

  it('the sidebar shows only the CMS pages the role grants', () => {
    signInAs('website', ['cms-faqs.view', 'cms-states.view']);
    const { container } = sidebar();
    expect([...container.querySelectorAll('.sb-item .sb-label')].map((l) => l.textContent)).toEqual(['FAQ Management', 'State Master']);
  });

  it('the full panel is unchanged for other roles', () => {
    signInAs('admin', ['dashboard.view', 'cms-faqs.view']);
    sidebar();
    expect(screen.getByText('Programme Management Portal')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('FAQ Management')).toBeInTheDocument();
    expect(screen.getByText('Certificate Verification')).toBeInTheDocument();
    expect(screen.getByText('AMRUT Public Site')).toBeInTheDocument();
  });

  it('the topbar drops programme search, alerts and tours for a Website Admin', () => {
    signInAs('website', WEBSITE);
    const { unmount } = renderWithProviders(<Topbar onBurger={() => {}} />);
    expect(screen.queryByPlaceholderText(/Search candidates/)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Help')).not.toBeInTheDocument();
    unmount();

    signInAs('admin', ['dashboard.view']);
    renderWithProviders(<Topbar onBurger={() => {}} />);
    expect(screen.getByPlaceholderText(/Search candidates/)).toBeInTheDocument();
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });
});

describe('<RequireAccess> for a Website Admin', () => {
  const app = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<RequireAccess navKey="dashboard">Dashboard page</RequireAccess>} />
        <Route path="/users" element={<RequireAccess navKey="users">Users page</RequireAccess>} />
        <Route path="/cms/contact" element={<RequireAccess navKey="cms-contact">Contact page</RequireAccess>} />
      </Routes>,
      { route },
    );

  it('sends every Dashboard link to the first CMS page', async () => {
    signInAs('website', WEBSITE);
    app('/dashboard');
    expect(await screen.findByText('Contact page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('shows the access notice for any other screen, pointing back to the CMS', () => {
    signInAs('website', [...WEBSITE, 'users.view']);
    app('/users');
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this screen")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Contact Page Management' })).toBeInTheDocument();
  });

  it('keeps the Dashboard notice for a programme role that cannot open the screen', () => {
    signInAs('admin', ['dashboard.view']);
    app('/users');
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  });
});

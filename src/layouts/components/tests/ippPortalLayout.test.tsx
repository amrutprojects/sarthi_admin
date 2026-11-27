import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { AppRoutes } from '../../../app/router';
import type { Portal } from '../../../modules/auth/permissions';
import MobileNav from '../MobileNav';
import Sidebar from '../Sidebar';
import Topbar from '../Topbar';

/* The signed-in user, as AuthProvider would expose it. */
const auth = vi.hoisted(() => ({
  status: 'authenticated',
  permissions: new Set<string>(),
  hiddenMenus: new Set<string>(),
  portal: 'admin' as 'admin' | 'website' | 'ipp',
  user: { id: 'me', name: 'Test Officer', email: 'officer@test.local', roles: [], permissions: [] },
  primaryRole: { id: 'r', name: 'COEP', code: 'COEP' },
  logout: vi.fn(),
}));
vi.mock('../../../modules/auth/auth-context', () => ({ useAuth: () => auth }));
/* The real routes, without the sidebar and top bar around them; the Applications screen stands in for itself. */
vi.mock('../../AdminLayout', async () => {
  const { createElement } = await import('react');
  const { Outlet } = await import('react-router-dom');
  return { default: () => createElement(Outlet) };
});
vi.mock('../../../modules/ipp-approvals/pages/ApplicationsPage', () => ({ default: () => 'Applications page' }));

const OFFICERS: [string, string[]][] = [
  ['Divisional Officer', ['ipp-approvals.view', 'ipp-approvals.division-officer']],
  ['COEP', ['ipp-approvals.view', 'ipp-approvals.coep']],
  ['Head Officer', ['ipp-approvals.view', 'ipp-approvals.head-office']],
];
const HIDDEN = [
  'Outcomes',
  'Certificate Verification',
  'Public Site',
  'SARTHI Public Site',
  'Sarthi 2.0',
  'Dashboard',
  'Divisional Officer Mapping',
];

const signInAs = (portal: Portal, codes: string[]) => {
  auth.portal = portal;
  auth.permissions = new Set(codes);
  auth.hiddenMenus = new Set();
};
const sidebar = () => renderWithProviders(<Sidebar active="" collapsed={false} open={false} onToggle={() => {}} />);
const groups = (container: HTMLElement) => [...container.querySelectorAll('.sb-group')].map((g) => g.textContent);
const labels = (container: HTMLElement) => [...container.querySelectorAll('.sb-item .sb-label')].map((l) => l.textContent);

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname}</output>;
}
const renderApp = (route: string) =>
  renderWithProviders(
    <>
      <AppRoutes />
      <Location />
    </>,
    { route },
  );

describe.each(OFFICERS)('IPP portal layout (%s)', (_role, codes) => {
  beforeEach(() => signInAs('ipp', codes));

  it('the sidebar shows the Applications menu and nothing else', () => {
    const { container } = sidebar();
    expect(groups(container)).toEqual(['IPP Approvals']);
    expect(labels(container)).toEqual(['Applications']);
    for (const text of HIDDEN) expect([text, screen.queryByText(text)]).toEqual([text, null]);
  });

  it('the top bar drops the programme alerts and tours, the phone menu bar is empty', () => {
    renderWithProviders(
      <>
        <Topbar onBurger={() => {}} />
        <MobileNav active="ipp-approvals" />
      </>,
    );
    expect(screen.queryByTitle('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Help')).not.toBeInTheDocument();
    expect(document.querySelector('.mnav')).toBeNull();
  });

  it('opens Applications, and sends the Dashboard and the start page there', async () => {
    for (const route of ['/ipp-approvals', '/dashboard', '/']) {
      const { unmount } = renderApp(route);
      expect(await screen.findByText('Applications page')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/ipp-approvals');
      unmount();
    }
  });

  it('does not render the hidden menus’ pages when reached by direct URL', async () => {
    for (const route of ['/certification', '/assessments', '/ipp-officers', '/users']) {
      const { unmount } = renderApp(route);
      expect(await screen.findByText("You don't have access to this screen")).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(route);
      expect(screen.getByRole('button', { name: 'Go to Applications' })).toBeInTheDocument();
      unmount();
    }
    /* Certificate Verification and the public site are pages of the public website, never of the admin panel. */
    for (const route of ['/verify', '/home', '/programme']) {
      const { unmount } = renderApp(route);
      expect(await screen.findByText('Page not found')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Applications' })).toBeInTheDocument();
      unmount();
    }
  });
});

describe('other roles are unchanged', () => {
  it('the full panel still shows its menus and the public site links', () => {
    signInAs('admin', ['dashboard.view', 'ipp-approvals.view', 'ipp-officers.view', 'certification.view']);
    const { container } = sidebar();
    expect(groups(container)).toEqual(expect.arrayContaining(['Command Centre', 'IPP Approvals', 'Outcomes', 'Public Site']));
    expect(labels(container)).toEqual(
      expect.arrayContaining([
        'Dashboard',
        'Applications',
        'Divisional Officer Mapping',
        'Certification',
        'Certificate Verification',
        'SARTHI Public Site',
        'Sarthi 2.0',
      ]),
    );
  });

  it('an officer who also holds a programme role (portal admin) sees both', () => {
    signInAs('admin', ['ipp-approvals.view', 'ipp-approvals.coep', 'dashboard.view']);
    const { container } = sidebar();
    expect(labels(container)).toEqual(expect.arrayContaining(['Dashboard', 'Applications']));
  });
});

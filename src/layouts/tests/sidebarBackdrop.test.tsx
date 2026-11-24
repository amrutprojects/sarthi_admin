import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../tests/test-utils';
import { useUiStore } from '../../store/ui.store';
import AdminLayout from '../AdminLayout';

/* The signed-in user, as AuthProvider would expose it. */
const auth = {
  permissions: new Set<string>(['dashboard.view']),
  hiddenMenus: new Set<string>(),
  portal: 'admin',
  user: { id: 'me', name: 'Test User', email: 'me@test.local', roles: [], permissions: [] },
  primaryRole: { id: 'r', name: 'Super Admin', code: 'SUPER_ADMIN' },
  logout: vi.fn(),
};
vi.mock('../../modules/auth/auth-context', () => ({ useAuth: () => auth }));

const renderLayout = () =>
  renderWithProviders(
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Route>
    </Routes>,
    { route: '/dashboard' },
  );

/* e2e 24 Nov 2026, 375 px: the open off-canvas menu covered the menu button and could only be left by navigating. */
describe('off-canvas sidebar (phones and tablets)', () => {
  beforeEach(() => useUiStore.setState({ sidebarOpen: false }));

  it('closes from the backdrop beside it', async () => {
    renderLayout();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close menu/ })).not.toBeInTheDocument();
    useUiStore.setState({ sidebarOpen: true });
    fireEvent.click(await screen.findByRole('button', { name: /Close menu/ }));
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(screen.queryByRole('button', { name: /Close menu/ })).not.toBeInTheDocument();
  });

  it('closes with the Escape key', async () => {
    renderLayout();
    await screen.findByText('Dashboard page');
    useUiStore.setState({ sidebarOpen: true });
    await screen.findByRole('button', { name: /Close menu/ });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().sidebarOpen).toBe(false);
  });
});

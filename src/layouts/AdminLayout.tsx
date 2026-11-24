import { useCallback, useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import SidebarBackdrop from './components/SidebarBackdrop';
import ErrorBoundary from '../components/feedback/ErrorBoundary';
import GlobalDialogs from '../components/feedback/GlobalDialogs';
import { ADMIN_ROUTES } from '../constants/navigation';
import { matchPath } from 'react-router-dom';
import { useUiStore } from '../store/ui.store';

function activeKey(pathname: string): string {
  const hit = ADMIN_ROUTES.find(([p]) => matchPath(p, pathname));
  return hit ? hit[2] : '';
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const { sidebarCollapsed: collapsed, sidebarOpen: open, toggleSidebar: toggle, setSidebarOpen } = useUiStore();

  /* Close the off-canvas sidebar after navigating (phones and tablets). */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  /* Open every new screen at the top; Back / Forward (POP) keep the browser's own scroll position. */
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  const nk = activeKey(pathname);
  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '')} id="shell">
      <Sidebar active={nk} collapsed={collapsed} open={open} onToggle={toggle} />
      <SidebarBackdrop open={open} onClose={closeSidebar} />
      <div className="main">
        <Topbar onBurger={() => setSidebarOpen(!open)} />
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
      <MobileNav active={nk} />
      <GlobalDialogs />
    </div>
  );
}

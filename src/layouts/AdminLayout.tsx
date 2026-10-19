import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
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
  const { sidebarCollapsed: collapsed, sidebarOpen: open, toggleSidebar: toggle, setSidebarOpen } = useUiStore();

  /* Close the off-canvas sidebar after navigating (phones and tablets). */
  useEffect(() => { setSidebarOpen(false); }, [pathname, setSidebarOpen]);

  const nk = activeKey(pathname);
  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '')} id="shell">
      <Sidebar active={nk} collapsed={collapsed} open={open} onToggle={toggle} />
      <div className="main">
        <Topbar onBurger={() => setSidebarOpen(!open)} />
        <ErrorBoundary resetKey={pathname}><Outlet /></ErrorBoundary>
      </div>
      <MobileNav active={nk} />
      <GlobalDialogs />
    </div>
  );
}

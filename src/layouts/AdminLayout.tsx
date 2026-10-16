import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import MobileNav from '../components/MobileNav';
import ErrorBoundary from '../components/ErrorBoundary';
import GlobalDialogs from '../components/GlobalDialogs';
import { ADMIN_ROUTES } from '../routes/navConfig';
import { matchPath } from 'react-router-dom';

function activeKey(pathname: string): string {
  const hit = ADMIN_ROUTES.find(([p]) => matchPath(p, pathname));
  return hit ? hit[2] : '';
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('as_sb_collapsed') === '1'; } catch { return false; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  function toggle() {
    setCollapsed((c) => {
      try { localStorage.setItem('as_sb_collapsed', c ? '0' : '1'); } catch { /* storage blocked */ }
      return !c;
    });
  }

  const nk = activeKey(pathname);
  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '')} id="shell">
      <Sidebar active={nk} collapsed={collapsed} open={open} onToggle={toggle} />
      <div className="main">
        <Topbar onBurger={() => setOpen((o) => !o)} />
        <ErrorBoundary resetKey={pathname}><Outlet /></ErrorBoundary>
      </div>
      <MobileNav active={nk} />
      <GlobalDialogs />
    </div>
  );
}

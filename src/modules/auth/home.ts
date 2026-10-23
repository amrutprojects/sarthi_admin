import { matchPath } from 'react-router-dom';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, type NavItem } from '../../constants/navigation';
import { canOpen, type Portal } from './permissions';

export interface Access {
  permissions: Set<string>;
  hiddenMenus?: Set<string>;
  portal?: Portal;
}

const DASHBOARD = NAV.find((n): n is NavItem => !isNavGroup(n) && n.k === 'dashboard')!;
/*
 * Sidebar entries that are admin panel screens (not links out to the public site). A home page menu is reached
 * through Home Page Management, which opens when any of them does, so a user whose first CMS screen is a home
 * page section starts there.
 */
const SCREENS = SIDEBAR_NAV.filter((n): n is NavItem => !isNavGroup(n) && ADMIN_ROUTES.some(([path]) => path === n.r));

/*
 * The user's start screen: the first sidebar screen they may open. That is the Dashboard for every programme role
 * and the first CMS page for a Website Admin; the Dashboard when nothing opens (its page explains why).
 */
export function homeItem({ permissions, hiddenMenus, portal }: Access): NavItem {
  return SCREENS.find((n) => canOpen(permissions, n.k, hiddenMenus, portal)) ?? DASHBOARD;
}

export const homePath = (access: Access): string => homeItem(access).r;

/* Whether an in-app path (e.g. the page a signed-out user was sent away from) opens for this user. */
export function canOpenPath(path: string, { permissions, hiddenMenus, portal }: Access): boolean {
  const pathname = path.split(/[?#]/)[0];
  const hit = ADMIN_ROUTES.find(([p]) => matchPath(p, pathname));
  if (hit) return canOpen(permissions, hit[2], hiddenMenus, portal);
  /* A home page menu's former landing page, which the router sends on to that menu's tab of Home Page Management. */
  const moved = HOME_PAGE_REDIRECTS.find(([p]) => matchPath(p, pathname));
  const menu = moved && HOME_PAGE_TABS.find((t) => t.k === moved[1])?.menu;
  return !!menu && canOpen(permissions, menu, hiddenMenus, portal);
}

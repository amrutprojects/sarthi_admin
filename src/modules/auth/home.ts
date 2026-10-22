import { matchPath } from 'react-router-dom';
import { ADMIN_ROUTES, NAV, isNavGroup, type NavItem } from '../../constants/navigation';
import { canOpen, type Portal } from './permissions';

export interface Access {
  permissions: Set<string>;
  hiddenMenus?: Set<string>;
  portal?: Portal;
}

const DASHBOARD = NAV.find((n): n is NavItem => !isNavGroup(n) && n.k === 'dashboard')!;
/* Sidebar entries that are admin panel screens (not links out to the public site). */
const SCREENS = NAV.filter((n): n is NavItem => !isNavGroup(n) && ADMIN_ROUTES.some(([path]) => path === n.r));

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
  return !!hit && canOpen(permissions, hit[2], hiddenMenus, portal);
}

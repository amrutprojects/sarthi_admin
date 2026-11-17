import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { ACTION_ACCESS, MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { HIDE_CONSEQUENCE, VISIBILITY_TABS, VISIBILITY_UPDATE_ACTION } from '../visibility/constants';
import {
  CARD_CREATE_PATH,
  LIVE_DASHBOARD_SETTINGS_PATH,
  LIVE_DASHBOARD_TAB_PATH,
  STAT_CREATE_PATH,
  cardEditPath,
  cardViewPath,
  statEditPath,
  statViewPath,
} from './constants';

const keyAt = (i: number) => {
  const n = NAV[i];
  return n && !isNavGroup(n) ? n.k : '';
};
const routeOf = (path: string) => ADMIN_ROUTES.find(([p]) => matchPath(p, path))?.[1];

describe('Live Dashboard menu', () => {
  it('is the tab after Quick Actions in Home Page Management, before the Diploma band, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-livedashboard');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-livedashboard', l: 'Live Dashboard', i: 'dashboard', r: '/cms/home-page?tab=live-dashboard' });
    /* In home page order: the dashboard follows the quick actions strip and precedes the Skill Development Diploma band. */
    expect(keyAt(at - 1)).toBe('cms-quickactions');
    expect(keyAt(at + 1)).toBe('cms-highlight');

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-livedashboard')).toBe(false);
    expect(sidebarKey('cms-livedashboard')).toBe('cms-home-page');
    const tab = HOME_PAGE_TABS.findIndex((t) => t.k === 'live-dashboard');
    expect(HOME_PAGE_TABS[tab]).toEqual({ k: 'live-dashboard', l: 'Live Dashboard', menu: 'cms-livedashboard' });
    expect(HOME_PAGE_TABS[tab - 1]?.k).toBe('quick-actions');
    expect(HOME_PAGE_TABS[tab + 1]?.k).toBe('diploma');
    const group = MENU_GROUPS['cms-home-page']!;
    expect(group[group.indexOf('cms-livedashboard') - 1]).toBe('cms-quickactions');
    expect(group[group.indexOf('cms-livedashboard') + 1]).toBe('cms-highlight');
    expect(LIVE_DASHBOARD_TAB_PATH).toBe('/cms/home-page?tab=live-dashboard');
  });

  it('is a menu of the Website Admin role, after Quick Actions', () => {
    expect(WEBSITE_MENUS.indexOf('cms-livedashboard')).toBe(WEBSITE_MENUS.indexOf('cms-quickactions') + 1);
    expect(canOpen(new Set(['cms-livedashboard.view']), 'cms-livedashboard', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-livedashboard.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-livedashboard.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-livedashboard.view']), 'cms-livedashboard')).toBe(true);
    expect(canOpen(new Set(['cms-quickactions.view']), 'cms-livedashboard')).toBe(false);
    expect(canOpen(new Set(['cms-livedashboard.view']), 'cms-livedashboard', new Set(['cms-livedashboard']))).toBe(false);
  });

  it('routes the settings, card and figure pages under its own key, static paths before the :id patterns', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-livedashboard')).toEqual([
      ['/cms/live-dashboard/settings', 'cmsLiveDashboardSettings', 'cms-livedashboard'],
      ['/cms/live-dashboard/cards/create', 'cmsLiveDashboardCard', 'cms-livedashboard'],
      ['/cms/live-dashboard/cards/:id/edit', 'cmsLiveDashboardCard', 'cms-livedashboard'],
      ['/cms/live-dashboard/cards/:id/view', 'cmsLiveDashboardCardView', 'cms-livedashboard'],
      ['/cms/live-dashboard/stats/create', 'cmsLiveDashboardStat', 'cms-livedashboard'],
      ['/cms/live-dashboard/stats/:id/edit', 'cmsLiveDashboardStat', 'cms-livedashboard'],
      ['/cms/live-dashboard/stats/:id/view', 'cmsLiveDashboardStatView', 'cms-livedashboard'],
    ]);
    expect(routeOf(LIVE_DASHBOARD_SETTINGS_PATH)).toBe('cmsLiveDashboardSettings');
    expect(routeOf(CARD_CREATE_PATH)).toBe('cmsLiveDashboardCard');
    expect(routeOf(cardEditPath('c-1'))).toBe('cmsLiveDashboardCard');
    expect(routeOf(cardViewPath('c-1'))).toBe('cmsLiveDashboardCardView');
    expect(routeOf(STAT_CREATE_PATH)).toBe('cmsLiveDashboardStat');
    expect(routeOf(statEditPath('s-1'))).toBe('cmsLiveDashboardStat');
    expect(routeOf(statViewPath('s-1'))).toBe('cmsLiveDashboardStatView');
    /* An id is always one path segment, so a link can never reach another route. */
    expect(cardViewPath('a/b?c')).toBe('/cms/live-dashboard/cards/a%2Fb%3Fc/view');
    /* The bare path opens the tab, as for the other home page menus. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/live-dashboard', 'live-dashboard']);
  });

  it('gates each action on its own permission', () => {
    expect(ACTION_ACCESS.viewLiveDashboard).toEqual(['cms-livedashboard.view']);
    const view = new Set(['cms-livedashboard.view']);
    expect(canDo(view, 'viewLiveDashboard')).toBe(true);
    for (const a of ['createLiveDashboardItem', 'updateLiveDashboard', 'deleteLiveDashboardItem'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-livedashboard.create']), 'createLiveDashboardItem')).toBe(true);
    expect(canDo(new Set(['cms-livedashboard.update']), 'updateLiveDashboard')).toBe(true);
    expect(canDo(new Set(['cms-livedashboard.delete']), 'deleteLiveDashboardItem')).toBe(true);
    /* Another section's permission never opens this one. */
    expect(canDo(new Set(['cms-quickactions.update']), 'updateLiveDashboard')).toBe(false);
  });

  it('has the section’s "Show on website" switch, gated on its update permission, hiding nothing else', () => {
    expect(VISIBILITY_TABS.map((t) => t.k)).toContain('live-dashboard');
    expect(VISIBILITY_UPDATE_ACTION['live-dashboard']).toBe('updateLiveDashboard');
    expect(HIDE_CONSEQUENCE['live-dashboard']).toBeUndefined();
  });
});

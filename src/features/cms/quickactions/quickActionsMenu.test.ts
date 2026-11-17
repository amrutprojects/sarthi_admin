import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { ACTION_ACCESS, MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { HIDE_CONSEQUENCE, VISIBILITY_TABS, VISIBILITY_UPDATE_ACTION } from '../visibility/constants';
import { QUICK_ACTION_CREATE_PATH, QUICK_ACTIONS_TAB_PATH, quickActionEditPath, quickActionViewPath } from './constants';

const keyAt = (i: number) => {
  const n = NAV[i];
  return n && !isNavGroup(n) ? n.k : '';
};

describe('Quick Actions menu', () => {
  it('is the tab after Programme at a glance in Home Page Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-quickactions');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-quickactions', l: 'Quick Actions', i: 'plus', r: '/cms/home-page?tab=quick-actions' });
    /*
     * In home page order: the strip sits right under the banner (Home Hero Section) and above the Diploma band. Only the
     * neighbour before is pinned: sections added below the strip (such as the Live Dashboard) may sit in between.
     */
    expect(keyAt(at - 1)).toBe('cms-hero');
    const highlightAt = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-highlight');
    expect(highlightAt).toBeGreaterThan(at);
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-quickactions')).toBe(false);
    expect(sidebarKey('cms-quickactions')).toBe('cms-home-page');
    const tab = HOME_PAGE_TABS.findIndex((t) => t.k === 'quick-actions');
    expect(HOME_PAGE_TABS[tab]).toEqual({ k: 'quick-actions', l: 'Quick Actions', menu: 'cms-quickactions' });
    expect(HOME_PAGE_TABS[tab - 1]?.k).toBe('glance');
    expect(HOME_PAGE_TABS.findIndex((t) => t.k === 'diploma')).toBeGreaterThan(tab);
    const group2 = MENU_GROUPS['cms-home-page']!;
    expect(group2[group2.indexOf('cms-quickactions') - 1]).toBe('cms-hero');
    expect(QUICK_ACTIONS_TAB_PATH).toBe('/cms/home-page?tab=quick-actions');
  });

  it('is a menu of the Website Admin role, after the hero', () => {
    expect(WEBSITE_MENUS.indexOf('cms-quickactions')).toBe(WEBSITE_MENUS.indexOf('cms-hero') + 1);
    expect(canOpen(new Set(['cms-quickactions.view']), 'cms-quickactions', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-quickactions.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-quickactions.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-quickactions.view']), 'cms-quickactions')).toBe(true);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-quickactions')).toBe(false);
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-quickactions')).toBe(false);
    expect(canOpen(new Set(['cms-quickactions.view']), 'cms-quickactions', new Set(['cms-quickactions']))).toBe(false);
  });

  it('routes the add, edit and view pages under its own key, the static path before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-quickactions');
    expect(routes).toEqual([
      ['/cms/quick-actions/create', 'cmsQuickActionCreate', 'cms-quickactions'],
      ['/cms/quick-actions/:id/edit', 'cmsQuickActionEdit', 'cms-quickactions'],
      ['/cms/quick-actions/:id/view', 'cmsQuickActionView', 'cms-quickactions'],
    ]);
    expect(QUICK_ACTION_CREATE_PATH).toBe('/cms/quick-actions/create');
    /* The eye button and a click on a row open the View page by the tile's id. */
    expect(quickActionViewPath('q-1')).toBe('/cms/quick-actions/q-1/view');
    expect(quickActionEditPath('q-1')).toBe('/cms/quick-actions/q-1/edit');
    expect(matchPath('/cms/quick-actions/:id/view', quickActionViewPath('q-1'))?.params.id).toBe('q-1');
    expect(ADMIN_ROUTES.find(([p]) => matchPath(p, QUICK_ACTION_CREATE_PATH))?.[1]).toBe('cmsQuickActionCreate');
    /* The bare path opens the tab, as for the other home page menus. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/quick-actions', 'quick-actions']);
  });

  it('gates each action on its own permission', () => {
    expect(ACTION_ACCESS.viewQuickActions).toEqual(['cms-quickactions.view']);
    const view = new Set(['cms-quickactions.view']);
    expect(canDo(view, 'viewQuickActions')).toBe(true);
    for (const a of ['createQuickAction', 'updateQuickAction', 'deleteQuickAction'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-quickactions.create']), 'createQuickAction')).toBe(true);
    expect(canDo(new Set(['cms-quickactions.update']), 'updateQuickAction')).toBe(true);
    expect(canDo(new Set(['cms-quickactions.delete']), 'deleteQuickAction')).toBe(true);
    /* Another section's permission never opens this one. */
    expect(canDo(new Set(['cms-hero.update']), 'updateQuickAction')).toBe(false);
    expect(canDo(new Set(['cms-quickactions.update']), 'updateHero')).toBe(false);
  });

  it('has the section’s "Show on website" switch, gated on its update permission, hiding nothing else', () => {
    expect(VISIBILITY_TABS.map((t) => t.k)).toContain('quick-actions');
    expect(VISIBILITY_UPDATE_ACTION['quick-actions']).toBe('updateQuickAction');
    expect(HIDE_CONSEQUENCE['quick-actions']).toBeUndefined();
  });
});

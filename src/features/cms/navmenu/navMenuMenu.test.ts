import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, SCREEN_ACCESS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { NAVMENU_TAB_PATH } from './constants';

describe('Navigation Menu menu', () => {
  it('is the third tab of Home Page Management, under the brand bar, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-navmenu');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-navmenu', l: 'Navigation Menu', i: 'menu', r: '/cms/home-page?tab=nav-menu' });
    /* Directly under the brand bar, as the menu bar is on the website, and above the announcements ticker. */
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-brandbar');
    const next = NAV[at + 1];
    expect(next && !isNavGroup(next) ? next.k : '').toBe('cms-announcements');

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-navmenu')).toBe(false);
    expect(sidebarKey('cms-navmenu')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS[2]).toEqual({ k: 'nav-menu', l: 'Navigation Menu', menu: 'cms-navmenu' });
    expect(MENU_GROUPS['cms-home-page']![2]).toBe('cms-navmenu');
    expect(SCREEN_ACCESS['cms-navmenu']).toEqual(['cms-navmenu.view']);
  });

  it('is a menu of the Website Admin role, third of the home page menus', () => {
    expect(WEBSITE_MENUS[2]).toBe('cms-navmenu');
    expect(canOpen(new Set(['cms-navmenu.view']), 'cms-navmenu', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-navmenu.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-navmenu.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-navmenu.view']), 'cms-navmenu')).toBe(true);
    expect(canOpen(new Set(['cms-brandbar.view']), 'cms-navmenu')).toBe(false);
    expect(canOpen(new Set(['cms-navmenu.update']), 'cms-navmenu')).toBe(false);
    expect(canOpen(new Set(['cms-navmenu.view']), 'cms-navmenu', new Set(['cms-navmenu']))).toBe(false);
  });

  it('has no page of its own, and opens the tab from its bare path', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-navmenu')).toEqual([]);
    expect(NAVMENU_TAB_PATH).toBe('/cms/home-page?tab=nav-menu');
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/nav-menu', 'nav-menu']);
  });

  it('gates viewing and switching on their own permissions', () => {
    const view = new Set(['cms-navmenu.view']);
    expect(canDo(view, 'viewNavMenu')).toBe(true);
    expect(canDo(view, 'updateNavMenu')).toBe(false);
    expect(canDo(new Set(['cms-navmenu.update']), 'updateNavMenu')).toBe(true);
    /* Another section's permission never opens this one, nor this one another's. */
    expect(canDo(new Set(['cms-brandbar.update']), 'updateNavMenu')).toBe(false);
    expect(canDo(new Set(['cms-navmenu.update']), 'updateBrandBar')).toBe(false);
  });
});

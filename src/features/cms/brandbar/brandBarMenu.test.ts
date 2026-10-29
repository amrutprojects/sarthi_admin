import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { BRANDBAR_EDIT_PATH, BRANDBAR_TAB_PATH } from './constants';

describe('Brand Bar menu', () => {
  it('is the second tab of Home Page Management, under the top bar, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-brandbar');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-brandbar', l: 'Brand Bar', i: 'award', r: '/cms/home-page?tab=brand-bar' });
    /* Directly under the top bar (the strip above the whole page), which is directly under Home Page Management. */
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-topbar');
    const before = NAV[at - 2];
    expect(before && !isNavGroup(before) ? before.k : '').toBe('cms-home-page');

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-brandbar')).toBe(false);
    expect(sidebarKey('cms-brandbar')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS[1]).toEqual({ k: 'brand-bar', l: 'Brand Bar', menu: 'cms-brandbar' });
    expect(MENU_GROUPS['cms-home-page']![1]).toBe('cms-brandbar');
  });

  it('is a menu of the Website Admin role, second of the home page menus', () => {
    expect(WEBSITE_MENUS[1]).toBe('cms-brandbar');
    expect(canOpen(new Set(['cms-brandbar.view']), 'cms-brandbar', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-brandbar.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-brandbar.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-brandbar.view']), 'cms-brandbar')).toBe(true);
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-brandbar')).toBe(false);
    expect(canOpen(new Set(['cms-brandbar.view']), 'cms-brandbar', new Set(['cms-brandbar']))).toBe(false);
  });

  it('routes the edit page under its own key, and opens the tab from its bare path', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-brandbar')).toEqual([['/cms/brand-bar/edit', 'cmsBrandBarEdit', 'cms-brandbar']]);
    expect(BRANDBAR_EDIT_PATH).toBe('/cms/brand-bar/edit');
    expect(BRANDBAR_TAB_PATH).toBe('/cms/home-page?tab=brand-bar');
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/brand-bar', 'brand-bar']);
  });

  it('gates viewing and editing on their own permissions', () => {
    const view = new Set(['cms-brandbar.view']);
    expect(canDo(view, 'viewBrandBar')).toBe(true);
    expect(canDo(view, 'updateBrandBar')).toBe(false);
    expect(canDo(new Set(['cms-brandbar.update']), 'updateBrandBar')).toBe(true);
    /* Another section's permission never opens this one. */
    expect(canDo(new Set(['cms-topbar.update']), 'updateBrandBar')).toBe(false);
    expect(canDo(new Set(['cms-brandbar.update']), 'updateTopBar')).toBe(false);
  });
});

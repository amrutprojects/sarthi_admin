import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, SCREEN_ACCESS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { PAGE_BANNERS_PATH } from './constants';

const keyAt = (i: number) => {
  const n = NAV[i];
  return n && !isNavGroup(n) ? n.k : '';
};

describe('Page Banners menu', () => {
  it('is a CMS sidebar entry of its own, after Footer Management and before the geography masters', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-pagebanners');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-pagebanners', l: 'Page Banners', i: 'monitor', r: '/cms/page-banners' });
    expect(keyAt(at - 1)).toBe('cms-footer');
    expect(keyAt(at + 1)).toBe('cms-states');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toBe('CMS');

    /* Not a Home Page Management tab. */
    expect(HOME_PAGE_TABS.map((t): string => t.menu)).not.toContain('cms-pagebanners');
    expect(MENU_GROUPS['cms-home-page']).not.toContain('cms-pagebanners');
    expect(sidebarKey('cms-pagebanners')).toBe('cms-pagebanners');
    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-pagebanners')).toBe(true);
    expect(SCREEN_ACCESS['cms-pagebanners']).toEqual(['cms-pagebanners.view']);
  });

  it('opens with cms-pagebanners.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-pagebanners.view']), 'cms-pagebanners')).toBe(true);
    expect(canOpen(new Set(['cms-pagebanners.update']), 'cms-pagebanners')).toBe(false);
    expect(canOpen(new Set(['cms-footer.view']), 'cms-pagebanners')).toBe(false);
    expect(canOpen(new Set(['cms-pagebanners.view']), 'cms-pagebanners', new Set(['cms-pagebanners']))).toBe(false);
  });

  it('is part of the Website Admin portal, after Footer Management', () => {
    expect(WEBSITE_MENUS.indexOf('cms-pagebanners')).toBe(WEBSITE_MENUS.indexOf('cms-footer') + 1);
    expect(canOpen(new Set(['cms-pagebanners.view']), 'cms-pagebanners', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-pagebanners.view']), 'cms-pagebanners', new Set(['cms-pagebanners']), 'website')).toBe(false);
  });

  it('routes its one page under its own key', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-pagebanners')).toEqual([['/cms/page-banners', 'cmsPageBanners', 'cms-pagebanners']]);
    expect(PAGE_BANNERS_PATH).toBe('/cms/page-banners');
  });

  it('gates viewing and editing on their own permissions', () => {
    const view = new Set(['cms-pagebanners.view']);
    expect(canDo(view, 'viewPageBanners')).toBe(true);
    expect(canDo(view, 'updatePageBanners')).toBe(false);
    expect(canDo(new Set(['cms-pagebanners.update']), 'updatePageBanners')).toBe(true);
    /* Another menu's permission never opens this one, nor this one another's. */
    expect(canDo(new Set(['cms-navmenu.update']), 'updatePageBanners')).toBe(false);
    expect(canDo(new Set(['cms-pagebanners.update']), 'updateNavMenu')).toBe(false);
  });
});

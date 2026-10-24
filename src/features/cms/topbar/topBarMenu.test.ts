import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { topBarLinkEditPath, topBarLinkViewPath } from './constants';

describe('Top Bar menu', () => {
  it('is the first tab of Home Page Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-topbar');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-topbar', l: 'Top Bar', i: 'globe', r: '/cms/home-page?tab=top-bar' });
    /* Directly under Home Page Management: the strip is the very top of every page of the website. */
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-home-page');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-topbar')).toBe(false);
    expect(sidebarKey('cms-topbar')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS[0]).toEqual({ k: 'top-bar', l: 'Top Bar', menu: 'cms-topbar' });
    expect(MENU_GROUPS['cms-home-page']![0]).toBe('cms-topbar');
  });

  it('is a menu of the Website Admin role, first of the home page menus', () => {
    expect(WEBSITE_MENUS[0]).toBe('cms-topbar');
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-topbar', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-topbar.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-topbar')).toBe(true);
    expect(canOpen(new Set(['cms-announcements.view']), 'cms-topbar')).toBe(false);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-topbar')).toBe(false);
    expect(canOpen(new Set(['cms-topbar.view']), 'cms-topbar', new Set(['cms-topbar']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-topbar');
    expect(routes).toEqual([
      ['/cms/top-bar/create', 'cmsTopBarCreate', 'cms-topbar'],
      ['/cms/top-bar/settings', 'cmsTopBarSettings', 'cms-topbar'],
      ['/cms/top-bar/:id/edit', 'cmsTopBarEdit', 'cms-topbar'],
      ['/cms/top-bar/:id/view', 'cmsTopBarView', 'cms-topbar'],
    ]);
    /* The eye button and a click on a row open the View page by the link's id. */
    expect(topBarLinkViewPath('l-1')).toBe('/cms/top-bar/l-1/view');
    expect(topBarLinkEditPath('l-1')).toBe('/cms/top-bar/l-1/edit');
    expect(matchPath('/cms/top-bar/:id/view', topBarLinkViewPath('l-1'))?.params.id).toBe('l-1');
    /* The bare path opens the tab, as for the other home page menus. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/top-bar', 'top-bar']);
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-topbar.view']);
    expect(canDo(view, 'viewTopBar')).toBe(true);
    for (const a of ['createTopBarLink', 'updateTopBar', 'deleteTopBarLink'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-topbar.create']), 'createTopBarLink')).toBe(true);
    expect(canDo(new Set(['cms-topbar.update']), 'updateTopBar')).toBe(true);
    expect(canDo(new Set(['cms-topbar.delete']), 'deleteTopBarLink')).toBe(true);
    /* Another section's permission never opens this one. */
    expect(canDo(new Set(['cms-announcements.update']), 'updateTopBar')).toBe(false);
    expect(canDo(new Set(['cms-topbar.update']), 'updateAnnouncement')).toBe(false);
  });
});

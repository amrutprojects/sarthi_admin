import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { announcementEditPath, announcementViewPath } from './constants';

describe('Announcements menu', () => {
  it('is the second tab of Home Page Management, under the top bar, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-announcements');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-announcements', l: 'Announcements', i: 'megaphone', r: '/cms/home-page?tab=announcements' });
    /* Directly under the top bar (the strip above the whole page), which is directly under Home Page Management. */
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-topbar');
    const before = NAV[at - 2];
    expect(before && !isNavGroup(before) ? before.k : '').toBe('cms-home-page');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-announcements')).toBe(false);
    expect(sidebarKey('cms-announcements')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS[1]).toEqual({ k: 'announcements', l: 'Announcements', menu: 'cms-announcements' });
    expect(MENU_GROUPS['cms-home-page']![1]).toBe('cms-announcements');
  });

  it('is a menu of the Website Admin role, second of the home page menus', () => {
    expect(WEBSITE_MENUS[1]).toBe('cms-announcements');
    expect(canOpen(new Set(['cms-announcements.view']), 'cms-announcements', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-announcements.view']), 'cms-home-page', undefined, 'website')).toBe(true);
  });

  it('opens with cms-announcements.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-announcements.view']), 'cms-announcements')).toBe(true);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-announcements')).toBe(false);
    expect(canOpen(new Set(['cms-announcements.view']), 'cms-announcements', new Set(['cms-announcements']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-announcements');
    expect(routes).toEqual([
      ['/cms/announcements/create', 'cmsAnnouncementsCreate', 'cms-announcements'],
      ['/cms/announcements/settings', 'cmsAnnouncementsSettings', 'cms-announcements'],
      ['/cms/announcements/:id/edit', 'cmsAnnouncementsEdit', 'cms-announcements'],
      ['/cms/announcements/:id/view', 'cmsAnnouncementsView', 'cms-announcements'],
    ]);
    /* The eye button and a click on a row open the View page by the announcement's id. */
    expect(announcementViewPath('a-1')).toBe('/cms/announcements/a-1/view');
    expect(announcementEditPath('a-1')).toBe('/cms/announcements/a-1/edit');
    expect(matchPath('/cms/announcements/:id/view', announcementViewPath('a-1'))?.params.id).toBe('a-1');
    /* The bare path opens the tab, as for the other home page menus. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/announcements', 'announcements']);
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-announcements.view']);
    expect(canDo(view, 'viewAnnouncements')).toBe(true);
    for (const a of ['createAnnouncement', 'updateAnnouncement', 'deleteAnnouncement'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-announcements.create']), 'createAnnouncement')).toBe(true);
    expect(canDo(new Set(['cms-announcements.update']), 'updateAnnouncement')).toBe(true);
    expect(canDo(new Set(['cms-announcements.delete']), 'deleteAnnouncement')).toBe(true);
    expect(canDo(new Set(['cms-schemes.update']), 'updateAnnouncement')).toBe(false);
  });
});

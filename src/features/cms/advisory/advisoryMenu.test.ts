import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { MENU_GROUPS, WEBSITE_MENUS, canDo, canOpen } from '../../../modules/auth/permissions';
import { ADVISORY_PATH, advisoryMemberEditPath, advisoryMemberViewPath } from './constants';

const keyAt = (i: number) => {
  const n = NAV[i];
  return n && !isNavGroup(n) ? n.k : '';
};

describe('Advisory Committee Management menu', () => {
  it('is a CMS sidebar entry of its own, after About AMRUT and before Programme Page Management', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-advisory');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-advisory', l: 'Advisory Committee Management', i: 'users', r: '/cms/advisory-committee' });
    expect(keyAt(at - 1)).toBe('cms-about');
    expect(keyAt(at + 1)).toBe('cms-programme');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toBe('CMS');

    /* Not a Home Page Management tab: it shows in the sidebar under its own key. */
    expect(HOME_PAGE_TABS.map((t): string => t.menu)).not.toContain('cms-advisory');
    expect(MENU_GROUPS['cms-home-page']).not.toContain('cms-advisory');
    expect(sidebarKey('cms-advisory')).toBe('cms-advisory');
    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-advisory')).toBe(true);
  });

  it('opens with cms-advisory.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-advisory.view']), 'cms-advisory')).toBe(true);
    expect(canOpen(new Set(['cms-board.view']), 'cms-advisory')).toBe(false);
    expect(canOpen(new Set(), 'cms-advisory')).toBe(false);
    expect(canOpen(new Set(['cms-advisory.view']), 'cms-advisory', new Set(['cms-advisory']))).toBe(false);
  });

  it('is part of the Website Admin portal, like Board Members Management', () => {
    expect(WEBSITE_MENUS).toContain('cms-advisory');
    expect(WEBSITE_MENUS.indexOf('cms-advisory')).toBe(WEBSITE_MENUS.indexOf('cms-about') + 1);
    expect(canOpen(new Set(['cms-advisory.view']), 'cms-advisory', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-advisory.view']), 'cms-advisory', new Set(['cms-advisory']), 'website')).toBe(false);
  });

  it('routes the list, add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-advisory');
    expect(routes).toEqual([
      ['/cms/advisory-committee', 'cmsAdvisoryList', 'cms-advisory'],
      ['/cms/advisory-committee/create', 'cmsAdvisoryCreate', 'cms-advisory'],
      ['/cms/advisory-committee/settings', 'cmsAdvisorySettings', 'cms-advisory'],
      ['/cms/advisory-committee/:id/edit', 'cmsAdvisoryEdit', 'cms-advisory'],
      ['/cms/advisory-committee/:id/view', 'cmsAdvisoryView', 'cms-advisory'],
    ]);
    expect(ADVISORY_PATH).toBe('/cms/advisory-committee');
    /* The eye button and a click on a row open the View page by the Advisory Committee member's id. */
    expect(advisoryMemberViewPath('m-1')).toBe('/cms/advisory-committee/m-1/view');
    expect(advisoryMemberEditPath('m-1')).toBe('/cms/advisory-committee/m-1/edit');
    expect(matchPath('/cms/advisory-committee/:id/view', advisoryMemberViewPath('m-1'))?.params.id).toBe('m-1');
    /* The first matching route for "settings" is the settings page, not an :id pattern. */
    expect(ADMIN_ROUTES.find(([p]) => matchPath(p, '/cms/advisory-committee/settings'))?.[1]).toBe('cmsAdvisorySettings');
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-advisory.view']);
    expect(canDo(view, 'viewAdvisoryCommittee')).toBe(true);
    for (const a of ['createAdvisoryMember', 'updateAdvisoryMember', 'deleteAdvisoryMember'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-advisory.create']), 'createAdvisoryMember')).toBe(true);
    expect(canDo(new Set(['cms-advisory.update']), 'updateAdvisoryMember')).toBe(true);
    expect(canDo(new Set(['cms-advisory.delete']), 'deleteAdvisoryMember')).toBe(true);
    expect(canDo(new Set(['cms-board.update']), 'updateAdvisoryMember')).toBe(false);
  });
});

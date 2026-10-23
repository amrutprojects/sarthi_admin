import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import { schemeEditPath, schemeViewPath } from './constants';

describe('AMRUT Schemes Management menu', () => {
  it('is a tab of Home Page Management, after The AMRUT Ecosystem, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-schemes');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-schemes', l: 'AMRUT Schemes Management', i: 'clipboard', r: '/cms/home-page?tab=schemes' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-ecosystem');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-schemes')).toBe(false);
    expect(sidebarKey('cms-schemes')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS.find((t) => t.menu === 'cms-schemes')).toEqual({ k: 'schemes', l: 'AMRUT Schemes', menu: 'cms-schemes' });
  });

  it('opens with cms-schemes.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-schemes')).toBe(true);
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-schemes')).toBe(false);
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-schemes', new Set(['cms-schemes']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-schemes');
    expect(routes).toEqual([
      ['/cms/amrut-schemes/create', 'cmsSchemesCreate', 'cms-schemes'],
      ['/cms/amrut-schemes/settings', 'cmsSchemesSettings', 'cms-schemes'],
      ['/cms/amrut-schemes/:id/edit', 'cmsSchemesEdit', 'cms-schemes'],
      ['/cms/amrut-schemes/:id/view', 'cmsSchemesView', 'cms-schemes'],
    ]);
    /* The eye button and a click on a row open the View page by the scheme's id. */
    expect(schemeViewPath('s-1')).toBe('/cms/amrut-schemes/s-1/view');
    expect(schemeEditPath('s-1')).toBe('/cms/amrut-schemes/s-1/edit');
    expect(matchPath('/cms/amrut-schemes/:id/view', schemeViewPath('s-1'))?.params.id).toBe('s-1');
    /* The former list page opens the tab. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/amrut-schemes', 'schemes']);
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-schemes.view']);
    expect(canDo(view, 'viewSchemes')).toBe(true);
    for (const a of ['createScheme', 'updateScheme', 'deleteScheme'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-schemes.create']), 'createScheme')).toBe(true);
    expect(canDo(new Set(['cms-schemes.update']), 'updateScheme')).toBe(true);
    expect(canDo(new Set(['cms-schemes.delete']), 'deleteScheme')).toBe(true);
  });
});

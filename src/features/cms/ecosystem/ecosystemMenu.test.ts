import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import { ECOSYSTEM_TAB_PATH, ecosystemEditPath, ecosystemViewPath } from './constants';

describe('The AMRUT Ecosystem menu', () => {
  it('is a tab of Home Page Management, after AMRUT Impact Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-ecosystem');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-ecosystem', l: 'The AMRUT Ecosystem', i: 'layers', r: '/cms/home-page?tab=ecosystem' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-impact');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-ecosystem')).toBe(false);
    expect(sidebarKey('cms-ecosystem')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS.find((t) => t.menu === 'cms-ecosystem')).toEqual({
      k: 'ecosystem',
      l: 'The AMRUT Ecosystem',
      menu: 'cms-ecosystem',
    });
  });

  it('opens with cms-ecosystem.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-ecosystem')).toBe(true);
    expect(canOpen(new Set(['cms-board.view']), 'cms-ecosystem')).toBe(false);
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-ecosystem', new Set(['cms-ecosystem']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-ecosystem');
    expect(routes).toEqual([
      ['/cms/amrut-ecosystem/create', 'cmsEcosystemCreate', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/settings', 'cmsEcosystemSettings', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/:id/edit', 'cmsEcosystemEdit', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/:id/view', 'cmsEcosystemView', 'cms-ecosystem'],
    ]);
    expect(matchPath('/cms/amrut-ecosystem/:id/view', ecosystemViewPath('p-1'))?.params.id).toBe('p-1');
    /* The former list page opens the tab. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/amrut-ecosystem', 'ecosystem']);
  });

  it('links each row to its View page at /cms/amrut-ecosystem/:id/view, beside its Edit page', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(ecosystemViewPath(id)).toBe(`/cms/amrut-ecosystem/${id}/view`);
    expect(ecosystemEditPath(id)).toBe(`/cms/amrut-ecosystem/${id}/edit`);
    expect(ECOSYSTEM_TAB_PATH).toBe('/cms/home-page?tab=ecosystem');
    /* An id is always one path segment, so a link can never reach another route. */
    expect(ecosystemViewPath('a/b?c')).toBe('/cms/amrut-ecosystem/a%2Fb%3Fc/view');
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-ecosystem.view']);
    expect(canDo(view, 'viewEcosystem')).toBe(true);
    for (const a of ['createEcosystemProgramme', 'updateEcosystemProgramme', 'deleteEcosystemProgramme'] as const)
      expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-ecosystem.create']), 'createEcosystemProgramme')).toBe(true);
    expect(canDo(new Set(['cms-ecosystem.update']), 'updateEcosystemProgramme')).toBe(true);
    expect(canDo(new Set(['cms-ecosystem.delete']), 'deleteEcosystemProgramme')).toBe(true);
  });
});

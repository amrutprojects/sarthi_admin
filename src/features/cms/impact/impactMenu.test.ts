import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import AS from '../../../legacy';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import { IMPACT_TAB_PATH, impactEditPath, impactViewPath } from './constants';

describe('AMRUT Impact Management menu', () => {
  it('is a tab of Home Page Management, directly after Board Members Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-impact');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-impact', l: 'AMRUT Impact Management', i: 'chart', r: '/cms/home-page?tab=impact' });
    /* In home page order: the impact figures come straight after the board. */
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-board');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-impact')).toBe(false);
    expect(sidebarKey('cms-impact')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS.find((t) => t.menu === 'cms-impact')).toEqual({ k: 'impact', l: "AMRUT's Impact", menu: 'cms-impact' });
  });

  it('uses an icon the legacy icon set draws, not its fallback for unknown names', () => {
    expect(AS.ui.icon('chart')).not.toBe(AS.ui.icon('no-such-icon'));
  });

  it('opens with cms-impact.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-impact.view']), 'cms-impact')).toBe(true);
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-impact')).toBe(false);
    expect(canOpen(new Set(['cms-impact.view']), 'cms-impact', new Set(['cms-impact']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-impact');
    expect(routes).toEqual([
      ['/cms/impact/create', 'cmsImpactCreate', 'cms-impact'],
      ['/cms/impact/settings', 'cmsImpactSettings', 'cms-impact'],
      ['/cms/impact/:id/edit', 'cmsImpactEdit', 'cms-impact'],
      ['/cms/impact/:id/view', 'cmsImpactView', 'cms-impact'],
    ]);
    expect(matchPath('/cms/impact/:id/view', impactViewPath('s-1'))?.params.id).toBe('s-1');
    /* The former list page opens the tab. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/impact', 'impact']);
  });

  it('links each row to its View page at /cms/impact/:id/view, beside its Edit page', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(impactViewPath(id)).toBe(`/cms/impact/${id}/view`);
    expect(impactEditPath(id)).toBe(`/cms/impact/${id}/edit`);
    expect(IMPACT_TAB_PATH).toBe('/cms/home-page?tab=impact');
    /* An id is always one path segment, so a link can never reach another route. */
    expect(impactViewPath('a/b?c')).toBe('/cms/impact/a%2Fb%3Fc/view');
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-impact.view']);
    expect(canDo(view, 'viewImpact')).toBe(true);
    for (const a of ['createImpactStat', 'updateImpactStat', 'deleteImpactStat'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-impact.create']), 'createImpactStat')).toBe(true);
    expect(canDo(new Set(['cms-impact.update']), 'updateImpactStat')).toBe(true);
    expect(canDo(new Set(['cms-impact.delete']), 'deleteImpactStat')).toBe(true);
  });
});

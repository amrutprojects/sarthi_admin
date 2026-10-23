import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import AS from '../../../legacy';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('AMRUT Impact Management menu', () => {
  it('sits in the CMS group of the sidebar, directly after AMRUT Schemes Management', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-impact');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-impact', l: 'AMRUT Impact Management', i: 'chart', r: '/cms/impact' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-schemes');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('uses an icon the legacy icon set draws, not its fallback for unknown names', () => {
    expect(AS.ui.icon('chart')).not.toBe(AS.ui.icon('no-such-icon'));
  });

  it('opens with cms-impact.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-impact.view']), 'cms-impact')).toBe(true);
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-impact')).toBe(false);
    expect(canOpen(new Set(['cms-impact.view']), 'cms-impact', new Set(['cms-impact']))).toBe(false);
  });

  it('routes the list, add, settings and edit pages, static paths before the :id pattern', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-impact')).toEqual([
      ['/cms/impact', 'cmsImpactList', 'cms-impact'],
      ['/cms/impact/create', 'cmsImpactCreate', 'cms-impact'],
      ['/cms/impact/settings', 'cmsImpactSettings', 'cms-impact'],
      ['/cms/impact/:id/edit', 'cmsImpactEdit', 'cms-impact'],
    ]);
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

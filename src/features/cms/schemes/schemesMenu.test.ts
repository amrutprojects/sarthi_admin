import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('AMRUT Schemes Management menu', () => {
  it('sits in the CMS group of the sidebar, after The AMRUT Ecosystem', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-schemes');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-schemes', l: 'AMRUT Schemes Management', i: 'clipboard', r: '/cms/amrut-schemes' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-ecosystem');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-schemes.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-schemes')).toBe(true);
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-schemes')).toBe(false);
    expect(canOpen(new Set(['cms-schemes.view']), 'cms-schemes', new Set(['cms-schemes']))).toBe(false);
  });

  it('routes the list, add, settings and edit pages, static paths before the :id pattern', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-schemes')).toEqual([
      ['/cms/amrut-schemes', 'cmsSchemesList', 'cms-schemes'],
      ['/cms/amrut-schemes/create', 'cmsSchemesCreate', 'cms-schemes'],
      ['/cms/amrut-schemes/settings', 'cmsSchemesSettings', 'cms-schemes'],
      ['/cms/amrut-schemes/:id/edit', 'cmsSchemesEdit', 'cms-schemes'],
    ]);
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

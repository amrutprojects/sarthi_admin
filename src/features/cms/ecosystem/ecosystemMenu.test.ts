import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('The AMRUT Ecosystem menu', () => {
  it('sits in the CMS group of the sidebar, after Board Members Management', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-ecosystem');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-ecosystem', l: 'The AMRUT Ecosystem', i: 'layers', r: '/cms/amrut-ecosystem' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-board');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-ecosystem.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-ecosystem')).toBe(true);
    expect(canOpen(new Set(['cms-board.view']), 'cms-ecosystem')).toBe(false);
    expect(canOpen(new Set(['cms-ecosystem.view']), 'cms-ecosystem', new Set(['cms-ecosystem']))).toBe(false);
  });

  it('routes the list, add, settings and edit pages, static paths before the :id pattern', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-ecosystem')).toEqual([
      ['/cms/amrut-ecosystem', 'cmsEcosystemList', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/create', 'cmsEcosystemCreate', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/settings', 'cmsEcosystemSettings', 'cms-ecosystem'],
      ['/cms/amrut-ecosystem/:id/edit', 'cmsEcosystemEdit', 'cms-ecosystem'],
    ]);
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

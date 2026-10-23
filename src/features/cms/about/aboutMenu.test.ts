import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('About AMRUT Management menu', () => {
  it('sits in the CMS group of the sidebar', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-about');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-about', l: 'About AMRUT Management', i: 'building', r: '/cms/about-amrut' });
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-about.view only, and respects Menu Visibility', () => {
    expect(canOpen(new Set(['cms-about.view']), 'cms-about')).toBe(true);
    expect(canOpen(new Set(['cms-board.view']), 'cms-about')).toBe(false);
    expect(canOpen(new Set(['cms-about.view']), 'cms-about', new Set(['cms-about']))).toBe(false);
  });

  it('routes the dashboard and the row / card editors, static paths before the :id patterns', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-about')).toEqual([
      ['/cms/about-amrut', 'cmsAboutDashboard', 'cms-about'],
      ['/cms/about-amrut/facts/create', 'cmsAboutFact', 'cms-about'],
      ['/cms/about-amrut/facts/:id/edit', 'cmsAboutFact', 'cms-about'],
      ['/cms/about-amrut/cards/create', 'cmsAboutCard', 'cms-about'],
      ['/cms/about-amrut/cards/:id/edit', 'cmsAboutCard', 'cms-about'],
    ]);
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-about.view']);
    expect(canDo(view, 'viewAbout')).toBe(true);
    for (const a of ['createAboutItem', 'updateAbout', 'deleteAboutItem'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-about.create']), 'createAboutItem')).toBe(true);
    expect(canDo(new Set(['cms-about.update']), 'updateAbout')).toBe(true);
    expect(canDo(new Set(['cms-about.delete']), 'deleteAboutItem')).toBe(true);
  });
});

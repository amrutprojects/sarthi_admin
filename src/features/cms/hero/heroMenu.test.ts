import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { ACTION_ACCESS, SCREEN_ACCESS, canDo, canOpen } from '../../../modules/auth/permissions';

describe('Home Hero Section menu', () => {
  it('sits in the CMS group of the sidebar, directly before Home Programme Section', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-hero');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-hero', l: 'Home Hero Section', i: 'home', r: '/cms/hero' });
    const next = NAV[at + 1];
    expect(next && !isNavGroup(next) ? next.k : '').toBe('cms-highlight');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-hero.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-hero.view']), 'cms-hero')).toBe(true);
    expect(canOpen(new Set(['cms-highlight.view']), 'cms-hero')).toBe(false);
    expect(canOpen(new Set(), 'cms-hero')).toBe(false);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-hero', new Set(['cms-hero']))).toBe(false);
  });

  it('routes the view and edit pages, and gates editing on cms-hero.update', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-hero');
    expect(routes).toEqual([
      ['/cms/hero', 'cmsHeroView', 'cms-hero'],
      ['/cms/hero/edit', 'cmsHeroEdit', 'cms-hero'],
    ]);
    /* A view-only administrator sees the section but gets no Edit or Publish. */
    expect(canDo(new Set(['cms-hero.view']), 'viewHero')).toBe(true);
    expect(canDo(new Set(['cms-hero.view']), 'updateHero')).toBe(false);
    expect(canDo(new Set(['cms-hero.view', 'cms-hero.update']), 'updateHero')).toBe(true);
    expect(canDo(new Set(['cms-highlight.update']), 'updateHero')).toBe(false);
  });

  /* Home Page Figures was merged into this section: no menu, route, screen rule or action of its own remains. */
  it('leaves nothing of the old Home Page Figures menu behind', () => {
    expect(NAV.some((n) => !isNavGroup(n) && (n.k === 'cms-home' || n.r.startsWith('/cms/home')))).toBe(false);
    expect(ADMIN_ROUTES.some(([path, , navKey]) => navKey === 'cms-home' || path.startsWith('/cms/home'))).toBe(false);
    expect(SCREEN_ACCESS['cms-home']).toBeUndefined();
    expect(Object.keys(ACTION_ACCESS)).not.toContain('viewHomeGlance');
    expect(Object.keys(ACTION_ACCESS)).not.toContain('updateHomeGlance');
    expect(Object.values(ACTION_ACCESS).some((codes) => codes.some((c) => c.startsWith('cms-home.')))).toBe(false);
  });
});

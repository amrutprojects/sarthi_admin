import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { ACTION_ACCESS, SCREEN_ACCESS, canDo, canOpen } from '../../../modules/auth/permissions';

describe('Home Hero Section menu', () => {
  it('is two tabs of Home Page Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-hero');
    expect(at).toBeGreaterThan(-1);
    /*
     * Still listed in NAV, so Roles & Permissions and Menu Visibility keep its row, under Home Page Management, the
     * top bar, the brand bar, the navigation menu and the announcements ticker above the hero.
     */
    expect(NAV[at]).toEqual({ k: 'cms-hero', l: 'Home Hero Section', i: 'home', r: '/cms/home-page?tab=hero' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-announcements');
    const menu = NAV[at - 2];
    expect(menu && !isNavGroup(menu) ? menu.k : '').toBe('cms-navmenu');
    const brand = NAV[at - 3];
    expect(brand && !isNavGroup(brand) ? brand.k : '').toBe('cms-brandbar');
    const before = NAV[at - 4];
    expect(before && !isNavGroup(before) ? before.k : '').toBe('cms-topbar');
    const first = NAV[at - 5];
    expect(first && !isNavGroup(first) ? first.k : '').toBe('cms-home-page');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-hero')).toBe(false);
    expect(sidebarKey('cms-hero')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS.filter((t) => t.menu === 'cms-hero').map((t) => [t.k, t.l])).toEqual([
      ['hero', 'Sarthi – apply online'],
      ['glance', 'Programme at a glance'],
    ]);
  });

  it('opens with cms-hero.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-hero.view']), 'cms-hero')).toBe(true);
    expect(canOpen(new Set(['cms-highlight.view']), 'cms-hero')).toBe(false);
    expect(canOpen(new Set(), 'cms-hero')).toBe(false);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-hero', new Set(['cms-hero']))).toBe(false);
  });

  it('routes the edit page under its own key, redirects its former page, and gates editing on cms-hero.update', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-hero');
    expect(routes).toEqual([['/cms/hero/edit', 'cmsHeroEdit', 'cms-hero']]);
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/hero', 'hero']);
    /* A view-only administrator sees the section but gets no Edit, nor its "Show on website" switches. */
    expect(canDo(new Set(['cms-hero.view']), 'viewHero')).toBe(true);
    expect(canDo(new Set(['cms-hero.view']), 'updateHero')).toBe(false);
    expect(canDo(new Set(['cms-hero.view', 'cms-hero.update']), 'updateHero')).toBe(true);
    expect(canDo(new Set(['cms-highlight.update']), 'updateHero')).toBe(false);
  });

  /* Home Page Figures was merged into this section: no menu, route, screen rule or action of its own remains. */
  it('leaves nothing of the old Home Page Figures menu behind', () => {
    const oldPath = (p: string) => p === '/cms/home' || p.startsWith('/cms/home/');
    expect(NAV.some((n) => !isNavGroup(n) && (n.k === 'cms-home' || oldPath(n.r)))).toBe(false);
    expect(ADMIN_ROUTES.some(([path, , navKey]) => navKey === 'cms-home' || oldPath(path))).toBe(false);
    expect(SCREEN_ACCESS['cms-home']).toBeUndefined();
    expect(Object.keys(ACTION_ACCESS)).not.toContain('viewHomeGlance');
    expect(Object.keys(ACTION_ACCESS)).not.toContain('updateHomeGlance');
    expect(Object.values(ACTION_ACCESS).some((codes) => codes.some((c) => c.startsWith('cms-home.')))).toBe(false);
  });
});

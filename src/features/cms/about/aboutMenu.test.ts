import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import { aboutCreatePath, aboutEditPath, aboutViewPath } from './constants';

describe('About AMRUT Management menu', () => {
  it('is the last tab of Home Page Management, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-about');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-about', l: 'About AMRUT Management', i: 'building', r: '/cms/home-page?tab=about' });
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-about')).toBe(false);
    expect(sidebarKey('cms-about')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS[HOME_PAGE_TABS.length - 1]).toEqual({ k: 'about', l: 'About AMRUT', menu: 'cms-about' });
  });

  it('opens with cms-about.view only, and respects Menu Visibility', () => {
    expect(canOpen(new Set(['cms-about.view']), 'cms-about')).toBe(true);
    expect(canOpen(new Set(['cms-board.view']), 'cms-about')).toBe(false);
    expect(canOpen(new Set(['cms-about.view']), 'cms-about', new Set(['cms-about']))).toBe(false);
  });

  it('routes the row / card editors and View pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-about');
    expect(routes).toEqual([
      ['/cms/about-amrut/facts/create', 'cmsAboutFact', 'cms-about'],
      ['/cms/about-amrut/facts/:id/edit', 'cmsAboutFact', 'cms-about'],
      ['/cms/about-amrut/facts/:id/view', 'cmsAboutFactView', 'cms-about'],
      ['/cms/about-amrut/cards/create', 'cmsAboutCard', 'cms-about'],
      ['/cms/about-amrut/cards/:id/edit', 'cmsAboutCard', 'cms-about'],
      ['/cms/about-amrut/cards/:id/view', 'cmsAboutCardView', 'cms-about'],
    ]);
    const paths = routes.map((r) => r[0]);
    /* Within each kind, the static `create` path comes before its :id patterns. */
    for (const kind of ['facts', 'cards'] as const) {
      const own = paths.filter((p) => p.startsWith(`/cms/about-amrut/${kind}/`));
      expect(own[0]).toBe(aboutCreatePath(kind));
      expect(own.slice(1).every((p) => p.includes(':id'))).toBe(true);
    }
    /* The eye button and a click on a row open the View page by the record's id; the pencil, the Edit page. */
    expect(aboutViewPath('facts', 'f-1')).toBe('/cms/about-amrut/facts/f-1/view');
    expect(aboutViewPath('cards', 'c-1')).toBe('/cms/about-amrut/cards/c-1/view');
    expect(aboutEditPath('cards', 'c-1')).toBe('/cms/about-amrut/cards/c-1/edit');
    for (const kind of ['facts', 'cards'] as const) {
      const view = paths.find((p) => p === `/cms/about-amrut/${kind}/:id/view`);
      if (view) expect(matchPath(view, aboutViewPath(kind, 'x-1'))?.params.id).toBe('x-1');
      expect(matchPath(`/cms/about-amrut/${kind}/:id/edit`, aboutEditPath(kind, 'x-1'))?.params.id).toBe('x-1');
    }
    /* The former dashboard opens the tab. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/about-amrut', 'about']);
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

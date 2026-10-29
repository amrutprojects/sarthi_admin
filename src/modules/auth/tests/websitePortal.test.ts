import { describe, expect, it } from 'vitest';
import { HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup } from '../../../constants/navigation';
import { canOpenPath, homeItem, homePath } from '../home';
import { MENU_GROUPS, SCREEN_ACCESS, WEBSITE_MENUS, canOpen } from '../permissions';

const WEBSITE = new Set(WEBSITE_MENUS.flatMap((m) => [`${m}.view`, `${m}.update`]));
const keysOf = (entries: typeof NAV) => entries.filter((n) => !isNavGroup(n)).map((n) => (n as { k: string }).k);
const NAV_KEYS = keysOf(NAV);
const SIDEBAR_KEYS = keysOf(SIDEBAR_NAV);
const HOME_PAGE_MENUS = [
  'cms-topbar',
  'cms-brandbar',
  'cms-announcements',
  'cms-hero',
  'cms-highlight',
  'cms-board',
  'cms-impact',
  'cms-ecosystem',
  'cms-schemes',
  'cms-about',
];

describe('the website portal (Website Admin)', () => {
  it('opens exactly the CMS menu, in sidebar order', () => {
    /* Every menu of the role, Home Page Management's ten included (they keep their keys and permissions), and nothing else. */
    expect(NAV_KEYS.filter((k) => canOpen(WEBSITE, k, undefined, 'website'))).toEqual(
      NAV_KEYS.filter((k) => WEBSITE_MENUS.includes(k) || k in MENU_GROUPS),
    );
    expect([...WEBSITE_MENUS].sort()).toEqual(NAV_KEYS.filter((k) => WEBSITE_MENUS.includes(k)).sort());
    expect(WEBSITE_MENUS).toEqual(expect.arrayContaining(['cms-topbar', 'cms-announcements', 'cms-board', 'cms-ecosystem', 'cms-schemes', 'cms-about']));
    /* The top bar is the strip above the whole page, the brand bar sits under it and the announcements ticker comes next, so they lead the home page menus. */
    expect(WEBSITE_MENUS.filter((m) => HOME_PAGE_MENUS.includes(m))).toEqual(HOME_PAGE_MENUS);
    /* The sidebar: the CMS entries, the ten home page menus gathered under one Home Page Management entry. */
    expect(SIDEBAR_KEYS.filter((k) => canOpen(WEBSITE, k, undefined, 'website'))).toEqual([
      'cms-home-page',
      'cms-programme',
      'cms-modules',
      'cms-eligibility',
      'cms-apply',
      'cms-faqs',
      'cms-contact',
      'cms-footer',
      'cms-states',
      'cms-districts',
      'cms-talukas',
    ]);
  });

  it('closes the screens open to every signed-in user, and every other menu whatever is granted', () => {
    expect(canOpen(new Set(), 'verify', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(), 'pubhome', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['dashboard.view', 'users.view']), 'dashboard', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['users.view']), 'users', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['cms-departments.view']), 'cms-departments', undefined, 'website')).toBe(false);
  });

  it('still needs the menu’s own view permission and respects Menu Visibility', () => {
    expect(canOpen(new Set(['cms-faqs.view']), 'cms-faqs', undefined, 'website')).toBe(true);
    expect(canOpen(new Set(['cms-faqs.view']), 'cms-states', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['cms-faqs.view']), 'cms-faqs', new Set(['cms-faqs']), 'website')).toBe(false);
  });

  it('leaves the full panel unchanged', () => {
    expect(canOpen(new Set(), 'verify')).toBe(true);
    expect(canOpen(new Set(['dashboard.view']), 'dashboard')).toBe(true);
    expect(canOpen(new Set(['cms-departments.view']), 'cms-departments', undefined, 'admin')).toBe(true);
  });
});

describe('Home Page Management', () => {
  it('gathers the ten home page menus, the same ones as its tabs', () => {
    expect(MENU_GROUPS['cms-home-page']).toEqual(HOME_PAGE_MENUS);
    expect([...new Set(HOME_PAGE_TABS.map((t) => t.menu))]).toEqual(HOME_PAGE_MENUS);
    /* No permission code of its own: its screen rule is any one of the ten view codes. */
    expect(SCREEN_ACCESS['cms-home-page']).toEqual(HOME_PAGE_MENUS.map((m) => `${m}.view`));
    expect(WEBSITE_MENUS).not.toContain('cms-home-page');
  });

  it('opens when any one of its menus opens, in either portal', () => {
    for (const menu of HOME_PAGE_MENUS) {
      expect(canOpen(new Set([`${menu}.view`]), 'cms-home-page')).toBe(true);
      expect(canOpen(new Set([`${menu}.view`]), 'cms-home-page', undefined, 'website')).toBe(true);
    }
    expect(canOpen(new Set(['cms-faqs.view', 'cms-programme.view']), 'cms-home-page')).toBe(false);
    expect(canOpen(new Set(), 'cms-home-page')).toBe(false);
    /* An update code alone opens no menu, so no Home Page Management either. */
    expect(canOpen(new Set(['cms-hero.update']), 'cms-home-page')).toBe(false);
  });

  it('closes when Menu Visibility hides every menu the user holds', () => {
    const codes = new Set(['cms-board.view', 'cms-about.view']);
    expect(canOpen(codes, 'cms-home-page', new Set(['cms-board']))).toBe(true);
    expect(canOpen(codes, 'cms-home-page', new Set(['cms-board', 'cms-about']))).toBe(false);
    expect(canOpen(codes, 'cms-home-page', new Set(['cms-board', 'cms-about']), 'website')).toBe(false);
  });
});

describe('start screen', () => {
  it('is the Dashboard for programme roles', () => {
    expect(homePath({ permissions: new Set(['dashboard.view', 'cms-faqs.view']) })).toBe('/dashboard');
  });

  it('is the first CMS page a Website Admin may open', () => {
    expect(homePath({ permissions: WEBSITE, portal: 'website' })).toBe('/cms/home-page');
    expect(homeItem({ permissions: new Set(['cms-faqs.view']), portal: 'website' })).toMatchObject({ k: 'cms-faqs', r: '/cms/faqs' });
    /* With all ten home page menus hidden, the next CMS page in website order. */
    expect(homePath({ permissions: WEBSITE, hiddenMenus: new Set(HOME_PAGE_MENUS), portal: 'website' })).toBe('/cms/programme');
    /* The announcements ticker alone opens Home Page Management too, and so does the top bar. */
    expect(homePath({ permissions: new Set(['cms-announcements.view']), portal: 'website' })).toBe('/cms/home-page');
    expect(homePath({ permissions: new Set(['cms-topbar.view']), portal: 'website' })).toBe('/cms/home-page');
  });

  it('is Home Page Management when a home page section is the first CMS screen', () => {
    expect(homeItem({ permissions: new Set(['cms-board.view', 'cms-states.view']), portal: 'website' })).toMatchObject({
      k: 'cms-home-page',
      l: 'Home Page Management',
      r: '/cms/home-page',
    });
    expect(homePath({ permissions: new Set(['cms-about.view']), portal: 'website' })).toBe('/cms/home-page');
    /* A hidden section is skipped like any hidden menu. */
    expect(
      homePath({ permissions: new Set(['cms-about.view', 'cms-states.view']), hiddenMenus: new Set(['cms-about']), portal: 'website' }),
    ).toBe('/cms/states');
    /* Never the address of a single section's tab. */
    expect(homePath({ permissions: new Set(['cms-hero.view']), portal: 'website' })).toBe('/cms/home-page');
  });

  it('is never a link out to the public site, and falls back to the Dashboard', () => {
    expect(homePath({ permissions: new Set() })).toBe('/dashboard');
    expect(homePath({ permissions: new Set(), portal: 'website' })).toBe('/dashboard');
  });
});

describe('canOpenPath', () => {
  const wa = { permissions: WEBSITE, portal: 'website' as const };
  it('matches a path to its screen', () => {
    expect(canOpenPath('/cms/faqs/123/edit', wa)).toBe(true);
    expect(canOpenPath('/cms/contact?tab=1', wa)).toBe(true);
    expect(canOpenPath('/cms/home-page?tab=board', wa)).toBe(true);
    expect(canOpenPath('/cms/board-members/123/edit', wa)).toBe(true);
    expect(canOpenPath('/cms/amrut-ecosystem/settings', wa)).toBe(true);
    expect(canOpenPath('/cms/amrut-schemes/create', wa)).toBe(true);
    expect(canOpenPath('/cms/top-bar/create', wa)).toBe(true);
    expect(canOpenPath('/cms/top-bar/123/view', wa)).toBe(true);
    expect(canOpenPath('/cms/announcements/create', wa)).toBe(true);
    expect(canOpenPath('/cms/announcements/123/view', wa)).toBe(true);
    expect(canOpenPath('/cms/about-amrut/facts/create', wa)).toBe(true);
    expect(canOpenPath('/dashboard', wa)).toBe(false);
    expect(canOpenPath('/users', wa)).toBe(false);
    expect(canOpenPath('/no-such-page', wa)).toBe(false);
    expect(canOpenPath('/dashboard', { permissions: new Set(['dashboard.view']) })).toBe(true);
  });

  it('follows a home page section’s former page to its menu', () => {
    expect(canOpenPath('/cms/board-members', wa)).toBe(true);
    expect(canOpenPath('/cms/hero', wa)).toBe(true);
    const boardOnly = { permissions: new Set(['cms-board.view']), portal: 'website' as const };
    expect(canOpenPath('/cms/board-members', boardOnly)).toBe(true);
    expect(canOpenPath('/cms/impact', boardOnly)).toBe(false);
    expect(canOpenPath('/cms/impact/settings', boardOnly)).toBe(false);
    expect(canOpenPath('/cms/home-page', boardOnly)).toBe(true);
    expect(canOpenPath('/cms/announcements', wa)).toBe(true);
    expect(canOpenPath('/cms/announcements', boardOnly)).toBe(false);
    expect(canOpenPath('/cms/top-bar', wa)).toBe(true);
    expect(canOpenPath('/cms/top-bar', boardOnly)).toBe(false);
    expect(canOpenPath('/cms/top-bar/settings', boardOnly)).toBe(false);
  });
});

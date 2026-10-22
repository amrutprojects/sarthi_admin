import { describe, expect, it } from 'vitest';
import { NAV, isNavGroup } from '../../../constants/navigation';
import { canOpenPath, homeItem, homePath } from '../home';
import { WEBSITE_MENUS, canOpen } from '../permissions';

const WEBSITE = new Set(WEBSITE_MENUS.flatMap((m) => [`${m}.view`, `${m}.update`]));
const NAV_KEYS = NAV.filter((n) => !isNavGroup(n)).map((n) => (n as { k: string }).k);

describe('the website portal (Website Admin)', () => {
  it('opens exactly the CMS menu, in sidebar order', () => {
    expect(NAV_KEYS.filter((k) => canOpen(WEBSITE, k, undefined, 'website'))).toEqual(NAV_KEYS.filter((k) => WEBSITE_MENUS.includes(k)));
    expect([...WEBSITE_MENUS].sort()).toEqual(NAV_KEYS.filter((k) => WEBSITE_MENUS.includes(k)).sort());
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

describe('start screen', () => {
  it('is the Dashboard for programme roles', () => {
    expect(homePath({ permissions: new Set(['dashboard.view', 'cms-faqs.view']) })).toBe('/dashboard');
  });

  it('is the first CMS page a Website Admin may open', () => {
    expect(homePath({ permissions: WEBSITE, portal: 'website' })).toBe('/cms/contact');
    expect(homeItem({ permissions: new Set(['cms-faqs.view']), portal: 'website' })).toMatchObject({ k: 'cms-faqs', r: '/cms/faqs' });
    expect(homePath({ permissions: WEBSITE, hiddenMenus: new Set(['cms-contact']), portal: 'website' })).toBe('/cms/footer');
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
    expect(canOpenPath('/dashboard', wa)).toBe(false);
    expect(canOpenPath('/users', wa)).toBe(false);
    expect(canOpenPath('/no-such-page', wa)).toBe(false);
    expect(canOpenPath('/dashboard', { permissions: new Set(['dashboard.view']) })).toBe(true);
  });
});

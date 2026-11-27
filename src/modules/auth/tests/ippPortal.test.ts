import { describe, expect, it } from 'vitest';
import { NAV, SIDEBAR_NAV, isNavGroup } from '../../../constants/navigation';
import { canOpenPath, homeItem, homePath } from '../home';
import { IPP_OFFICER_MENUS, canOpen } from '../permissions';

/* What the API grants each IPP officer role (sarthi-api role.constants.ts). */
const OFFICERS: Record<string, Set<string>> = {
  'Divisional Officer': new Set(['ipp-approvals.view', 'ipp-approvals.division-officer']),
  COEP: new Set(['ipp-approvals.view', 'ipp-approvals.coep']),
  'Head Officer': new Set(['ipp-approvals.view', 'ipp-approvals.head-office']),
};
const keysOf = (entries: typeof NAV) => entries.filter((n) => !isNavGroup(n)).map((n) => (n as { k: string }).k);
const NAV_KEYS = keysOf(NAV);
const SIDEBAR_KEYS = keysOf(SIDEBAR_NAV);
/* Shown to every signed-in user of the full panel: no permission code of their own. */
const OPEN_TO_ALL = ['verify', 'pubhome', 'pubprog'];

describe.each(Object.entries(OFFICERS))('the IPP portal (%s)', (_role, codes) => {
  it('opens IPP Approvals’ Applications and nothing else', () => {
    expect(NAV_KEYS.filter((k) => canOpen(codes, k, undefined, 'ipp'))).toEqual(['ipp-approvals']);
    expect(SIDEBAR_KEYS.filter((k) => canOpen(codes, k, undefined, 'ipp'))).toEqual(['ipp-approvals']);
  });

  it('starts on Applications', () => {
    expect(homeItem({ permissions: codes, portal: 'ipp' }).k).toBe('ipp-approvals');
    expect(homePath({ permissions: codes, portal: 'ipp' })).toBe('/ipp-approvals');
  });

  it('opens the Applications pages by direct URL and no other screen', () => {
    const access = { permissions: codes, portal: 'ipp' as const };
    for (const path of ['/ipp-approvals', '/ipp-approvals/applications/a1', '/ipp-approvals/batches', '/ipp-approvals/batches/b1'])
      expect([path, canOpenPath(path, access)]).toEqual([path, true]);
    for (const path of [
      '/dashboard',
      '/certification',
      '/assessments',
      '/ipp-officers',
      '/users',
      '/cms/faqs',
      '/verify',
      '/home',
      '/programme',
    ])
      expect([path, canOpenPath(path, access)]).toEqual([path, false]);
  });
});

describe('the IPP portal', () => {
  it('closes Certificate Verification and the public site links, which the full panel shows to everyone', () => {
    for (const k of OPEN_TO_ALL) {
      expect([k, canOpen(new Set(), k)]).toEqual([k, true]);
      expect([k, canOpen(OFFICERS.COEP, k, undefined, 'ipp')]).toEqual([k, false]);
    }
  });

  it('closes every other menu whatever is granted, the Divisional Officer Mapping included', () => {
    const lots = new Set([
      'ipp-approvals.view',
      'ipp-officers.view',
      'dashboard.view',
      'certification.view',
      'assessments.view',
      'users.view',
    ]);
    for (const k of ['ipp-officers', 'dashboard', 'certification', 'assessments', 'users'])
      expect([k, canOpen(lots, k, undefined, 'ipp')]).toEqual([k, false]);
    expect(canOpen(lots, 'ipp-approvals', undefined, 'ipp')).toBe(true);
    expect(IPP_OFFICER_MENUS).toEqual(['ipp-approvals']);
  });

  it('still needs the view permission and respects Menu Visibility', () => {
    expect(canOpen(new Set(), 'ipp-approvals', undefined, 'ipp')).toBe(false);
    expect(canOpen(OFFICERS.COEP, 'ipp-approvals', new Set(['ipp-approvals']), 'ipp')).toBe(false);
  });

  it('leaves the full panel and the website portal as they were', () => {
    const admin = new Set(['dashboard.view', 'ipp-approvals.view', 'ipp-officers.view', 'certification.view']);
    for (const k of ['dashboard', 'ipp-approvals', 'ipp-officers', 'certification', ...OPEN_TO_ALL])
      expect([k, canOpen(admin, k)]).toEqual([k, true]);
    expect(canOpen(new Set(['ipp-approvals.view']), 'ipp-approvals', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['cms-faqs.view']), 'cms-faqs', undefined, 'website')).toBe(true);
  });
});

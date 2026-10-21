import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('Programme Page Management menu', () => {
  it('sits in the CMS group of the sidebar', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-programme');
    expect(at).toBeGreaterThan(-1);
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-programme.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-programme.view']), 'cms-programme')).toBe(true);
    expect(canOpen(new Set(['cms-modules.view']), 'cms-programme')).toBe(false);
    expect(canOpen(new Set(['cms-programme.view']), 'cms-programme', new Set(['cms-programme']))).toBe(false);
  });

  it('routes the view and edit pages, and gates editing on cms-programme.update', () => {
    const paths = ADMIN_ROUTES.filter((r) => r[2] === 'cms-programme').map((r) => r[0]);
    expect(paths).toEqual(['/cms/programme', '/cms/programme/edit']);
    expect(canDo(new Set(['cms-programme.update']), 'updateProgrammePage')).toBe(true);
    expect(canDo(new Set(['cms-programme.view']), 'updateProgrammePage')).toBe(false);
  });
});

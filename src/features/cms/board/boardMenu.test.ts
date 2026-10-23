import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';

describe('Board Members Management menu', () => {
  it('sits in the CMS group of the sidebar, after Home Programme Section', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-board');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-board', l: 'Board Members Management', i: 'users', r: '/cms/board-members' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-highlight');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);
  });

  it('opens with cms-board.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-board.view']), 'cms-board')).toBe(true);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-board')).toBe(false);
    expect(canOpen(new Set(), 'cms-board')).toBe(false);
    expect(canOpen(new Set(['cms-board.view']), 'cms-board', new Set(['cms-board']))).toBe(false);
  });

  it('routes the list, add, settings and edit pages, static paths before the :id pattern', () => {
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-board')).toEqual([
      ['/cms/board-members', 'cmsBoardList', 'cms-board'],
      ['/cms/board-members/create', 'cmsBoardCreate', 'cms-board'],
      ['/cms/board-members/settings', 'cmsBoardSettings', 'cms-board'],
      ['/cms/board-members/:id/edit', 'cmsBoardEdit', 'cms-board'],
    ]);
  });

  it('gates each action on its own permission', () => {
    const view = new Set(['cms-board.view']);
    expect(canDo(view, 'viewBoardMembers')).toBe(true);
    for (const a of ['createBoardMember', 'updateBoardMember', 'deleteBoardMember'] as const) expect(canDo(view, a)).toBe(false);
    expect(canDo(new Set(['cms-board.create']), 'createBoardMember')).toBe(true);
    expect(canDo(new Set(['cms-board.update']), 'updateBoardMember')).toBe(true);
    expect(canDo(new Set(['cms-board.delete']), 'deleteBoardMember')).toBe(true);
    expect(canDo(new Set(['cms-hero.update']), 'updateBoardMember')).toBe(false);
  });
});

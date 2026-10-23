import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, HOME_PAGE_REDIRECTS, HOME_PAGE_TABS, NAV, SIDEBAR_NAV, isNavGroup, sidebarKey } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import { boardMemberEditPath, boardMemberViewPath } from './constants';

describe('Board Members Management menu', () => {
  it('is a tab of Home Page Management, after Home Programme Section, and no sidebar entry of its own', () => {
    const at = NAV.findIndex((n) => !isNavGroup(n) && n.k === 'cms-board');
    expect(at).toBeGreaterThan(-1);
    expect(NAV[at]).toEqual({ k: 'cms-board', l: 'Board Members Management', i: 'users', r: '/cms/home-page?tab=board' });
    const prev = NAV[at - 1];
    expect(prev && !isNavGroup(prev) ? prev.k : '').toBe('cms-highlight');
    const group = NAV.slice(0, at)
      .reverse()
      .find((n) => isNavGroup(n));
    expect(group && isNavGroup(group) ? group.g : '').toMatch(/cms/i);

    expect(SIDEBAR_NAV.some((n) => !isNavGroup(n) && n.k === 'cms-board')).toBe(false);
    expect(sidebarKey('cms-board')).toBe('cms-home-page');
    expect(HOME_PAGE_TABS.find((t) => t.menu === 'cms-board')).toEqual({
      k: 'board',
      l: 'Leadership & Governing Board',
      menu: 'cms-board',
    });
  });

  it('opens with cms-board.view, and is hidden without it or when Menu Visibility hides it', () => {
    expect(canOpen(new Set(['cms-board.view']), 'cms-board')).toBe(true);
    expect(canOpen(new Set(['cms-hero.view']), 'cms-board')).toBe(false);
    expect(canOpen(new Set(), 'cms-board')).toBe(false);
    expect(canOpen(new Set(['cms-board.view']), 'cms-board', new Set(['cms-board']))).toBe(false);
  });

  it('routes the add, settings, edit and view pages under its own key, static paths before the :id patterns', () => {
    const routes = ADMIN_ROUTES.filter((r) => r[2] === 'cms-board');
    expect(routes).toEqual([
      ['/cms/board-members/create', 'cmsBoardCreate', 'cms-board'],
      ['/cms/board-members/settings', 'cmsBoardSettings', 'cms-board'],
      ['/cms/board-members/:id/edit', 'cmsBoardEdit', 'cms-board'],
      ['/cms/board-members/:id/view', 'cmsBoardView', 'cms-board'],
    ]);
    /* The eye button and a click on a row open the View page by the member's id. */
    expect(boardMemberViewPath('m-1')).toBe('/cms/board-members/m-1/view');
    expect(boardMemberEditPath('m-1')).toBe('/cms/board-members/m-1/edit');
    expect(matchPath('/cms/board-members/:id/view', boardMemberViewPath('m-1'))?.params.id).toBe('m-1');
    /* The former list page opens the tab. */
    expect(HOME_PAGE_REDIRECTS).toContainEqual(['/cms/board-members', 'board']);
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

import { screen, within } from '@testing-library/react';
import { matchPath } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ADMIN_ROUTES, NAV, SIDEBAR_NAV, isNavGroup } from '../../../constants/navigation';
import Sidebar from '../../../layouts/components/Sidebar';
import { ACTION_ACCESS, SCREEN_ACCESS, canDo, canOpen, homePath } from '../../auth';

let permissions = new Set<string>();
let hiddenMenus = new Set<string>();
let portal = 'admin';
vi.mock('../../auth/auth-context', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuth: () => ({ permissions, hiddenMenus, portal }),
}));

beforeEach(() => {
  permissions = new Set();
  hiddenMenus = new Set();
  portal = 'admin';
});
const sidebar = () => {
  renderWithProviders(<Sidebar active="ipp-approvals" collapsed={false} open={false} onToggle={() => undefined} />);
  return screen.getByRole('complementary');
};
const OFFICER = ['ipp-approvals.view', 'ipp-approvals.division-officer'];

describe('IPP approvals — menu and permissions', () => {
  it('is a menu group of its own with two entries', () => {
    const groups = NAV.filter(isNavGroup).map((n) => n.g);
    expect(groups.filter((g) => g === 'IPP Approvals')).toHaveLength(1);
    const at = SIDEBAR_NAV.findIndex((n) => isNavGroup(n) && n.g === 'IPP Approvals');
    expect(SIDEBAR_NAV.slice(at + 1, at + 3)).toEqual([
      expect.objectContaining({ k: 'ipp-approvals', l: 'Applications', r: '/ipp-approvals' }),
      expect.objectContaining({ k: 'ipp-officers', l: 'Divisional Officer Mapping', r: '/ipp-officers' }),
    ]);
    expect(isNavGroup(SIDEBAR_NAV[at + 3])).toBe(true);
  });

  it('shows the entries only with their view permission, and drops the empty group', () => {
    permissions = new Set(['dashboard.view']);
    const none = sidebar();
    expect(within(none).queryByText('IPP Approvals')).not.toBeInTheDocument();
    expect(within(none).queryByText('Divisional Officer Mapping')).not.toBeInTheDocument();
  });

  it('shows an officer Applications but not Divisional Officer Mapping', () => {
    permissions = new Set(OFFICER);
    const menu = sidebar();
    expect(within(menu).getByText('IPP Approvals')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Applications' })).toHaveClass('active');
    expect(within(menu).queryByRole('button', { name: 'Divisional Officer Mapping' })).not.toBeInTheDocument();
  });

  it('follows Menu Visibility and stays out of the website portal', () => {
    expect(canOpen(new Set(OFFICER), 'ipp-approvals', new Set(['ipp-approvals']))).toBe(false);
    expect(canOpen(new Set([...OFFICER, 'ipp-officers.view']), 'ipp-approvals', undefined, 'website')).toBe(false);
    expect(canOpen(new Set(['ipp-officers.view']), 'ipp-officers')).toBe(true);
    expect(canOpen(new Set(OFFICER), 'ipp-officers')).toBe(false);
    /* Deciding alone opens nothing: the API wants the view permission for every list. */
    expect(canOpen(new Set(['ipp-approvals.coep']), 'ipp-approvals')).toBe(false);
  });

  it('closes every screen without its permission', () => {
    expect(SCREEN_ACCESS['ipp-approvals']).toEqual(['ipp-approvals.view']);
    expect(SCREEN_ACCESS['ipp-officers']).toEqual(['ipp-officers.view']);
  });

  it('is the start screen of a user who has nothing else', () => {
    expect(homePath({ permissions: new Set(OFFICER) })).toBe('/ipp-approvals');
  });

  it.each([
    ['/ipp-approvals', 'ippApplications', 'ipp-approvals'],
    ['/ipp-approvals/applications/app-1', 'ippApplicationDetail', 'ipp-approvals'],
    ['/ipp-approvals/batches', 'ippBatches', 'ipp-approvals'],
    ['/ipp-approvals/batches/b-1', 'ippBatchDetail', 'ipp-approvals'],
    ['/ipp-officers', 'ippOfficers', 'ipp-officers'],
  ])('%s opens %s under %s', (path, name, navKey) => {
    expect(ADMIN_ROUTES.find(([p]) => matchPath(p, path))?.slice(1)).toEqual([name, navKey]);
  });

  it('maps the actions to the permission codes of the API', () => {
    expect(ACTION_ACCESS.decideIppDivision).toEqual(['ipp-approvals.division-officer']);
    expect(ACTION_ACCESS.decideIppCoep).toEqual(['ipp-approvals.coep']);
    expect(ACTION_ACCESS.decideIppHeadOffice).toEqual(['ipp-approvals.head-office']);
    expect(canDo(new Set(['ipp-officers.view']), 'updateIppOfficers')).toBe(false);
    expect(canDo(new Set(['ipp-officers.update']), 'updateIppOfficers')).toBe(true);
    expect(canDo(new Set(['settings.view']), 'editSettings')).toBe(false);
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import WebsiteAdminsTab from '../components/WebsiteAdminsTab';
import { userApi } from '../services/userApi';
import type { User, UserListParams } from '../types/user.types';

/* The module's collaborators are replaced at their public boundaries. */
const permissions = new Set<string>();
const roles = { data: [] as { id: string; code: string; name: string; isActive: boolean }[], isPending: false, isError: false };
vi.mock('../../auth', () => ({
  WEBSITE_ADMIN_ROLE: 'WEBSITE_ADMIN',
  useAuth: () => ({ user: { id: 'me' }, permissions }),
  useCan: () => (action: string) => permissions.has(action),
}));
vi.mock('../../roles-permissions', () => ({
  useRoles: () => roles,
  WebsiteAdminPermissions: () => <div>Website Admin permissions matrix</div>,
}));
vi.mock('../services/userApi', () => ({
  userApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), replaceRoles: vi.fn() },
}));

const WEB = { id: 'r-web', code: 'WEBSITE_ADMIN', name: 'Website Admin', isActive: true };
const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Meera Joshi',
  email: 'meera@example.org',
  isActive: true,
  lastLoginAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});
const page = (items: User[]) => ({ items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } });
/* With roles.view the API includes each user's roles. */
const websiteAdmins = [user({ roles: [{ id: 'r-web', code: 'WEBSITE_ADMIN', name: 'Website Admin' }] })];
const others = [user({ id: 'u2', name: 'Ravi Kale', email: 'ravi@example.org', roles: [{ id: 'r-viewer', code: 'VIEWER', name: 'Viewer' }] })];

describe('<WebsiteAdminsTab>', () => {
  beforeEach(() => {
    permissions.clear();
    roles.data = [WEB, { id: 'r-viewer', code: 'VIEWER', name: 'Viewer', isActive: true }];
    vi.mocked(userApi.list).mockReset();
    vi.mocked(userApi.list).mockImplementation(async (p: UserListParams) => page(p.roleId ? websiteAdmins : [...websiteAdmins, ...others]));
    vi.mocked(userApi.create).mockReset();
    vi.mocked(userApi.replaceRoles).mockReset();
  });

  it('lists only the holders of the Website Admin role, with its permissions below', async () => {
    renderWithProviders(<WebsiteAdminsTab />);
    expect(await screen.findByText('Meera Joshi')).toBeInTheDocument();
    expect(screen.queryByText('Ravi Kale')).not.toBeInTheDocument();
    expect(userApi.list).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-web', page: 1 }), expect.anything());
    expect(screen.getByText('Website Admin permissions matrix')).toBeInTheDocument();
  });

  it('explains when the role has not been seeded', () => {
    roles.data = [];
    renderWithProviders(<WebsiteAdminsTab />);
    expect(screen.getByText(/Website Admin role does not exist yet/)).toBeInTheDocument();
    expect(userApi.list).not.toHaveBeenCalled();
  });

  it('shows actions only for the permissions the user holds', async () => {
    renderWithProviders(<WebsiteAdminsTab />);
    await screen.findByText('Meera Joshi');
    expect(screen.queryByRole('button', { name: /Add Website Admin/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign existing user' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove access' })).not.toBeInTheDocument();
  });

  it('creates an account that holds exactly the Website Admin role', async () => {
    permissions.add('createUser');
    permissions.add('assignRoles');
    vi.mocked(userApi.create).mockResolvedValue(user({ id: 'u9' }));
    renderWithProviders(<WebsiteAdminsTab />);
    await userEvent.click(await screen.findByRole('button', { name: /Add Website Admin/ }));
    const dialog = screen.getByRole('form', { name: 'Add user' });
    expect(within(dialog).queryByText('Roles')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Full name'), 'Sana Shaikh');
    await userEvent.type(within(dialog).getByLabelText('Email'), 'sana@example.org');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'Website-Admin-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));
    await waitFor(() =>
      expect(userApi.create).toHaveBeenCalledWith(
        { name: 'Sana Shaikh', email: 'sana@example.org', password: 'Website-Admin-1', roleIds: ['r-web'] },
        expect.any(String),
      ),
    );
  });

  it('turns an existing user into a Website Admin, replacing their roles', async () => {
    permissions.add('assignRoles');
    vi.mocked(userApi.replaceRoles).mockResolvedValue([]);
    renderWithProviders(<WebsiteAdminsTab />);
    await userEvent.click(await screen.findByRole('button', { name: 'Assign existing user' }));
    const group = await screen.findByRole('radiogroup', { name: 'Users' });
    /* Already a Website Admin: not offered. */
    expect(within(group).queryByText('Meera Joshi')).not.toBeInTheDocument();
    await userEvent.click(within(group).getByRole('radio'));
    expect(screen.getByText(/current roles \(Viewer\) are replaced/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Make Website Admin' }));
    await waitFor(() => expect(userApi.replaceRoles).toHaveBeenCalledWith('u2', ['r-web']));
  });

  it('removes Website Admin access by clearing the account’s roles', async () => {
    permissions.add('assignRoles');
    vi.mocked(userApi.replaceRoles).mockResolvedValue([]);
    renderWithProviders(<WebsiteAdminsTab />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove access' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove access' }));
    await waitFor(() => expect(userApi.replaceRoles).toHaveBeenCalledWith('u1', []));
  });
});

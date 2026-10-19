import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import UsersTab from '../components/UsersTab';
import { userApi } from '../services/userApi';
import type { User } from '../types/user.types';

/* The module's collaborators are replaced at their public boundaries. */
const permissions = new Set<string>();
vi.mock('../../auth', () => ({
  useAuth: () => ({ user: { id: 'me' }, permissions }),
  useCan: () => (action: string) => permissions.has(action),
}));
vi.mock('../../roles-permissions', () => ({ useRoles: () => ({ data: [], isPending: false }) }));
vi.mock('../services/userApi', () => ({
  userApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), replaceRoles: vi.fn() },
}));

const user = (over: Partial<User> = {}): User => ({
  id: 'u1', name: 'Asha Patil', email: 'asha@example.org', isActive: true, lastLoginAt: null, createdAt: '', updatedAt: '', ...over,
});
const page = (items: User[]) => ({ items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } });

describe('<UsersTab>', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(userApi.list).mockReset();
  });

  it('shows a loading state, then the users', async () => {
    vi.mocked(userApi.list).mockResolvedValue(page([user(), user({ id: 'u2', name: 'Ravi Kale', isActive: false })]));
    renderWithProviders(<UsersTab />);
    expect(screen.getByLabelText('Loading users')).toBeInTheDocument();
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kale')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    vi.mocked(userApi.list).mockResolvedValue(page([]));
    renderWithProviders(<UsersTab />);
    expect(await screen.findByText('No user accounts yet.')).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    vi.mocked(userApi.list).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<UsersTab />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(userApi.list).mockResolvedValue(page([user()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
  });

  it('shows "not permitted" when the API answers 403', async () => {
    vi.mocked(userApi.list).mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderWithProviders(<UsersTab />);
    expect(await screen.findByText(/do not have permission to view user accounts/)).toBeInTheDocument();
  });

  it('shows actions only for the permissions the user holds', async () => {
    vi.mocked(userApi.list).mockResolvedValue(page([user()]));
    const { unmount } = renderWithProviders(<UsersTab />);
    await screen.findByText('Asha Patil');
    expect(screen.queryByRole('button', { name: /Add user/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    unmount();

    permissions.add('createUser');
    permissions.add('deleteUser');
    renderWithProviders(<UsersTab />);
    await screen.findByText('Asha Patil');
    expect(screen.getByRole('button', { name: /Add user/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('passes search and status filters to the API', async () => {
    vi.mocked(userApi.list).mockResolvedValue(page([user()]));
    renderWithProviders(<UsersTab />);
    await screen.findByText('Asha Patil');
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'inactive');
    await userEvent.type(screen.getByLabelText('Search users'), 'ravi');
    await waitFor(() =>
      expect(userApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'ravi', isActive: false, page: 1 }), expect.anything()),
    );
  });
});

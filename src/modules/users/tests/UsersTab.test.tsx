import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
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
  userApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), replaceRoles: vi.fn() },
}));

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Asha Patil',
  email: 'asha@example.org',
  isActive: true,
  lastLoginAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
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

  it('sends a corrected new user with a new Idempotency-Key after a refusal (e2e 24 Nov 2026)', async () => {
    permissions.add('createUser');
    vi.mocked(userApi.list).mockResolvedValue(page([]));
    vi.mocked(userApi.create)
      .mockReset()
      .mockRejectedValueOnce(new ApiError('Not permitted: You cannot assign this role', 403, 'FORBIDDEN'))
      .mockResolvedValueOnce(user({ id: 'u9' }));
    renderWithProviders(<UsersTab />);
    await userEvent.click(await screen.findByRole('button', { name: /Add user/ }));
    await userEvent.type(screen.getByLabelText('Full name'), 'Asha Patil');
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.org');
    await userEvent.type(screen.getByLabelText('Password'), 'Abcdefgh12');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() => expect(userApi.create).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() => expect(userApi.create).toHaveBeenCalledTimes(2));
    const [[, key1], [, key2]] = vi.mocked(userApi.create).mock.calls as unknown as [unknown, string][];
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('shows View only with users.view', async () => {
    vi.mocked(userApi.list).mockResolvedValue(page([user()]));
    const { unmount } = renderWithProviders(<UsersTab />);
    await screen.findByText('Asha Patil', { selector: 'b' });
    expect(screen.queryByRole('button', { name: /^View/ })).not.toBeInTheDocument();
    unmount();

    permissions.add('viewUsers');
    renderWithProviders(<UsersTab />);
    expect(await screen.findByRole('button', { name: 'View Asha Patil' })).toBeInTheDocument();
  });

  it('View reads the account (GET /users/:id) into a read-only drawer', async () => {
    permissions.add('viewUsers');
    permissions.add('updateUser');
    permissions.add('deleteUser');
    vi.mocked(userApi.list).mockResolvedValue(page([user(), user({ id: 'u2', name: 'Ravi Kale', email: 'ravi@example.org' })]));
    let answer!: (u: User) => void;
    vi.mocked(userApi.get)
      .mockReset()
      .mockReturnValue(new Promise<User>((resolve) => (answer = resolve)));
    renderWithProviders(<UsersTab />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Ravi Kale' }));
    expect(userApi.get).toHaveBeenCalledWith('u2');

    const drawer = screen.getByRole('heading', { name: 'User — Ravi Kale' }).closest('aside') as HTMLElement;
    const rows = () =>
      within(drawer)
        .getAllByText(/./, { selector: '.kv > span' })
        .map((label) => [label.textContent, label.nextElementSibling?.textContent]);
    /* The row's own data at once, the rest when the account has been read. */
    expect(rows()).toEqual([
      ['Name', 'Ravi Kale'],
      ['Email', 'ravi@example.org'],
      ['Status', 'Active'],
    ]);
    expect(within(drawer).getByLabelText('Loading account details')).toBeInTheDocument();

    answer(
      user({
        id: 'u2',
        name: 'Ravi Kale',
        email: 'ravi@example.org',
        isActive: false,
        createdAt: '2026-11-01T05:00:00.000Z',
        updatedAt: '2026-11-20T05:00:00.000Z',
        roles: [
          { id: 'r1', name: 'COEP Reviewer', code: 'COEP' },
          { id: 'r2', name: 'Viewer', code: 'VIEWER' },
        ],
      }),
    );
    await waitFor(() => expect(within(drawer).queryByLabelText('Loading account details')).not.toBeInTheDocument());
    expect(rows()).toEqual([
      ['Name', 'Ravi Kale'],
      ['Email', 'ravi@example.org'],
      ['Roles', 'COEP ReviewerViewer'],
      ['Status', 'Inactive'],
      ['Last sign-in', '—'],
      ['Created', fmtDateTime('2026-11-01T05:00:00.000Z')],
      ['Updated', fmtDateTime('2026-11-20T05:00:00.000Z')],
    ]);
    expect(within(drawer).queryByRole('button', { name: /Save|Edit|Delete/ })).not.toBeInTheDocument();
    expect(userApi.update).not.toHaveBeenCalled();
    expect(userApi.setStatus).not.toHaveBeenCalled();
    expect(userApi.remove).not.toHaveBeenCalled();

    /* The other row actions are still there. */
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  it('View shows a failed read with a working retry', async () => {
    permissions.add('viewUsers');
    vi.mocked(userApi.list).mockResolvedValue(page([user()]));
    vi.mocked(userApi.get)
      .mockReset()
      .mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'))
      .mockResolvedValueOnce(user({ roles: [] }));
    renderWithProviders(<UsersTab />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Asha Patil' }));
    const problem = await screen.findByRole('alert');
    expect(problem).toHaveTextContent('Could not load the account. Database unavailable');
    await userEvent.click(within(problem).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No role')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

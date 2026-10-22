import StatusToggle from '../../../components/ui/StatusToggle';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ConfirmModal, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Callout, Kpi } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import { ApiError, newIdempotencyKey } from '../../../services/api-client';
import { useAuth, useCan } from '../../auth';
import { useRoles } from '../../roles-permissions';
import { useCreateUser, useDeleteUser, useReplaceUserRoles, useSetUserStatus, useUpdateUser, useUsers } from '../hooks/useUsers';
import type { UserFormValues } from '../schemas/userSchema';
import type { User, UserListParams } from '../types/user.types';
import UserFilters, { type UserFilterValues } from './UserFilters';
import UserForm from './UserForm';
import UserTable from './UserTable';

type Dialog = { type: 'create' } | { type: 'edit'; user: User } | { type: 'roles'; user: User } | { type: 'delete'; user: User };
const PAGE_SIZE = 20;

/* Field errors from a 422 / 409 response, mapped onto the form. */
function serverFieldErrors(err: unknown): Partial<Record<keyof UserFormValues, string>> {
  if (!(err instanceof ApiError)) return {};
  if (err.status === 409 && /email/i.test(err.message)) return { email: err.message };
  const out: Partial<Record<keyof UserFormValues, string>> = {};
  for (const d of err.details)
    if (d.field && ['name', 'email', 'password'].includes(d.field)) out[d.field as keyof UserFormValues] = d.message;
  return out;
}

/*
 * Users screen (sample feature for the module conventions, see docs/development-guidelines/frontend-modules.md):
 * server state via TanStack Query hooks, forms via React Hook Form + Zod, permissions gate every action
 * (the backend enforces them again), and every state is handled: loading, error, empty, success, unauthorized.
 */
export default function UsersTab() {
  const can = useCan();
  const { user: me } = useAuth();
  const canSeeRoles = can('viewRoles');
  const [filters, setFilters] = useState<UserFilterValues>({ search: '', status: 'all' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const params: UserListParams = {
    page,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    isActive: filters.status === 'all' ? undefined : filters.status === 'active',
    sortBy: 'name',
    sortOrder: 'ASC',
  };
  const list = useUsers(params);
  const activeCount = useUsers({ page: 1, limit: 1, isActive: true });
  const inactiveCount = useUsers({ page: 1, limit: 1, isActive: false });
  const roles = useRoles(canSeeRoles);

  const setStatus = useSetUserStatus();
  const remove = useDeleteUser();
  const onFilters = useCallback((v: UserFilterValues) => {
    setFilters(v);
    setPage(1);
  }, []);

  const forbidden = list.error instanceof ApiError && list.error.status === 403;

  /* Own account: shown, not switchable (you cannot deactivate yourself). */
  const renderStatus = (u: User) => (
    <StatusToggle
      active={u.isActive}
      label={`Status of ${u.name}`}
      busy={setStatus.isPending && setStatus.variables?.id === u.id}
      onChange={
        can('updateUser') && u.id !== me?.id
          ? (isActive) =>
              setStatus.mutate(
                { id: u.id, isActive },
                { onSuccess: () => toastOk(isActive ? 'User activated' : 'User deactivated'), onError: toastError },
              )
          : undefined
      }
    />
  );

  const renderActions = (u: User) => {
    const self = u.id === me?.id;
    return (
      <div className="tw-flex tw-flex-wrap tw-gap-1">
        {can('updateUser') ? (
          <button type="button" className="btn xs" onClick={() => setDialog({ type: 'edit', user: u })}>
            Edit
          </button>
        ) : null}
        {can('assignRoles') && canSeeRoles && !self ? (
          <button type="button" className="btn xs" onClick={() => setDialog({ type: 'roles', user: u })}>
            Roles
          </button>
        ) : null}
        {can('deleteUser') && !self ? (
          <button type="button" className="btn xs tw-text-danger" onClick={() => setDialog({ type: 'delete', user: u })}>
            Delete
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Users" value={(activeCount.data?.meta.total ?? 0) + (inactiveCount.data?.meta.total ?? 0)} tone="b" />
        <Kpi label="Active" value={activeCount.data?.meta.total ?? '—'} tone="g" />
        <Kpi label="Inactive" value={inactiveCount.data?.meta.total ?? '—'} tone="" />
        <Kpi label="Showing" value={list.data?.items.length ?? '—'} tone="a" sub={`page ${page}`} />
      </div>

      <div className="card">
        <div className="card-h">
          <h3>User accounts</h3>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <UserFilters value={filters} onChange={onFilters} />
            {can('createUser') ? (
              <button type="button" className="btn sm primary" onClick={() => setDialog({ type: 'create' })}>
                <Icon name="plus" />
                Add user
              </button>
            ) : null}
          </div>
        </div>

        {forbidden ? (
          <div className="card-b">
            <Callout tone="warn" title="Not permitted. ">
              You do not have permission to view user accounts.
            </Callout>
          </div>
        ) : list.isError ? (
          <div className="card-b">
            <Callout tone="err" title="Could not load users. ">
              {list.error instanceof ApiError ? list.error.fullMessage : 'Unexpected error'}{' '}
              <button type="button" className="btn xs" onClick={() => void list.refetch()}>
                Retry
              </button>
            </Callout>
          </div>
        ) : list.isPending ? (
          <div className="card-b" aria-busy="true" aria-label="Loading users">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel tw-mb-3" style={{ height: 16 }} />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <div className="card-b tw-py-10 tw-text-center tw-text-ink-muted">
            {filters.search || filters.status !== 'all' ? 'No users match these filters.' : 'No user accounts yet.'}
          </div>
        ) : (
          <UserTable
            users={list.data.items}
            meta={list.data.meta}
            page={page}
            onPage={setPage}
            currentUserId={me?.id}
            showRoles={canSeeRoles}
            renderActions={renderActions}
            renderStatus={renderStatus}
            fetching={list.isFetching}
          />
        )}
      </div>

      {dialog?.type === 'create' ? <CreateUserDialog roles={can('assignRoles') ? (roles.data ?? []) : []} onClose={close} /> : null}
      {dialog?.type === 'edit' ? <EditUserDialog user={dialog.user} onClose={close} /> : null}
      {dialog?.type === 'roles' ? <UserRolesDrawer user={dialog.user} onClose={close} /> : null}
      {dialog?.type === 'delete' ? (
        <ConfirmModal
          title="Delete user"
          danger
          busy={remove.isPending}
          confirmLabel="Delete"
          message={`Delete ${dialog.user.name} (${dialog.user.email})? The account is soft-deleted: it can no longer sign in, and it is kept for audit history.`}
          onClose={close}
          onConfirm={() =>
            remove.mutate(dialog.user.id, {
              onSuccess: () => {
                toastOk('User deleted');
                close();
              },
              onError: toastError,
            })
          }
        />
      ) : null}
    </>
  );
}

function CreateUserDialog({ roles, onClose }: { roles: Parameters<typeof UserForm>[0]['roles']; onClose: () => void }) {
  const create = useCreateUser();
  /* One key per dialog: a retry of the same submission is replayed, not duplicated. */
  const key = useRef(newIdempotencyKey());
  const serverErrors = useMemo(() => serverFieldErrors(create.error), [create.error]);
  return (
    <Modal title="Add user" onClose={onClose}>
      <UserForm
        mode="create"
        roles={roles}
        submitting={create.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) =>
          create.mutate(
            {
              name: v.name,
              email: v.email,
              password: v.password,
              roleIds: v.roleIds.length ? v.roleIds : undefined,
              idempotencyKey: key.current,
            },
            {
              onSuccess: () => {
                toastOk('User created');
                onClose();
              },
              onError: (e) => {
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          )
        }
      />
    </Modal>
  );
}

function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const update = useUpdateUser();
  const serverErrors = useMemo(() => serverFieldErrors(update.error), [update.error]);
  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose}>
      <UserForm
        mode="edit"
        defaultValues={{ name: user.name, email: user.email }}
        submitting={update.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) =>
          update.mutate(
            { id: user.id, input: { name: v.name, email: v.email, ...(v.password ? { password: v.password } : {}) } },
            {
              onSuccess: () => {
                toastOk('User updated');
                onClose();
              },
              onError: (e) => {
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          )
        }
      />
    </Modal>
  );
}

function UserRolesDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const roles = useRoles(true);
  const save = useReplaceUserRoles();
  const [selected, setSelected] = useState<string[]>(() => (user.roles ?? []).map((r) => r.id));
  const usable = (roles.data ?? []).filter((r) => r.isActive || selected.includes(r.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <Drawer
      title={`Roles — ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={save.isPending || roles.isPending}
            onClick={() =>
              save.mutate(
                { id: user.id, roleIds: selected },
                {
                  onSuccess: () => {
                    toastOk('Roles updated');
                    onClose();
                  },
                  onError: toastError,
                },
              )
            }
          >
            Save roles
          </button>
        </>
      }
    >
      <Callout tone="info" title="Privilege rules. ">
        You can only grant or remove roles whose permissions you hold, and you cannot change your own roles. The server enforces these
        rules.
      </Callout>
      {roles.isPending ? <div className="skel tw-mt-4" style={{ height: 120 }} /> : null}
      <div className="list mt14">
        {usable.map((r) => (
          <label key={r.id} className="list-row tw-cursor-pointer">
            <input type="checkbox" className="tw-accent-brand-600" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <div className="lr-main">
              <b>
                {r.name}
                {r.platform === 'LMS' ? <span className="muted fs11"> · LMS role</span> : null}
              </b>
              <span className="mono">{r.code}</span>
            </div>
          </label>
        ))}
      </div>
    </Drawer>
  );
}

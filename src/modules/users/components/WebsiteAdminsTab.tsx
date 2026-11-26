import StatusToggle from '../../../components/ui/StatusToggle';
import { useCallback, useState } from 'react';
import { ConfirmModal, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, Kpi } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Overlay';
import { ApiError } from '../../../services/api-client';
import { WEBSITE_ADMIN_ROLE, useAuth, useCan } from '../../auth';
import { WebsiteAdminPermissions, useRoles, type ApiRole } from '../../roles-permissions';
import { useDeleteUser, useReplaceUserRoles, useSetUserStatus, useUsers } from '../hooks/useUsers';
import type { User, UserListParams } from '../types/user.types';
import { CreateUserDialog, EditUserDialog } from './UserDialogs';
import UserFilters, { type UserFilterValues } from './UserFilters';
import UserTable from './UserTable';

type Dialog =
  | { type: 'create' }
  | { type: 'assign' }
  | { type: 'edit'; user: User }
  | { type: 'revoke'; user: User }
  | { type: 'delete'; user: User };
const PAGE_SIZE = 20;

/*
 * Website Admins: accounts holding the WEBSITE_ADMIN role. Each signs in with its own email and password and works in
 * the CMS menu only. Built on the same /users and /roles endpoints as the other tabs; the backend enforces that the
 * role grants CMS permissions only and is never held together with another role.
 */
export default function WebsiteAdminsTab() {
  const roles = useRoles(true);
  const role = roles.data?.find((r) => r.code === WEBSITE_ADMIN_ROLE);

  if (roles.isPending) return <div className="skel" style={{ height: 160 }} aria-label="Loading Website Admins" />;
  if (roles.isError)
    return (
      <Callout tone="err" title="Could not load roles. ">
        {roles.error instanceof ApiError ? roles.error.fullMessage : 'Unexpected error'}
      </Callout>
    );
  if (!role)
    return (
      <Callout tone="warn" title="The Website Admin role does not exist yet. ">
        Run the backend seed (npm run seed) to create it.
      </Callout>
    );
  return (
    <>
      <WebsiteAdminAccounts role={role} />
      <WebsiteAdminPermissions role={role} />
    </>
  );
}

function WebsiteAdminAccounts({ role }: { role: ApiRole }) {
  const can = useCan();
  const { user: me } = useAuth();
  const [filters, setFilters] = useState<UserFilterValues>({ search: '', status: 'all' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const onFilters = useCallback((v: UserFilterValues) => {
    setFilters(v);
    setPage(1);
  }, []);

  const params: UserListParams = {
    page,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    isActive: filters.status === 'all' ? undefined : filters.status === 'active',
    sortBy: 'name',
    sortOrder: 'ASC',
    roleId: role.id,
  };
  const list = useUsers(params);
  const activeCount = useUsers({ page: 1, limit: 1, isActive: true, roleId: role.id });
  const inactiveCount = useUsers({ page: 1, limit: 1, isActive: false, roleId: role.id });
  const setStatus = useSetUserStatus();
  const remove = useDeleteUser();
  const replaceRoles = useReplaceUserRoles();

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
                { onSuccess: () => toastOk(isActive ? 'Website Admin activated' : 'Website Admin deactivated'), onError: toastError },
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
        {can('assignRoles') && !self ? (
          <button type="button" className="btn xs" onClick={() => setDialog({ type: 'revoke', user: u })}>
            Remove access
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
        <Kpi label="Website Admins" value={(activeCount.data?.meta.total ?? 0) + (inactiveCount.data?.meta.total ?? 0)} tone="b" />
        <Kpi label="Active" value={activeCount.data?.meta.total ?? '—'} tone="g" />
        <Kpi label="Inactive" value={inactiveCount.data?.meta.total ?? '—'} tone="" />
        <Kpi label="Role" value={role.isActive ? 'Active' : 'Inactive'} tone={role.isActive ? 'g' : 'a'} sub={role.code} />
      </div>

      <div className="mb14">
        <Callout tone="info" title="Separate CMS access. ">
          Website Admins sign in on the same login page with their own email and password, and see only the CMS menu: website
          content pages and the State, District and Taluka masters. Every other menu and API is closed to them.
        </Callout>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>
            Website Admin accounts <Badge tone="blue">CMS only</Badge>
          </h3>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <UserFilters value={filters} onChange={onFilters} />
            {can('assignRoles') ? (
              <button type="button" className="btn sm" onClick={() => setDialog({ type: 'assign' })}>
                Assign existing user
              </button>
            ) : null}
            {can('createUser') && can('assignRoles') ? (
              <button type="button" className="btn sm primary" onClick={() => setDialog({ type: 'create' })}>
                <Icon name="plus" />
                Add Website Admin
              </button>
            ) : null}
          </div>
        </div>

        {list.isError ? (
          <div className="card-b">
            <Callout tone="err" title="Could not load Website Admins. ">
              {list.error instanceof ApiError ? list.error.fullMessage : 'Unexpected error'}{' '}
              <button type="button" className="btn xs" onClick={() => void list.refetch()}>
                Retry
              </button>
            </Callout>
          </div>
        ) : list.isPending ? (
          <div className="card-b" aria-busy="true" aria-label="Loading Website Admins">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel tw-mb-3" style={{ height: 16 }} />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <div className="card-b tw-py-10 tw-text-center tw-text-ink-muted">
            {filters.search || filters.status !== 'all' ? 'No Website Admins match these filters.' : 'No Website Admin accounts yet.'}
          </div>
        ) : (
          <UserTable
            users={list.data.items}
            meta={list.data.meta}
            page={page}
            onPage={setPage}
            currentUserId={me?.id}
            showRoles={false}
            renderActions={renderActions}
            renderStatus={renderStatus}
            fetching={list.isFetching}
          />
        )}
      </div>

      {dialog?.type === 'create' ? (
        <CreateUserDialog
          title="Add Website Admin"
          roles={[]}
          fixedRoleIds={[role.id]}
          successMessage="Website Admin created"
          intro={
            <div className="mb14">
              <Callout tone="info">
                The account gets the Website Admin role: it signs in with this email and password and sees only the CMS menu.
              </Callout>
            </div>
          }
          onClose={close}
        />
      ) : null}
      {dialog?.type === 'assign' ? <AssignWebsiteAdminDialog role={role} onClose={close} /> : null}
      {dialog?.type === 'edit' ? <EditUserDialog user={dialog.user} onClose={close} /> : null}
      {dialog?.type === 'revoke' ? (
        <ConfirmModal
          title="Remove Website Admin access"
          busy={replaceRoles.isPending}
          confirmLabel="Remove access"
          message={`Remove Website Admin access from ${dialog.user.name}? The account keeps its sign-in but holds no role, so it opens no screen until you give it a role in the Users tab.`}
          onClose={close}
          onConfirm={() =>
            replaceRoles.mutate(
              { id: dialog.user.id, roleIds: [] },
              {
                onSuccess: () => {
                  toastOk('Website Admin access removed');
                  close();
                },
                onError: toastError,
              },
            )
          }
        />
      ) : null}
      {dialog?.type === 'delete' ? (
        <ConfirmModal
          title="Delete Website Admin"
          danger
          busy={remove.isPending}
          confirmLabel="Delete"
          dependencies={{ kind: 'user', id: dialog.user.id }}
          message={`Delete ${dialog.user.name} (${dialog.user.email})? The account is soft-deleted: it can no longer sign in, and it is kept for audit history.`}
          onClose={close}
          onConfirm={() =>
            remove.mutate(dialog.user.id, {
              onSuccess: () => {
                toastOk('Website Admin deleted');
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

/* Gives an existing account the Website Admin role. Its other roles are replaced: a Website Admin holds no other role. */
function AssignWebsiteAdminDialog({ role, onClose }: { role: ApiRole; onClose: () => void }) {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<User | null>(null);
  const candidates = useUsers({ page: 1, limit: 8, search: search.trim() || undefined, sortBy: 'name', sortOrder: 'ASC' });
  const save = useReplaceUserRoles();
  const rows = (candidates.data?.items ?? []).filter((u) => u.id !== me?.id && !(u.roles ?? []).some((r) => r.id === role.id));
  const otherRoles = (picked?.roles ?? []).map((r) => r.name);

  return (
    <Modal
      title="Assign Website Admin"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!picked || save.isPending}
            onClick={() =>
              picked &&
              save.mutate(
                { id: picked.id, roleIds: [role.id] },
                {
                  onSuccess: () => {
                    toastOk(`${picked.name} is now a Website Admin`);
                    onClose();
                  },
                  onError: toastError,
                },
              )
            }
          >
            Make Website Admin
          </button>
        </>
      }
    >
      <div className="fld">
        <label htmlFor="wa-search">Find a user</label>
        <input
          id="wa-search"
          className="inp"
          autoComplete="off"
          placeholder="Name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPicked(null);
          }}
        />
      </div>
      {candidates.isPending ? <div className="skel tw-mt-4" style={{ height: 80 }} /> : null}
      {candidates.data && !rows.length ? <div className="hint mt10">No other users match.</div> : null}
      <div className="list mt10" role="radiogroup" aria-label="Users">
        {rows.map((u) => (
          <label key={u.id} className="list-row tw-cursor-pointer">
            <input type="radio" name="wa-user" className="tw-accent-brand-600" checked={picked?.id === u.id} onChange={() => setPicked(u)} />
            <div className="lr-main">
              <b>{u.name}</b>
              <span>
                {u.email}
                {u.roles?.length ? ' · ' + u.roles.map((r) => r.name).join(', ') : ''}
              </span>
            </div>
          </label>
        ))}
      </div>
      {picked ? (
        <div className="mt10">
          <Callout tone="warn">
            {otherRoles.length
              ? `${picked.name}'s current roles (${otherRoles.join(', ')}) are replaced: a Website Admin holds no other role and sees only the CMS menu.`
              : `${picked.name} will see only the CMS menu.`}
          </Callout>
        </div>
      ) : null}
    </Modal>
  );
}

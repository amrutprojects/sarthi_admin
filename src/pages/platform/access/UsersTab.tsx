import { useState, type FormEvent } from 'react';
import { Badge, Callout, GenBadge, Kpi } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import Icon from '../../../components/Icon';
import Avatar from '../../../components/Avatar';
import { Can, useCan } from '../../../auth/Can';
import { useAuth } from '../../../context/AuthContext';
import type { ApiRoleRef, ApiUser } from '../../../services/authApi';
import { rolesApi, usersApi, type ApiRole } from '../../../services/rbacApi';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from './shared';

type UserRow = ApiUser & { roles: ApiRoleRef[] };
type Dialog = { type: 'create' } | { type: 'edit'; user: UserRow } | { type: 'roles'; user: UserRow } | { type: 'delete'; user: UserRow };

const PASSWORD_HINT = 'At least 10 characters, with upper-case, lower-case and a digit.';

export default function UsersTab() {
  const can = useCan();
  const { user: me } = useAuth();
  const canSeeRoles = can('viewRoles');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { busy, run } = useAction();

  /* GET /users includes each user's roles when the viewer holds roles.view (one request, not one per user). */
  const users = useApiData<UserRow[]>(async () => (await usersApi.listAll()).map((u) => ({ ...u, roles: u.roles ?? [] })), [canSeeRoles]);
  const roles = useApiData<ApiRole[]>(() => (canSeeRoles ? rolesApi.listAll() : Promise.resolve([])), [canSeeRoles]);

  const rows = users.data ?? [];
  const close = () => setDialog(null);
  const reload = () => users.reload();

  const columns: Column<UserRow>[] = [
    {
      k: 'name', l: 'User', exportVal: (u) => u.name,
      render: (u) => <div className="f ac gp8"><Avatar name={u.name} /><div><b>{u.name}</b>{u.id === me?.id ? <> <Badge tone="saffron">You</Badge></> : null}<div className="fs11 muted">{u.email}</div></div></div>,
    },
    ...(canSeeRoles ? [{
      k: 'roles', l: 'Roles', sortVal: (u: UserRow) => u.roles.map((r) => r.name).join(', '), exportVal: (u: UserRow) => u.roles.map((r) => r.code).join(', '),
      render: (u: UserRow) => (u.roles.length ? <div className="f gp4 wrap">{u.roles.map((r) => <Badge key={r.id} tone="blue">{r.name}</Badge>)}</div> : <span className="muted">No role</span>),
    }] : []),
    { k: 'isActive', l: 'Status', exportVal: (u) => (u.isActive ? 'Active' : 'Inactive'), render: (u) => <GenBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { k: 'lastLoginAt', l: 'Last sign-in', exportVal: (u) => fmtDateTime(u.lastLoginAt), render: (u) => fmtDateTime(u.lastLoginAt) },
    {
      k: 'act', l: '', sortable: false, exportVal: () => '',
      render: (u) => {
        const self = u.id === me?.id;
        return (
          <div className="f gp4 wrap">
            <Can action="updateUser"><button type="button" className="btn xs" onClick={() => setDialog({ type: 'edit', user: u })}>Edit</button></Can>
            {can('assignRoles') && canSeeRoles && !self ? <button type="button" className="btn xs" onClick={() => setDialog({ type: 'roles', user: u })}>Roles</button> : null}
            {can('updateUser') && !self ? (
              <button type="button" className="btn xs" disabled={busy}
                onClick={() => run(() => usersApi.setStatus(u.id, !u.isActive), u.isActive ? 'User deactivated' : 'User activated', reload)}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
            ) : null}
            {can('deleteUser') && !self ? <button type="button" className="btn xs" style={{ color: 'var(--red)' }} onClick={() => setDialog({ type: 'delete', user: u })}>Delete</button> : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Users" value={rows.length} tone="b" />
        <Kpi label="Active" value={rows.filter((u) => u.isActive).length} tone="g" />
        <Kpi label="Inactive" value={rows.filter((u) => !u.isActive).length} tone="" />
        <Kpi label="Without a role" value={canSeeRoles ? rows.filter((u) => !u.roles.length).length : '—'} tone="a" />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>User accounts <span className="sub">live from the backend</span></h3>
          <Can action="createUser"><button type="button" className="btn sm primary" onClick={() => setDialog({ type: 'create' })}><Icon name="plus" />Add user</button></Can>
        </div>
        <LoadState loading={users.loading && !users.data} error={users.error} onRetry={reload} />
        {users.data ? <DataTable rows={rows} columns={columns} pageSize={12} exportName="User_Accounts" search={['name', 'email']} searchLabel="name or email" /> : null}
      </div>

      {dialog?.type === 'create' && <UserFormModal roles={roles.data ?? []} canAssignRoles={can('assignRoles') && canSeeRoles} onClose={close} onSaved={reload} />}
      {dialog?.type === 'edit' && <UserFormModal user={dialog.user} roles={[]} canAssignRoles={false} onClose={close} onSaved={reload} />}
      {dialog?.type === 'roles' && <UserRolesDrawer user={dialog.user} roles={roles.data ?? []} onClose={close} onSaved={reload} />}
      {dialog?.type === 'delete' && (
        <ConfirmModal
          title="Delete user" danger busy={busy} confirmLabel="Delete"
          message={`Delete ${dialog.user.name} (${dialog.user.email})? The account is soft-deleted: it can no longer sign in, and it is kept for audit history.`}
          onClose={close}
          onConfirm={() => run(() => usersApi.remove(dialog.user.id), 'User deleted', async () => { close(); await reload(); })}
        />
      )}
    </>
  );
}

function UserFormModal({ user, roles, canAssignRoles, onClose, onSaved }: {
  user?: UserRow; roles: ApiRole[]; canAssignRoles: boolean; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const { busy, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => (editing
        ? usersApi.update(user.id, { name: name.trim(), email: email.trim(), ...(password ? { password } : {}) })
        : usersApi.create({ name: name.trim(), email: email.trim(), password, ...(roleIds.length ? { roleIds } : {}) })),
      editing ? 'User updated' : 'User created',
    );
    if (ok) { onClose(); onSaved(); }
  }

  const usable = roles.filter((r) => r.isActive);
  return (
    <Modal title={editing ? 'Edit user' : 'Add user'} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="user-form" className="btn primary" disabled={busy}>{editing ? 'Save' : 'Create user'}</button>
    </>}>
      <form id="user-form" onSubmit={submit} noValidate>
        <div className="grid g2">
          <div className="fld"><label htmlFor="uf-name">Full name</label><input className="inp" id="uf-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="fld"><label htmlFor="uf-email">Email</label><input className="inp" id="uf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" /></div>
        </div>
        <div className="fld mt10">
          <label htmlFor="uf-pass">{editing ? 'New password (leave blank to keep)' : 'Password'}</label>
          <input className="inp" id="uf-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <div className="hint">{PASSWORD_HINT}</div>
        </div>
        {canAssignRoles ? (
          <div className="fld mt10">
            <label>Roles</label>
            <div className="grid g2">
              {usable.map((r) => (
                <label key={r.id} className="f ac gp8 fs13 pointer" style={{ padding: '3px 0' }}>
                  <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => setRoleIds((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                  {r.name}
                </label>
              ))}
            </div>
            <div className="hint">You can only assign roles whose permissions you hold yourself.</div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function UserRolesDrawer({ user, roles, onClose, onSaved }: { user: UserRow; roles: ApiRole[]; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<string[]>(user.roles.map((r) => r.id));
  const { busy, run } = useAction();
  const usable = roles.filter((r) => r.isActive || selected.includes(r.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Drawer title={'Roles — ' + user.name} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" disabled={busy}
        onClick={() => run(() => usersApi.replaceRoles(user.id, selected), 'Roles updated', () => { onClose(); onSaved(); })}>Save roles</button>
    </>}>
      <Callout tone="info" title="Privilege rules">You can only grant or remove roles whose permissions you hold, and you cannot change your own roles. The server enforces these rules.</Callout>
      <div className="list mt14">
        {usable.map((r) => (
          <label key={r.id} className="list-row pointer" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <div className="lr-main"><b>{r.name}</b><span className="mono">{r.code}</span></div>
            {r.isSystem ? <Badge tone="violet">System</Badge> : null}
            {!r.isActive ? <Badge tone="grey">Inactive</Badge> : null}
          </label>
        ))}
      </div>
    </Drawer>
  );
}

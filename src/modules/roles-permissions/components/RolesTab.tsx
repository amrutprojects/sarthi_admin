import { useMemo, useState, type FormEvent } from 'react';
import { Badge, Callout, GenBadge, Kpi } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import Icon from '../../../components/ui/Icon';
import { Can, useCan } from '../../auth/components/Can';
import { useAuth } from '../../auth/AuthContext';
import { permissionsApi, rolesApi, type ApiPermission, type ApiRole } from '../services/rbacApi';
import PermissionMatrix from './PermissionMatrix';
import { ConfirmModal, LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';

type Dialog = { type: 'create' } | { type: 'edit'; role: ApiRole } | { type: 'permissions'; role: ApiRole } | { type: 'delete'; role: ApiRole };

const PROTECTED = 'SUPER_ADMIN';

export default function RolesTab() {
  const can = useCan();
  const { refresh } = useAuth();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { busy, run } = useAction();
  const roles = useApiData(() => rolesApi.listAll());
  const perms = useApiData(() => (can('viewPermissions') ? permissionsApi.listAll() : Promise.resolve([] as ApiPermission[])), [can('viewPermissions')]);

  const rows = roles.data ?? [];
  const close = () => setDialog(null);
  /* Role changes may change the signed-in user's own effective permissions. */
  const reload = async () => { await roles.reload(); await refresh(); };

  const columns: Column<ApiRole>[] = [
    { k: 'name', l: 'Role', render: (r) => <div><b>{r.name}</b><div className="fs11 muted mono">{r.code}</div></div> },
    { k: 'description', l: 'Description', render: (r) => <span className="fs12">{r.description ?? '—'}</span> },
    { k: 'isSystem', l: 'Type', exportVal: (r) => (r.isSystem ? 'System' : 'Custom'), render: (r) => (r.isSystem ? <Badge tone="violet">System</Badge> : <Badge tone="grey">Custom</Badge>) },
    { k: 'isActive', l: 'Status', exportVal: (r) => (r.isActive ? 'Active' : 'Inactive'), render: (r) => <GenBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      k: 'act', l: '', sortable: false, exportVal: () => '',
      render: (r) => {
        const locked = r.code === PROTECTED;
        return (
          <div className="f gp4 wrap">
            <button type="button" className="btn xs" onClick={() => setDialog({ type: 'permissions', role: r })}>{can('assignPermissions') && !locked ? 'Permissions' : 'View permissions'}</button>
            <Can action="updateRole"><button type="button" className="btn xs" onClick={() => setDialog({ type: 'edit', role: r })}>Edit</button></Can>
            {can('updateRole') && !locked ? (
              <button type="button" className="btn xs" disabled={busy}
                onClick={() => run(() => rolesApi.setStatus(r.id, !r.isActive), r.isActive ? 'Role deactivated' : 'Role activated', reload)}>
                {r.isActive ? 'Deactivate' : 'Activate'}
              </button>
            ) : null}
            {can('deleteRole') && !locked && !r.isSystem ? <button type="button" className="btn xs" style={{ color: 'var(--red)' }} onClick={() => setDialog({ type: 'delete', role: r })}>Delete</button> : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Roles" value={rows.length} tone="b" />
        <Kpi label="Active" value={rows.filter((r) => r.isActive).length} tone="g" />
        <Kpi label="System roles" value={rows.filter((r) => r.isSystem).length} tone="v" />
        <Kpi label="Permissions available" value={perms.data ? perms.data.filter((p) => p.isActive).length : '—'} tone="" />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Roles <span className="sub">live from the backend</span></h3>
          <Can action="createRole"><button type="button" className="btn sm primary" onClick={() => setDialog({ type: 'create' })}><Icon name="plus" />Add role</button></Can>
        </div>
        <LoadState loading={roles.loading && !roles.data} error={roles.error} onRetry={() => void roles.reload()} />
        {roles.data ? <DataTable rows={rows} columns={columns} pageSize={15} exportName="Roles" search={['name', 'code']} searchLabel="role" /> : null}
      </div>

      {(dialog?.type === 'create' || dialog?.type === 'edit') && <RoleFormModal role={dialog.type === 'edit' ? dialog.role : undefined} onClose={close} onSaved={reload} />}
      {dialog?.type === 'permissions' && (
        <RolePermissionsDrawer role={dialog.role} catalogue={perms.data ?? []} editable={can('assignPermissions') && dialog.role.code !== PROTECTED} onClose={close} onSaved={reload} />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmModal
          title="Delete role" danger busy={busy} confirmLabel="Delete"
          message={`Delete the role ${dialog.role.name}? Users holding it lose its permissions immediately. The role is soft-deleted and kept for audit history.`}
          onClose={close}
          onConfirm={() => run(() => rolesApi.remove(dialog.role.id), 'Role deleted', async () => { close(); await reload(); })}
        />
      )}
    </>
  );
}

function RoleFormModal({ role, onClose, onSaved }: { role?: ApiRole; onClose: () => void; onSaved: () => Promise<void> }) {
  const editing = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [code, setCode] = useState(role?.code ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const { busy, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => (editing
        ? rolesApi.update(role.id, { name: name.trim(), description: description.trim() || null })
        : rolesApi.create({ name: name.trim(), code: code.trim(), description: description.trim() || null })),
      editing ? 'Role updated' : 'Role created',
    );
    if (ok) { onClose(); await onSaved(); }
  }

  return (
    <Modal title={editing ? 'Edit role' : 'Add role'} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="role-form" className="btn primary" disabled={busy}>{editing ? 'Save' : 'Create role'}</button>
    </>}>
      <form id="role-form" onSubmit={submit} noValidate>
        <div className="grid g2">
          <div className="fld"><label htmlFor="rf-name">Name</label><input className="inp" id="rf-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="fld">
            <label htmlFor="rf-code">Code</label>
            <input className="inp mono" id="rf-code" value={code} disabled={editing} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))} placeholder="REGIONAL_LEAD" />
            <div className="hint">{editing ? 'The code cannot be changed.' : 'UPPER_SNAKE_CASE, 2–64 characters.'}</div>
          </div>
        </div>
        <div className="fld mt10"><label htmlFor="rf-desc">Description</label><textarea className="inp" id="rf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        {!editing ? <div className="hint mt10">Add permissions after creating the role, from its Permissions button.</div> : null}
      </form>
    </Modal>
  );
}

function RolePermissionsDrawer({ role, catalogue, editable, onClose, onSaved }: {
  role: ApiRole; catalogue: ApiPermission[]; editable: boolean; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const detail = useApiData(() => rolesApi.get(role.id), [role.id]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const { permissions: mine } = useAuth();
  const { busy, run } = useAction();

  const granted = selected ?? new Set((detail.data?.permissions ?? []).map((p) => p.id));
  /* The full active catalogue; falls back to the role's own grants when the catalogue is not visible. */
  const source = useMemo(() => (catalogue.length
    ? catalogue.filter((p) => p.isActive || granted.has(p.id))
    : detail.data?.permissions ?? []), [catalogue, detail.data, granted]);

  return (
    <Drawer title={'Permissions — ' + role.name} size="wide" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>{editable ? 'Cancel' : 'Close'}</button>
      {editable ? (
        <button type="button" className="btn primary" disabled={busy || !detail.data}
          onClick={() => run(() => rolesApi.replacePermissions(role.id, [...granted]), 'Permissions updated', async () => { onClose(); await onSaved(); })}>
          Save permissions ({granted.size})
        </button>
      ) : null}
    </>}>
      {role.code === PROTECTED ? <Callout tone="info" title="Protected role">Super Admin always holds every permission; its grants cannot be edited.</Callout> : null}
      {editable ? <Callout tone="info" title="Privilege rules">You can only grant or remove permissions you hold yourself, and you cannot change a role you hold unless you are a Super Admin.</Callout> : null}
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data ? <PermissionMatrix permissions={source} granted={granted} editable={editable} held={mine} onChange={setSelected} /> : null}
    </Drawer>
  );
}

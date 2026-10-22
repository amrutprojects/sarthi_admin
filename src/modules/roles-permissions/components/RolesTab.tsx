import StatusToggle from '../../../components/ui/StatusToggle';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Badge, Callout, Kpi } from '../../../components/ui';
import type { Column } from '../../../components/tables/DataTable';
import ServerTable, { type ServerSort } from '../../../components/tables/ServerTable';
import ListFilters, { statusParam, type ListFilterValues } from '../../../components/tables/ListFilters';
import type { ApiError } from '../../../services/api-client';
import { countOf, usePagedRoles } from '../hooks/usePagedRbac';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import Icon from '../../../components/ui/Icon';
import { Can, WEBSITE_ADMIN_ROLE, WEBSITE_MENUS, useCan } from '../../auth';
import { useAuth } from '../../auth';
import { ROLE_PLATFORM_LABEL, permissionsApi, rolesApi, type ApiPermission, type ApiRole, type RolePlatform } from '../services/rbacApi';
import PermissionMatrix from './PermissionMatrix';
import LmsMenusDrawer from './LmsMenusDrawer';
import { ConfirmModal, LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; role: ApiRole }
  | { type: 'permissions'; role: ApiRole }
  | { type: 'lms'; role: ApiRole }
  | { type: 'delete'; role: ApiRole };

const PROTECTED = 'SUPER_ADMIN';
const PAGE_SIZE = 15;
/* Columns the backend can sort roles by. */
const SORTABLE: Record<string, string | undefined> = { name: 'name' };

export default function RolesTab() {
  const can = useCan();
  const { refresh } = useAuth();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { busy, run } = useAction();
  const [filters, setFilters] = useState<ListFilterValues>({ search: '', status: 'all' });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ServerSort>({ sortBy: 'name', sortOrder: 'ASC' });
  const onFilters = useCallback((v: ListFilterValues) => {
    setFilters(v);
    setPage(1);
  }, []);
  const roles = usePagedRoles({
    page,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    isActive: statusParam(filters.status),
    ...sort,
  });
  const total = usePagedRoles({ page: 1, limit: 1 });
  const active = usePagedRoles({ page: 1, limit: 1, isActive: true });
  const inactive = usePagedRoles({ page: 1, limit: 1, isActive: false });
  const perms = useApiData(
    () => (can('viewPermissions') ? permissionsApi.listAll() : Promise.resolve([] as ApiPermission[])),
    [can('viewPermissions')],
  );

  const rows = roles.data?.data ?? [];
  const close = () => setDialog(null);
  /* Role changes may change the signed-in user's own effective permissions. */
  const reload = async () => {
    await Promise.all([roles.refetch(), total.refetch(), active.refetch(), inactive.refetch()]);
    await refresh();
  };

  const columns: Column<ApiRole>[] = [
    {
      k: 'name',
      l: 'Role',
      render: (r) => (
        <div>
          <b>{r.name}</b>
          <div className="fs11 muted mono">{r.code}</div>
        </div>
      ),
    },
    { k: 'description', l: 'Description', render: (r) => <span className="fs12">{r.description ?? '—'}</span> },
    {
      k: 'isSystem',
      l: 'Type',
      exportVal: (r) => (r.isSystem ? 'System' : 'Custom'),
      render: (r) => (r.isSystem ? <Badge tone="violet">System</Badge> : <Badge tone="grey">Custom</Badge>),
    },
    {
      k: 'platform',
      l: 'Application',
      exportVal: (r) => ROLE_PLATFORM_LABEL[r.platform],
      render: (r) => <Badge tone={r.platform === 'LMS' ? 'saffron' : 'blue'}>{ROLE_PLATFORM_LABEL[r.platform]}</Badge>,
    },
    {
      k: 'isActive',
      l: 'Status',
      exportVal: (r) => (r.isActive ? 'Active' : 'Inactive'),
      render: (r) => (
        <StatusToggle
          active={r.isActive}
          label={`Status of ${r.name}`}
          busy={busy}
          onChange={
            can('updateRole') && r.code !== PROTECTED
              ? (isActive) => run(() => rolesApi.setStatus(r.id, isActive), isActive ? 'Role activated' : 'Role deactivated', reload)
              : undefined
          }
        />
      ),
    },
    {
      k: 'act',
      l: '',
      sortable: false,
      exportVal: () => '',
      render: (r) => {
        const locked = r.code === PROTECTED;
        return (
          <div className="f gp4 wrap">
            {r.platform === 'LMS' ? (
              <button type="button" className="btn xs" onClick={() => setDialog({ type: 'lms', role: r })}>
                {can('assignPermissions') ? 'LMS menus' : 'View LMS menus'}
              </button>
            ) : (
              <button type="button" className="btn xs" onClick={() => setDialog({ type: 'permissions', role: r })}>
                {can('assignPermissions') && !locked ? 'Permissions' : 'View permissions'}
              </button>
            )}
            <Can action="updateRole">
              <button type="button" className="btn xs" onClick={() => setDialog({ type: 'edit', role: r })}>
                Edit
              </button>
            </Can>
            {can('deleteRole') && !locked && !r.isSystem ? (
              <button
                type="button"
                className="btn xs"
                style={{ color: 'var(--red)' }}
                onClick={() => setDialog({ type: 'delete', role: r })}
              >
                Delete
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Roles" value={countOf(total)} tone="b" />
        <Kpi label="Active" value={countOf(active)} tone="g" />
        <Kpi label="Inactive" value={countOf(inactive)} tone="v" />
        <Kpi label="Permissions available" value={perms.data ? perms.data.filter((p) => p.isActive).length : '—'} tone="" />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Roles <span className="sub">live from the backend</span>
          </h3>
          <Can action="createRole">
            <button type="button" className="btn sm primary" onClick={() => setDialog({ type: 'create' })}>
              <Icon name="plus" />
              Add role
            </button>
          </Can>
        </div>
        <div className="card-b">
          <ListFilters value={filters} onChange={onFilters} placeholder="Search role name or code" label="Search roles" />
        </div>
        <LoadState loading={roles.isLoading} error={roles.error as ApiError | null} onRetry={() => void roles.refetch()} />
        {roles.data ? (
          <ServerTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={columns.map((c) => ({ key: c.k, label: c.l, render: c.render!, sortKey: SORTABLE[c.k] }))}
            meta={roles.data.meta}
            page={page}
            onPage={setPage}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            fetching={roles.isFetching}
            emptyText="No roles match the filters"
          />
        ) : null}
      </div>

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <RoleFormModal role={dialog.type === 'edit' ? dialog.role : undefined} onClose={close} onSaved={reload} />
      )}
      {dialog?.type === 'permissions' && (
        <RolePermissionsDrawer
          role={dialog.role}
          catalogue={perms.data ?? []}
          editable={can('assignPermissions') && dialog.role.code !== PROTECTED}
          onClose={close}
          onSaved={reload}
        />
      )}
      {dialog?.type === 'lms' && <LmsMenusDrawer role={dialog.role} editable={can('assignPermissions')} onClose={close} onSaved={reload} />}
      {dialog?.type === 'delete' && (
        <ConfirmModal
          title="Delete role"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the role ${dialog.role.name}? Users holding it lose its permissions immediately. The role is soft-deleted and kept for audit history.`}
          onClose={close}
          onConfirm={() =>
            run(
              () => rolesApi.remove(dialog.role.id),
              'Role deleted',
              async () => {
                close();
                await reload();
              },
            )
          }
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
  const [platform, setPlatform] = useState<RolePlatform>(role?.platform ?? 'ADMIN');
  const { busy, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () =>
        editing
          ? rolesApi.update(role.id, {
              name: name.trim(),
              description: description.trim() || null,
              ...(platform !== role.platform ? { platform } : {}),
            })
          : rolesApi.create({ name: name.trim(), code: code.trim(), description: description.trim() || null, platform }),
      editing ? 'Role updated' : 'Role created',
    );
    if (ok) {
      onClose();
      await onSaved();
    }
  }

  return (
    <Modal
      title={editing ? 'Edit role' : 'Add role'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="role-form" className="btn primary" disabled={busy}>
            {editing ? 'Save' : 'Create role'}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={submit} noValidate>
        <div className="grid g2">
          <div className="fld">
            <label htmlFor="rf-name">Name</label>
            <input className="inp" id="rf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="rf-code">Code</label>
            <input
              className="inp mono"
              id="rf-code"
              value={code}
              disabled={editing}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="REGIONAL_LEAD"
            />
            <div className="hint">{editing ? 'The code cannot be changed.' : 'UPPER_SNAKE_CASE, 2–64 characters.'}</div>
          </div>
        </div>
        <div className="fld mt10">
          <label htmlFor="rf-platform">Application</label>
          <select
            className="inp"
            id="rf-platform"
            value={platform}
            disabled={role?.isSystem}
            onChange={(e) => setPlatform(e.target.value as RolePlatform)}
          >
            <option value="ADMIN">Admin Panel role — Admin Panel menus and permissions</option>
            <option value="LMS">LMS role — LMS menus only (sign-in to the LMS)</option>
          </select>
          <div className="hint">
            {editing
              ? 'A role can change application only after its permissions (or LMS menus) are cleared.'
              : 'An LMS role never opens Admin Panel menus; an Admin Panel role never opens LMS menus.'}
          </div>
        </div>
        <div className="fld mt10">
          <label htmlFor="rf-desc">Description</label>
          <textarea className="inp" id="rf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {!editing ? (
          <div className="hint mt10">
            {platform === 'LMS'
              ? 'Tick its LMS menus after creating the role, from its LMS menus button.'
              : 'Add permissions after creating the role, from its Permissions button.'}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function RolePermissionsDrawer({
  role,
  catalogue,
  editable,
  onClose,
  onSaved,
}: {
  role: ApiRole;
  catalogue: ApiPermission[];
  editable: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const detail = useApiData(() => rolesApi.get(role.id), [role.id]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const { permissions: mine } = useAuth();
  const { busy, run } = useAction();

  const granted = useMemo(() => selected ?? new Set((detail.data?.permissions ?? []).map((p) => p.id)), [selected, detail.data]);
  /* The full active catalogue; falls back to the role's own grants when the catalogue is not visible. */
  const website = role.code === WEBSITE_ADMIN_ROLE;
  const source = useMemo(() => {
    const all = catalogue.length ? catalogue.filter((p) => p.isActive || granted.has(p.id)) : (detail.data?.permissions ?? []);
    /* The backend refuses any code outside the CMS menu for the Website Admin role. */
    return website ? all.filter((p) => WEBSITE_MENUS.includes(p.module)) : all;
  }, [catalogue, detail.data, granted, website]);

  return (
    <Drawer
      title={'Permissions — ' + role.name}
      size="wide"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {editable ? 'Cancel' : 'Close'}
          </button>
          {editable ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy || !detail.data}
              onClick={() =>
                run(
                  () => rolesApi.replacePermissions(role.id, [...granted]),
                  'Permissions updated',
                  async () => {
                    onClose();
                    await onSaved();
                  },
                )
              }
            >
              Save permissions ({granted.size})
            </button>
          ) : null}
        </>
      }
    >
      {role.code === PROTECTED ? (
        <Callout tone="info" title="Protected role">
          Super Admin always holds every permission; its grants cannot be edited.
        </Callout>
      ) : null}
      {website ? (
        <Callout tone="info" title="Website Admin role">
          Holds CMS menu permissions only, and its holders hold no other role. Manage its accounts in the Website Admins tab.
        </Callout>
      ) : null}
      {editable ? (
        <Callout tone="info" title="Privilege rules">
          You can only grant or remove permissions you hold yourself, and you cannot change a role you hold unless you are a Super Admin.
        </Callout>
      ) : null}
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data ? (
        <PermissionMatrix permissions={source} granted={granted} editable={editable} held={mine} onChange={setSelected} />
      ) : null}
    </Drawer>
  );
}

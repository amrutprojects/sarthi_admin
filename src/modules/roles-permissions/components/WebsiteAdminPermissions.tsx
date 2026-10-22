import { useMemo, useState } from 'react';
import { LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';
import { Callout } from '../../../components/ui';
import { WEBSITE_MENUS, useAuth, useCan } from '../../auth';
import { permissionsApi, rolesApi, type ApiPermission, type ApiRole } from '../services/rbacApi';
import PermissionMatrix from './PermissionMatrix';

/*
 * What every Website Admin may do: the Website Admin role's grants, as a matrix of the CMS menu only (the backend
 * refuses any other code for this role). Saving replaces the role's permission set (PUT /roles/:id/permissions).
 */
export default function WebsiteAdminPermissions({ role }: { role: ApiRole }) {
  const can = useCan();
  const { permissions: mine, refresh } = useAuth();
  const canSeeCatalogue = can('viewPermissions');
  const editable = can('assignPermissions') && role.isActive;
  const detail = useApiData(() => rolesApi.get(role.id), [role.id]);
  const catalogue = useApiData(
    () => (canSeeCatalogue ? permissionsApi.listAll() : Promise.resolve([] as ApiPermission[])),
    [canSeeCatalogue],
  );
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const { busy, run } = useAction();

  const granted = useMemo(() => selected ?? new Set((detail.data?.permissions ?? []).map((p) => p.id)), [selected, detail.data]);
  /* The active CMS catalogue; falls back to the role's own grants when the catalogue is not visible. */
  const source = useMemo(() => {
    const all = catalogue.data?.length ? catalogue.data.filter((p) => p.isActive || granted.has(p.id)) : (detail.data?.permissions ?? []);
    return all.filter((p) => WEBSITE_MENUS.includes(p.module));
  }, [catalogue.data, detail.data, granted]);

  return (
    <div className="card mt14">
      <div className="card-h">
        <h3>
          Website Admin permissions <span className="sub">CMS menu only · applies to every Website Admin</span>
        </h3>
        {editable ? (
          <div className="f gp4">
            <button type="button" className="btn sm" disabled={!selected || busy} onClick={() => setSelected(null)}>
              Reset
            </button>
            <button
              type="button"
              className="btn sm primary"
              disabled={!selected || busy || !detail.data}
              onClick={() =>
                run(
                  () => rolesApi.replacePermissions(role.id, [...granted]),
                  'Website Admin permissions updated',
                  async () => {
                    setSelected(null);
                    await detail.reload();
                    await refresh();
                  },
                )
              }
            >
              Save permissions ({granted.size})
            </button>
          </div>
        ) : null}
      </div>
      <div className="card-b">
        <div className="mb14">
          {role.isActive ? (
            <Callout tone="info" title="CMS pages and actions. ">
              Tick what Website Admins may open and change. Every menu outside CMS stays closed to them, whatever is ticked here.
            </Callout>
          ) : (
            <Callout tone="warn" title="The Website Admin role is inactive. ">
              Website Admins can sign in but open no screen. Activate the role in the Roles tab to change or use these permissions.
            </Callout>
          )}
        </div>
        <LoadState
          loading={detail.loading || catalogue.loading}
          error={detail.error ?? catalogue.error}
          onRetry={() => {
            void detail.reload();
            void catalogue.reload();
          }}
        />
        {detail.data ? <PermissionMatrix permissions={source} granted={granted} editable={editable} held={mine} onChange={setSelected} /> : null}
      </div>
    </div>
  );
}

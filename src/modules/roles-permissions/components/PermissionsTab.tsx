import { useMemo } from 'react';
import { GenBadge, Kpi } from '../../../components/ui';
import { useCan } from '../../auth/components/Can';
import { useAuth } from '../../auth/AuthContext';
import { permissionsApi } from '../services/rbacApi';
import { LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';

/* Permission catalogue grouped by module, with activation (a deactivated permission grants nothing). */
export default function PermissionsTab() {
  const can = useCan();
  const { refresh } = useAuth();
  const perms = useApiData(() => permissionsApi.listAll());
  const { busy, run } = useAction();

  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof perms.data>>();
    for (const p of perms.data ?? []) m.set(p.module, [...(m.get(p.module) ?? []), p]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [perms.data]);

  const all = perms.data ?? [];
  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Permissions" value={all.length} tone="b" />
        <Kpi label="Active" value={all.filter((p) => p.isActive).length} tone="g" />
        <Kpi label="Inactive" value={all.filter((p) => !p.isActive).length} tone="" />
        <Kpi label="Modules" value={groups.length} tone="v" />
      </div>
      <LoadState loading={perms.loading && !perms.data} error={perms.error} onRetry={() => void perms.reload()} />
      <div className="grid g2">
        {groups.map(([module, list]) => (
          <div key={module} className="card">
            <div className="card-h"><h3 style={{ textTransform: 'capitalize' }}>{module} <span className="sub">{list.length} permissions</span></h3></div>
            <div className="card-b flush">
              <div className="list">
                {list.map((p) => (
                  <div key={p.id} className="list-row norow">
                    <div className="lr-main"><b>{p.name}</b><span className="mono">{p.code}</span></div>
                    <GenBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    {can('updatePermission') ? (
                      <button type="button" className="btn xs" disabled={busy}
                        onClick={() => run(() => permissionsApi.setStatus(p.id, !p.isActive), p.isActive ? 'Permission deactivated' : 'Permission activated', async () => { await perms.reload(); await refresh(); })}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

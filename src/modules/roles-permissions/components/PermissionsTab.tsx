import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Kpi } from '../../../components/ui';
import StatusToggle from '../../../components/ui/StatusToggle';
import ListFilters, { statusParam, type ListFilterValues } from '../../../components/tables/ListFilters';
import ServerTable, { type ServerColumn, type ServerSort } from '../../../components/tables/ServerTable';
import type { ApiError } from '../../../services/api-client';
import { useAuth, useCan } from '../../auth';
import { permissionsApi, type ApiPermission } from '../services/rbacApi';
import { countOf, usePagedPermissions } from '../hooks/usePagedRbac';
import { LoadState, useAction } from '../../../components/feedback/apiFeedback';

const PAGE_SIZE = 20;

/* Permission catalogue, paged, searched, filtered and sorted on the server, with activation (a deactivated permission grants nothing). */
export default function PermissionsTab() {
  const can = useCan();
  const { refresh } = useAuth();
  const { busy, run } = useAction();
  const [filters, setFilters] = useState<ListFilterValues>({ search: '', status: 'all' });
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ServerSort>({ sortBy: 'module', sortOrder: 'ASC' });
  const onFilters = useCallback((v: ListFilterValues) => {
    setFilters(v);
    setPage(1);
  }, []);

  const perms = usePagedPermissions({
    page,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    isActive: statusParam(filters.status),
    module: module || undefined,
    ...sort,
  });
  /* Module names for the filter dropdown (the catalogue is small; cached). */
  const catalogue = useQuery({ queryKey: ['permissions', 'all'], queryFn: () => permissionsApi.listAll(), staleTime: 300_000 });
  const modules = useMemo(() => [...new Set((catalogue.data ?? []).map((p) => p.module))].sort(), [catalogue.data]);
  const total = usePagedPermissions({ page: 1, limit: 1 });
  const active = usePagedPermissions({ page: 1, limit: 1, isActive: true });
  const inactive = usePagedPermissions({ page: 1, limit: 1, isActive: false });
  const reload = async () => {
    await Promise.all([perms.refetch(), total.refetch(), active.refetch(), inactive.refetch()]);
    await refresh();
  };

  const columns: ServerColumn<ApiPermission>[] = [
    {
      key: 'name',
      label: 'Permission',
      sortKey: 'name',
      render: (p) => (
        <div>
          <b>{p.name}</b>
          <div className="fs11 muted mono">{p.code}</div>
        </div>
      ),
    },
    { key: 'module', label: 'Module', sortKey: 'module', render: (p) => <span style={{ textTransform: 'capitalize' }}>{p.module}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <StatusToggle
          active={p.isActive}
          label={`Status of ${p.name}`}
          busy={busy}
          onChange={
            can('updatePermission')
              ? (isActive) =>
                  run(() => permissionsApi.setStatus(p.id, isActive), isActive ? 'Permission activated' : 'Permission deactivated', reload)
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Permissions" value={countOf(total)} tone="b" />
        <Kpi label="Active" value={countOf(active)} tone="g" />
        <Kpi label="Inactive" value={countOf(inactive)} tone="" />
        <Kpi label="Modules" value={catalogue.data ? modules.length : '—'} tone="v" />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Permissions <span className="sub">live from the backend</span>
          </h3>
        </div>
        <div className="card-b">
          <ListFilters value={filters} onChange={onFilters} placeholder="Search permission name or code" label="Search permissions">
            <select
              className="inp sm tw-w-auto"
              aria-label="Filter by module"
              value={module}
              onChange={(e) => {
                setModule(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </ListFilters>
        </div>
        <LoadState loading={perms.isLoading} error={perms.error as ApiError | null} onRetry={() => void perms.refetch()} />
        {perms.data ? (
          <ServerTable
            rows={perms.data.data}
            rowKey={(p) => p.id}
            columns={columns}
            meta={perms.data.meta}
            page={page}
            onPage={setPage}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            fetching={perms.isFetching}
            emptyText="No permissions match the filters"
          />
        ) : null}
      </div>
    </>
  );
}

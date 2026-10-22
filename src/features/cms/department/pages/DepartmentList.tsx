import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { departmentService } from '../services/departmentService';
import type { ApiDepartment } from '../types/department.types';

/* Department Master listing: search, status filter, sorting, paging — all served by the backend. */
export default function DepartmentList() {
  usePageTitle('Department Master');
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => masterQuery('name'), []);
  const { query, patch, reset } = useMasterQuery(initial);
  const page = useApiData(() => departmentService.list(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiDepartment | null>(null);
  const [confirming, setConfirming] = useState<ApiDepartment | null>(null);

  /* Totals for the KPI row: counted by the backend, so they ignore the current page and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const [total, active] = await Promise.all([departmentService.count(), departmentService.count('true')]);
      return { total, active, inactive: total - active };
    },
    [statsKey],
  );

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiDepartment>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Department Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'Department Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/departments/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateDepartment">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/departments/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateDepartment">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteDepartment">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '' || query.status !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Department Master' }]}
        title="Department Master"
        sub="Departments available to the other masters and forms."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createDepartment">
              <button type="button" className="btn primary" onClick={() => go('/cms/departments/create')}>
                <Icon name="plus" />Add Department
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Total departments', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in dropdowns' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
        ]}
      />

      <FilterBar
        id="cms-departments"
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<MasterQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>Departments <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={query}
          onQuery={patch}
          onRetry={reload}
          searchLabel="name or code"
          emptyMsg={filtered ? 'No department matches the current search and filters.' : 'No departments have been added yet. Use Add Department to create the first one.'}
          rowLink={can('viewDepartments') ? (r) => `/cms/departments/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate department' : 'Activate department'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the department ${confirming.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => departmentService.setStatus(row.id, !row.isActive), row.isActive ? 'Department deactivated' : 'Department activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete department"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the department ${deleting.name}? It is soft-deleted and kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => departmentService.remove(deleting.id), 'Department deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

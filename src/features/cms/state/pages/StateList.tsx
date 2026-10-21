import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { districtService } from '../../district/services/districtService';
import { stateService } from '../services/stateService';
import type { ApiState } from '../types/state.types';

/* State Master listing: search, status filter, sorting, paging — all served by the backend. */
export default function StateList() {
  usePageTitle('State Master');
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => masterQuery('name'), []);
  const { query, patch, reset } = useMasterQuery(initial);
  const page = useApiData(() => stateService.list(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiState | null>(null);
  const [confirming, setConfirming] = useState<{ kind: 'status'; row: ApiState } | null>(null);

  /* Totals for the KPI row: counted by the backend, so they ignore the current page and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const [total, active, districts] = await Promise.all([stateService.count(), stateService.count('true'), districtService.count()]);
      return { total, active, inactive: total - active, districts };
    },
    [statsKey],
  );

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiState>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'State Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'State Code', render: (r) => <span className="mono fs12">{r.code}</span> },
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
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/states/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateState">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/states/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateState">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming({ kind: 'status', row: r })} />
          </Can>
          <Can action="deleteState">
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
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'State Master' }]}
        title="State Master"
        sub="States available to the District and Taluka masters, and to the public website forms."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createState">
              <button type="button" className="btn primary" onClick={() => go('/cms/states/create')}>
                <Icon name="plus" />Add State
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Total states', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in the District form and on the public site' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
          { label: 'Districts mapped', value: stats.data?.districts, tone: 'v', title: 'Districts across every state' },
        ]}
      />

      <FilterBar
        id="cms-states"
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<MasterQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>States <span className="sub">live from the backend</span></h3>
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
          emptyMsg={filtered ? 'No state matches the current search and filters.' : 'No states have been added yet. Use Add State to create the first one.'}
          rowLink={can('viewStates') ? (r) => `/cms/states/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.row.isActive ? 'Deactivate state' : 'Activate state'}
          busy={busy}
          confirmLabel={confirming.row.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.row.isActive ? 'deactivate' : 'activate'} the state ${confirming.row.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const { row } = confirming;
            run(() => stateService.setStatus(row.id, !row.isActive), row.isActive ? 'State deactivated' : 'State activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete state"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete the state ${deleting.name}? It is soft-deleted and kept for audit history. ` +
            'A state that still has districts cannot be deleted — deactivate it instead.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => stateService.remove(deleting.id), 'State deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

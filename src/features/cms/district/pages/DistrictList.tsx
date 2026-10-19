import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { stateService } from '../../state/services/stateService';
import { talukaService } from '../../taluka/services/talukaService';
import { districtService, type DistrictQuery } from '../services/districtService';
import type { ApiDistrict } from '../types/district.types';

/* District Master listing. Accepts ?stateId= so the State view can link straight to its districts. */
export default function DistrictList() {
  usePageTitle('District Master');
  const go = useGo();
  const can = useCan();
  const [params] = useSearchParams();
  const urlStateId = params.get('stateId') ?? '';

  const initial = useMemo<DistrictQuery>(() => ({ ...masterQuery('name'), stateId: urlStateId }), [urlStateId]);
  const { query: q, patch, reset } = useMasterQuery<DistrictQuery>(initial);
  const page = useApiData(() => districtService.list(q), [q]);
  const states = useApiData(() => stateService.options(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiDistrict | null>(null);
  const [confirming, setConfirming] = useState<{ kind: 'status'; row: ApiDistrict } | null>(null);

  /* A fresh ?stateId= (clicking through from a state) replaces the filter; the mount value is already in. */
  const appliedStateId = useRef(urlStateId);
  useEffect(() => {
    if (appliedStateId.current === urlStateId) return;
    appliedStateId.current = urlStateId;
    patch({ stateId: urlStateId });
  }, [urlStateId, patch]);

  /*
   * Totals for the KPI row. They follow the state filter (the page is then about that state) but not
   * the search box or the status filter, so the tiles stay a stable frame of reference.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = q.stateId ? { stateId: q.stateId } : {};
      const [total, active, talukas] = await Promise.all([
        districtService.count(scope),
        districtService.count({ ...scope, isActive: 'true' }),
        talukaService.count(scope),
      ]);
      return { total, active, inactive: total - active, talukas };
    },
    [statsKey, q.stateId],
  );

  const rows = page.data?.items ?? [];
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiDistrict>[] = [
    { k: 'srNo', l: '#', w: '56px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'District Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'District Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'stateName',
      l: 'State Name',
      render: (r) => (
        <span className="fs12">
          {r.stateName}
          {r.stateIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/districts/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateDistrict">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/districts/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateDistrict">
            <button
              type="button"
              className="btn xs"
              title={r.isActive ? 'Deactivate' : 'Activate'}
              aria-label={r.isActive ? 'Deactivate' : 'Activate'}
              style={{ color: r.isActive ? 'var(--amber)' : 'var(--green)' }}
              disabled={busy}
              onClick={() => setConfirming({ kind: 'status', row: r })}
            >
              <Icon name="power" />
            </button>
          </Can>
          <Can action="deleteDistrict">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.stateId !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'District Master' }]}
        title="District Master"
        sub="Districts belong to a state and are the parent of the Taluka master."
        actions={
          <Can action="createDistrict">
            <button
              type="button"
              className="btn primary"
              onClick={() => go(q.stateId ? `/cms/districts/create?stateId=${q.stateId}` : '/cms/districts/create')}
            >
              <Icon name="plus" />Add District
            </button>
          </Can>
        }
      />

      <MasterKpis
        items={[
          { label: q.stateId ? 'Districts in state' : 'Total districts', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in the Taluka form and on the public site' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
          { label: 'Talukas mapped', value: stats.data?.talukas, tone: 'v', title: 'Talukas under these districts' },
        ]}
      />

      <FilterBar
        id="cms-districts"
        fields={[
          {
            k: 'stateId',
            l: 'State',
            options: geoFilterOptions({ options: states.data ?? [], loading: states.loading, allLabel: 'All states' }),
          },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ stateId: q.stateId, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<DistrictQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>Districts <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={q}
          onQuery={patch}
          onRetry={reload}
          searchLabel="district, code or state"
          emptyMsg={filtered ? 'No district matches the current search and filters.' : 'No districts have been added yet. Use Add District to create the first one.'}
          rowLink={can('viewDistricts') ? (r) => `/cms/districts/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.row.isActive ? 'Deactivate district' : 'Activate district'}
          busy={busy}
          confirmLabel={confirming.row.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.row.isActive ? 'deactivate' : 'activate'} the district ${confirming.row.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const { row } = confirming;
            run(() => districtService.setStatus(row.id, !row.isActive), row.isActive ? 'District deactivated' : 'District activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete district"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete the district ${deleting.name} (${deleting.stateName})? It is soft-deleted and kept for audit history. ` +
            'A district that still has talukas cannot be deleted — deactivate it instead.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => districtService.remove(deleting.id), 'District deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

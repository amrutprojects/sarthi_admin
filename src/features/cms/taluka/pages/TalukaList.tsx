import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Dash, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan, useCanOpen } from '../../../../modules/auth';
import { listBackTarget } from '../../backTarget';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { optionLabel, type GeoOption } from '../../types';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { districtService } from '../../district/services/districtService';
import { stateService } from '../../state/services/stateService';
import { talukaService, type TalukaQuery } from '../services/talukaService';
import type { ApiTaluka } from '../types/taluka.types';

/* The listing with no search and no filters; stateId / districtId come from a deep link. */
const emptyQuery = (stateId = '', districtId = ''): TalukaQuery => ({ ...masterQuery('name'), stateId, districtId });

/*
 * Taluka Master listing.
 *
 * The two filters cascade the same way the form does: the district filter only lists districts of the
 * selected state, and is cleared when the state filter changes.
 */
export default function TalukaList() {
  usePageTitle('Taluka Master');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlStateId = params.get('stateId') ?? '';
  const urlDistrictId = params.get('districtId') ?? '';

  const initial = useMemo<TalukaQuery>(() => emptyQuery(urlStateId, urlDistrictId), [urlStateId, urlDistrictId]);
  const { query: q, patch } = useMasterQuery<TalukaQuery>(initial);
  const page = useApiData(() => talukaService.list(q), [q]);
  const states = useApiData(() => stateService.options(), []);
  /* Only loaded once a state is picked; an empty state means the district filter is not offered. */
  const districts = useApiData(
    () => (q.stateId ? districtService.optionsOfState(q.stateId) : Promise.resolve([] as GeoOption[])),
    [q.stateId],
  );
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiTaluka | null>(null);
  const [confirming, setConfirming] = useState<{ kind: 'status'; row: ApiTaluka } | null>(null);

  const appliedUrl = useRef(`${urlStateId}|${urlDistrictId}`);
  useEffect(() => {
    const key = `${urlStateId}|${urlDistrictId}`;
    if (appliedUrl.current === key) return;
    appliedUrl.current = key;
    patch({ stateId: urlStateId, districtId: urlDistrictId });
  }, [urlStateId, urlDistrictId, patch]);

  /*
   * Reset clears every filter, the deep-linked state and district included: they leave the URL as well, so
   * the listing really shows all talukas again instead of quietly restoring the link's filters.
   */
  const resetFilters = () => {
    if (urlStateId || urlDistrictId) {
      appliedUrl.current = '|';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('stateId');
        next.delete('districtId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /* Totals for the KPI row, scoped to whichever parent filter is active (see DistrictList). */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { ...(q.stateId ? { stateId: q.stateId } : {}), ...(q.districtId ? { districtId: q.districtId } : {}) };
      const [total, active, districts] = await Promise.all([
        talukaService.count(scope),
        talukaService.count({ ...scope, isActive: 'true' }),
        districtService.count(q.stateId ? { stateId: q.stateId } : {}),
      ]);
      return { total, active, inactive: total - active, districts };
    },
    [statsKey, q.stateId, q.districtId],
  );

  const rows = page.data?.items ?? [];
  /*
   * The filter options hold active states and districts only. A deep link may name an inactive one; it is
   * labelled from a row of the filtered list rather than the field reading "All …" while filtering.
   */
  const stateRow = q.stateId ? rows.find((r) => r.stateId === q.stateId) : undefined;
  const districtRow = q.districtId ? rows.find((r) => r.districtId === q.districtId) : undefined;
  /* Only active parents can take a new taluka, so an inactive deep-linked one is not carried into Add Taluka. */
  const stateIsOffered = !!q.stateId && (states.data ?? []).some((o) => o.id === q.stateId);
  const districtIsOffered = stateIsOffered && !!q.districtId && (districts.data ?? []).some((o) => o.id === q.districtId);
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiTaluka>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Taluka Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'stateName', l: 'State Name', render: (r) => <span className="fs12">{r.stateName}</span> },
    {
      k: 'districtName',
      l: 'District Name',
      render: (r) => (
        <span className="fs12">
          {r.districtName}
          {r.districtIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    { k: 'code', l: 'Taluka Code', render: (r) => (r.code ? <span className="mono fs12">{r.code}</span> : <Dash />) },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/talukas/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateTaluka">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/talukas/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateTaluka">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming({ kind: 'status', row: r })} />
          </Can>
          <Can action="deleteTaluka">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}>
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.stateId !== '' || q.districtId !== '';
  const createQuery = [stateIsOffered ? `stateId=${q.stateId}` : '', districtIsOffered ? `districtId=${q.districtId}` : ''].filter(Boolean).join('&');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Taluka Master' }]}
        title="Taluka Master"
        sub="Talukas belong to a district; the state shown is the one the district sits in."
        back={
          <BackButton
            to={listBackTarget([
              [urlDistrictId, '/cms/districts', can('viewDistricts') && canOpen('cms-districts')],
              [urlStateId, '/cms/states', can('viewStates') && canOpen('cms-states')],
            ])}
          />
        }
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createTaluka">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(createQuery ? `/cms/talukas/create?${createQuery}` : '/cms/talukas/create')}
              >
                <Icon name="plus" />Add Taluka
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: q.districtId || q.stateId ? 'Talukas in scope' : 'Total talukas', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered on the public site' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
          { label: 'Parent districts', value: stats.data?.districts, tone: 'v', title: 'Districts these talukas can belong to' },
        ]}
      />

      <FilterBar
        id="cms-talukas"
        fields={[
          {
            k: 'stateId',
            l: 'State',
            options: geoFilterOptions({
              options: states.data ?? [],
              loading: states.loading,
              allLabel: 'All states',
              selected: q.stateId,
              /* A taluka row carries no state active flag; a state missing from the loaded active list is inactive. */
              selectedLabel: stateRow
                ? `${optionLabel({ name: stateRow.stateName, code: stateRow.stateCode })}${states.error ? '' : ' (inactive)'}`
                : 'Selected state (inactive)',
            }),
          },
          {
            k: 'districtId',
            l: 'District',
            options: geoFilterOptions({
              options: districts.data ?? [],
              loading: districts.loading,
              allLabel: 'All districts',
              /* The district list only exists per state, so say that rather than offering an empty filter. */
              waiting: !q.stateId,
              waitingLabel: 'All districts (pick a state)',
              selected: q.districtId,
              selectedLabel: districtRow
                ? `${optionLabel({ name: districtRow.districtName, code: districtRow.districtCode })}${districtRow.districtIsActive ? '' : ' (inactive)'}`
                : 'Selected district (inactive)',
            }),
          },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ stateId: q.stateId, districtId: q.districtId, status: q.status }}
        /* Changing the state drops the district filter: it belonged to the previous state. */
        onChange={(key, value) =>
          patch(key === 'stateId' ? { stateId: value, districtId: '' } : ({ [key]: value } as Partial<TalukaQuery>))
        }
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Talukas <span className="sub">live from the backend</span></h3>
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
          searchLabel="taluka, district or state"
          emptyMsg={filtered ? 'No taluka matches the current search and filters.' : 'No talukas have been added yet. Use Add Taluka to create the first one.'}
          rowLink={can('viewTalukas') ? (r) => `/cms/talukas/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.row.isActive ? 'Deactivate taluka' : 'Activate taluka'}
          busy={busy}
          confirmLabel={confirming.row.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.row.isActive ? 'deactivate' : 'activate'} the taluka ${confirming.row.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const { row } = confirming;
            run(() => talukaService.setStatus(row.id, !row.isActive), row.isActive ? 'Taluka deactivated' : 'Taluka activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete taluka"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete the taluka ${deleting.name} (${deleting.districtName}, ${deleting.stateName})? It is soft-deleted and kept for audit history. ` +
            'A taluka used by colleges or training centres cannot be deleted — deactivate it instead.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => talukaService.remove(deleting.id), 'Taluka deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

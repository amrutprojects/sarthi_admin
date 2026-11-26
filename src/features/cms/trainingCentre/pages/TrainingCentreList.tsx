import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan, useCanOpen } from '../../../../modules/auth';
import { listBackTarget } from '../../backTarget';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { masterOptions } from '../../options';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { optionLabel, type GeoOption } from '../../types';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { trainingCentreService, type TrainingCentreQuery } from '../services/trainingCentreService';
import type { ApiTrainingCentre } from '../types/trainingCentre.types';

/* The listing with no search and no filters; the parent ids come from a deep link. A district needs its state. */
const emptyQuery = (centreTypeId = '', stateId = '', districtId = ''): TrainingCentreQuery => ({
  ...masterQuery('name'), centreTypeId, stateId, districtId: stateId ? districtId : '',
});

/* A deep-linked parent missing from the active filter options: "Partner (PARTNER) (inactive)". */
const linkedLabel = (name: string, code: string | null, isActive: boolean) => `${optionLabel({ name, code })}${isActive ? '' : ' (inactive)'}`;

/*
 * Training Centre Master listing. Accepts ?centreTypeId= (the Training Centre Type view links here) and
 * ?stateId= / ?districtId=. The State and District filters cascade the same way the form does: the
 * district filter lists only districts of the selected state and is cleared when the state changes.
 */
export default function TrainingCentreList() {
  usePageTitle('Training Centre Master');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlCentreTypeId = params.get('centreTypeId') ?? '';
  const urlStateId = params.get('stateId') ?? '';
  const urlDistrictId = params.get('districtId') ?? '';

  const initial = useMemo<TrainingCentreQuery>(
    () => emptyQuery(urlCentreTypeId, urlStateId, urlDistrictId),
    [urlCentreTypeId, urlStateId, urlDistrictId],
  );
  const { query: q, patch } = useMasterQuery<TrainingCentreQuery>(initial);
  const page = useApiData(() => trainingCentreService.list(q), [q]);
  const centreTypes = useApiData(() => masterOptions.centreTypes(), []);
  const states = useApiData(() => masterOptions.states(), []);
  /* Only loaded once a state is picked; without one the district filter is not offered. */
  const districts = useApiData(
    () => (q.stateId ? masterOptions.districtsOfState(q.stateId) : Promise.resolve([] as GeoOption[])),
    [q.stateId],
  );
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiTrainingCentre | null>(null);
  const [confirming, setConfirming] = useState<ApiTrainingCentre | null>(null);

  /* A fresh deep link (clicking through from a centre type) replaces the filters; the mount value is already in. */
  const appliedUrl = useRef(`${urlCentreTypeId}|${urlStateId}|${urlDistrictId}`);
  useEffect(() => {
    const key = `${urlCentreTypeId}|${urlStateId}|${urlDistrictId}`;
    if (appliedUrl.current === key) return;
    appliedUrl.current = key;
    patch({ centreTypeId: urlCentreTypeId, stateId: urlStateId, districtId: urlStateId ? urlDistrictId : '' });
  }, [urlCentreTypeId, urlStateId, urlDistrictId, patch]);

  /*
   * Reset clears every filter, the deep-linked ones included: they leave the URL as well, so the listing
   * really shows all centres again instead of quietly restoring the link's filters.
   */
  const resetFilters = () => {
    if (urlCentreTypeId || urlStateId || urlDistrictId) {
      appliedUrl.current = '||';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('centreTypeId');
        next.delete('stateId');
        next.delete('districtId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /*
   * Totals for the KPI row. They follow the centre type / state / district filters (the page is then
   * about that slice) but not the search box or the status filter, so the tiles stay a stable frame of
   * reference.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { centreTypeId: q.centreTypeId, stateId: q.stateId, districtId: q.districtId };
      const [total, active] = await Promise.all([
        trainingCentreService.count(scope),
        trainingCentreService.count({ ...scope, isActive: 'true' }),
      ]);
      return { total, active, inactive: total - active };
    },
    [statsKey, q.centreTypeId, q.stateId, q.districtId],
  );

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  /*
   * The filter options hold active centre types, states and districts only. A deep link may name one that
   * has since been deactivated; it stays visible as the selected entry (labelled from a row of the filtered
   * list) rather than the field showing "All" while filtering.
   */
  const typeRow = q.centreTypeId ? rows.find((r) => r.centreTypeId === q.centreTypeId) : undefined;
  const stateRow = q.stateId ? rows.find((r) => r.stateId === q.stateId) : undefined;
  const districtRow = q.districtId ? rows.find((r) => r.districtId === q.districtId) : undefined;
  /* Only active parents can take a new centre, so an inactive deep-linked one is not carried into Add Training Centre. */
  const typeIsOffered = !!q.centreTypeId && (centreTypes.data ?? []).some((o) => o.id === q.centreTypeId);
  const stateIsOffered = !!q.stateId && (states.data ?? []).some((o) => o.id === q.stateId);
  const districtIsOffered = stateIsOffered && !!q.districtId && (districts.data ?? []).some((o) => o.id === q.districtId);

  const columns: MasterColumn<ApiTrainingCentre>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Centre Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'Centre Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'centreTypeName',
      l: 'Centre Type',
      render: (r) =>
        r.centreTypeName ? (
          <span className="fs12">
            {r.centreTypeName}
            {r.centreTypeIsActive === false ? <span className="muted"> (inactive)</span> : null}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      k: 'districtName',
      l: 'District',
      render: (r) => (
        <span className="fs12">
          {r.districtName}
          {r.districtIsActive ? null : <span className="muted"> (inactive)</span>}
          <span className="muted">{r.talukaName ? ` · ${r.talukaName}` : ''} · {r.stateName}</span>
        </span>
      ),
    },
    {
      k: 'poc',
      l: 'POC',
      sortable: false,
      render: (r) =>
        r.pocName || r.pocMobile ? (
          <span className="fs12">
            {r.pocName ?? '—'}
            {r.pocMobile ? <span className="muted mono"> · {r.pocMobile}</span> : null}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/training-centres/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateTrainingCentre">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/training-centres/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateTrainingCentre">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteTrainingCentre">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const scoped = q.centreTypeId !== '' || q.stateId !== '' || q.districtId !== '';
  const filtered = q.search !== '' || q.status !== '' || scoped;

  /* Add opens with the current filters preselected, as far as they are still offered in its dropdowns. */
  const createLink = (() => {
    const p = new URLSearchParams();
    if (typeIsOffered) p.set('centreTypeId', q.centreTypeId);
    if (stateIsOffered) p.set('stateId', q.stateId);
    if (districtIsOffered) p.set('districtId', q.districtId);
    const s = p.toString();
    return s ? `/cms/training-centres/create?${s}` : '/cms/training-centres/create';
  })();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Training Centre Master' }]}
        title="Training Centre Master"
        sub="Training centres (profile sections A–B). Location and capacity are kept in their own masters, one record per centre."
        back={
          <BackButton
            to={listBackTarget([
              [urlStateId ? urlDistrictId : '', '/cms/districts', can('viewDistricts') && canOpen('cms-districts')],
              [urlStateId, '/cms/states', can('viewStates') && canOpen('cms-states')],
              [urlCentreTypeId, '/cms/centre-types', can('viewCentreTypes') && canOpen('cms-centre-types')],
            ])}
          />
        }
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createTrainingCentre">
              <button type="button" className="btn primary" onClick={() => go(createLink)}>
                <Icon name="plus" />Add Training Centre
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: scoped ? 'Centres in selection' : 'Total centres', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in the dropdowns of the other masters' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept for history; not offered in any dropdown' },
        ]}
      />

      <FilterBar
        id="cms-training-centres"
        fields={[
          {
            k: 'centreTypeId',
            l: 'Centre Type',
            options: geoFilterOptions({
              options: centreTypes.data ?? [],
              loading: centreTypes.loading,
              allLabel: 'All centre types',
              selected: q.centreTypeId,
              selectedLabel: typeRow?.centreTypeName
                ? linkedLabel(typeRow.centreTypeName, typeRow.centreTypeCode, typeRow.centreTypeIsActive !== false)
                : 'Selected centre type (inactive)',
            }),
          },
          {
            k: 'stateId',
            l: 'State',
            options: geoFilterOptions({
              options: states.data ?? [],
              loading: states.loading,
              allLabel: 'All states',
              selected: q.stateId,
              selectedLabel: stateRow ? linkedLabel(stateRow.stateName, stateRow.stateCode, stateRow.stateIsActive) : 'Selected state (inactive)',
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
                ? linkedLabel(districtRow.districtName, districtRow.districtCode, districtRow.districtIsActive)
                : 'Selected district (inactive)',
            }),
          },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ centreTypeId: q.centreTypeId, stateId: q.stateId, districtId: q.districtId, status: q.status }}
        /* Changing the state drops the district filter: it belonged to the previous state. */
        onChange={(key, value) =>
          patch(key === 'stateId' ? { stateId: value, districtId: '' } : ({ [key]: value } as Partial<TrainingCentreQuery>))
        }
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Training centres <span className="sub">live from the backend</span></h3>
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
          searchLabel="name, code, district or POC"
          emptyMsg={
            filtered
              ? 'No training centre matches the current search and filters.'
              : 'No training centres have been added yet. Use Add Training Centre to create the first one.'
          }
          rowLink={can('viewTrainingCentres') ? (r) => `/cms/training-centres/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate training centre' : 'Activate training centre'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Are you sure you want to deactivate the training centre ${confirming.name}? It stays on record with its related data but is no longer offered in any dropdown.`
              : `Are you sure you want to activate the training centre ${confirming.name}?`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => trainingCentreService.setStatus(row.id, !row.isActive),
              row.isActive ? 'Training centre deactivated' : 'Training centre activated',
              async () => {
                setConfirming(null);
                await reload();
              },
            );
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete training centre"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'training-centre', id: deleting.id }}
          message={
            `Delete the training centre ${deleting.name} (${deleting.code})? It is soft-deleted and kept for audit history. ` +
            'A centre that still has location information, a capacity & infrastructure record, batches or documents cannot be ' +
            'deleted — deactivate it instead, or remove those records first.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => trainingCentreService.remove(deleting.id), 'Training centre deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

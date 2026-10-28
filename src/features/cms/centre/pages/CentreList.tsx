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
import { masterOptions } from '../../options';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { optionLabel, type GeoOption } from '../../types';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { centreService, type CentreQuery } from '../services/centreService';
import type { ApiCentre } from '../types/centre.types';

/* The listing with no search and no filters; stateId / districtId come from a deep link. */
const emptyQuery = (stateId = '', districtId = ''): CentreQuery => ({ ...masterQuery('name'), stateId, districtId, technologyCode: '' });

/* A deep-linked parent missing from the active filter options: "Pune (PUN) (inactive)". */
const linkedLabel = (name: string, code: string | null, isActive: boolean) => `${optionLabel({ name, code })}${isActive ? '' : ' (inactive)'}`;

/* How many technology names the Technologies cell shows before "+N more" (the full list is in its tooltip). */
const TECHNOLOGIES_SHOWN = 2;

function TechnologiesCell({ centre }: { centre: ApiCentre }) {
  if (!centre.technologies.length) return <Dash />;
  const label = (t: ApiCentre['technologies'][number]) => `${t.name}${t.usable ? '' : ' (inactive)'}`;
  const shown = centre.technologies.slice(0, TECHNOLOGIES_SHOWN);
  const more = centre.technologies.length - shown.length;
  return (
    <span className="fs12" title={centre.technologies.map(label).join(', ')}>
      {shown.map(label).join(', ')}
      {more > 0 ? <span className="muted"> +{more} more</span> : null}
    </span>
  );
}

/*
 * Center Master listing. Accepts ?stateId= and ?districtId= so other screens can link straight to the
 * centers of a district. Same behaviour as the College Master listing, plus the allocated technologies
 * column and a technology filter.
 */
export default function CentreList() {
  usePageTitle('Center Master');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlStateId = params.get('stateId') ?? '';
  const urlDistrictId = params.get('districtId') ?? '';

  const initial = useMemo<CentreQuery>(() => emptyQuery(urlStateId, urlDistrictId), [urlStateId, urlDistrictId]);
  const { query: q, patch } = useMasterQuery<CentreQuery>(initial);
  const page = useApiData(() => centreService.list(q), [q]);
  const states = useApiData(() => masterOptions.states(), []);
  /* Only loaded once a state is picked; without one the district filter is not offered. */
  const districts = useApiData(
    () => (q.stateId ? masterOptions.districtsOfState(q.stateId) : Promise.resolve([] as GeoOption[])),
    [q.stateId],
  );
  const technologies = useApiData(
    async (): Promise<GeoOption[]> => (await centreService.technologyOptions()).map((t) => ({ id: t.code, name: t.name, code: t.code })),
    [],
  );
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiCentre | null>(null);
  const [confirming, setConfirming] = useState<ApiCentre | null>(null);

  /* A fresh ?stateId= / ?districtId= (clicking through from another screen) replaces the filters; the mount value is already in. */
  const appliedUrl = useRef(`${urlStateId}|${urlDistrictId}`);
  useEffect(() => {
    const key = `${urlStateId}|${urlDistrictId}`;
    if (appliedUrl.current === key) return;
    appliedUrl.current = key;
    patch({ stateId: urlStateId, districtId: urlDistrictId });
  }, [urlStateId, urlDistrictId, patch]);

  /* Reset clears every filter, the deep-linked state and district included (they leave the URL as well). */
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

  /*
   * Totals for the KPI row. They follow the location filters (the page is then about that state or
   * district) but not the search box, the status or the technology filter, so the tiles stay a stable frame of reference.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { ...(q.stateId ? { stateId: q.stateId } : {}), ...(q.districtId ? { districtId: q.districtId } : {}) };
      const [total, active] = await Promise.all([centreService.count(scope), centreService.count({ ...scope, isActive: 'true' })]);
      return { total, active, inactive: total - active };
    },
    [statsKey, q.stateId, q.districtId],
  );

  const rows = page.data?.items ?? [];
  /* The filter options hold active states and districts only; an inactive deep-linked one is labelled from a row. */
  const stateRow = q.stateId ? rows.find((r) => r.stateId === q.stateId) : undefined;
  const districtRow = q.districtId ? rows.find((r) => r.districtId === q.districtId) : undefined;
  /* Only active parents can take a new centre, so an inactive deep-linked one is not carried into Add Center. */
  const stateIsOffered = !!q.stateId && (states.data ?? []).some((o) => o.id === q.stateId);
  const districtIsOffered = stateIsOffered && !!q.districtId && (districts.data ?? []).some((o) => o.id === q.districtId);
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiCentre>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Center Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'Center Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'districtName',
      l: 'District',
      render: (r) => (
        <span className="fs12">
          {r.districtName}
          {r.districtIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    { k: 'stateName', l: 'State', sortable: false, render: (r) => <span className="fs12">{r.stateName}</span> },
    {
      k: 'talukaName',
      l: 'Taluka',
      sortable: false,
      render: (r) =>
        r.talukaName ? (
          <span className="fs12">
            {r.talukaName}
            {r.talukaIsActive === false ? <span className="muted"> (inactive)</span> : null}
          </span>
        ) : (
          <Dash />
        ),
    },
    { k: 'technologies', l: 'Technologies', sortable: false, render: (r) => <TechnologiesCell centre={r} /> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/centres/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateCentre">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/centres/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateCentre">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteCentre">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.stateId !== '' || q.districtId !== '' || q.technologyCode !== '';
  const createQuery = [stateIsOffered ? `stateId=${q.stateId}` : '', districtIsOffered ? `districtId=${q.districtId}` : ''].filter(Boolean).join('&');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Center Master' }]}
        title="Center Master"
        sub="Centers, each located in a district and optionally a taluka, with the technologies they offer."
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
            <Can action="createCentre">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(createQuery ? `/cms/centres/create?${createQuery}` : '/cms/centres/create')}
              >
                <Icon name="plus" />Add Center
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: q.districtId || q.stateId ? 'Centers in scope' : 'Total centers', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in dropdowns' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
        ]}
      />

      <FilterBar
        id="cms-centres"
        fields={[
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
          {
            k: 'technologyCode',
            l: 'Technology',
            options: geoFilterOptions({
              options: technologies.data ?? [],
              loading: technologies.loading,
              allLabel: 'All technologies',
              selected: q.technologyCode,
              selectedLabel: 'Selected technology (inactive)',
            }),
          },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ stateId: q.stateId, districtId: q.districtId, technologyCode: q.technologyCode, status: q.status }}
        /* Changing the state drops the district filter: it belonged to the previous state. */
        onChange={(key, value) =>
          patch(key === 'stateId' ? { stateId: value, districtId: '' } : ({ [key]: value } as Partial<CentreQuery>))
        }
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Centers <span className="sub">live from the backend</span></h3>
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
          searchLabel="center, code or district"
          emptyMsg={filtered ? 'No center matches the current search and filters.' : 'No centers have been added yet. Use Add Center to create the first one.'}
          rowLink={can('viewCentres') ? (r) => `/cms/centres/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate center' : 'Activate center'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the center ${confirming.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => centreService.setStatus(row.id, !row.isActive), row.isActive ? 'Center deactivated' : 'Center activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete center"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete the center ${deleting.name} (${deleting.districtName})? It is soft-deleted and kept for audit history, ` +
            'and stops being offered in any form. A center that students or EDP applications refer to cannot be deleted; deactivate it instead.'
          }
          onClose={() => setDeleting(null)}
          /* A 409 (still referenced) is toasted with the API's message by useAction; the dialog stays open so the user can cancel. */
          onConfirm={() =>
            run(() => centreService.remove(deleting.id), 'Center deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

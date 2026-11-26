import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan, useCanOpen } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import { listBackTarget } from '../../backTarget';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { masterOptions } from '../../options';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { centreLocationService, type CentreLocationQuery } from '../services/centreLocationService';
import { PARKING_LABELS, PARKING_OPTIONS, type ApiCentreLocation } from '../types/centreLocation.types';

const PARKING_FILTER: Option[] = [{ v: '', l: 'Any parking' }, ...PARKING_OPTIONS.map((p) => ({ v: p, l: PARKING_LABELS[p] }))];

/* The listing with no search and no filters; centreId comes from a ?centreId= deep link. */
const emptyQuery = (centreId = ''): CentreLocationQuery => ({ ...masterQuery('centreName'), centreId, parking: '' });

/* Location Information listing. Accepts ?centreId= so the Training Centre view can link straight to its record. */
export default function CentreLocationList() {
  usePageTitle('Location Information');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlCentreId = params.get('centreId') ?? '';

  const initial = useMemo<CentreLocationQuery>(() => emptyQuery(urlCentreId), [urlCentreId]);
  const { query: q, patch } = useMasterQuery<CentreLocationQuery>(initial);
  const page = useApiData(() => centreLocationService.list(q), [q]);
  const centres = useApiData(() => masterOptions.trainingCentres(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiCentreLocation | null>(null);
  const [confirming, setConfirming] = useState<ApiCentreLocation | null>(null);

  /* A fresh ?centreId= (clicking through from a centre) replaces the filter; the mount value is already in. */
  const appliedCentreId = useRef(urlCentreId);
  useEffect(() => {
    if (appliedCentreId.current === urlCentreId) return;
    appliedCentreId.current = urlCentreId;
    patch({ centreId: urlCentreId });
  }, [urlCentreId, patch]);

  /*
   * Reset clears every filter, the deep-linked centre included: ?centreId= leaves the URL as well, so the
   * listing really shows all records again instead of quietly restoring the link's centre.
   */
  const resetFilters = () => {
    if (urlCentreId) {
      appliedCentreId.current = '';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('centreId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /*
   * Totals for the KPI row. They follow the centre filter (the page is then about that centre) but not
   * the search box or the other filters, so the tiles stay a stable frame of reference.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = q.centreId ? { centreId: q.centreId } : {};
      const [total, active, parking] = await Promise.all([
        centreLocationService.count(scope),
        centreLocationService.count({ ...scope, isActive: 'true' }),
        centreLocationService.count({ ...scope, parking: 'YES' }),
      ]);
      return { total, active, inactive: total - active, parking };
    },
    [statsKey, q.centreId],
  );

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  /*
   * The centre dropdown lists active centres only. A deep link to a deactivated centre would otherwise
   * show "All centres" while the list is in fact filtered, so the filtered centre is added from the rows.
   */
  const linkedRow = q.centreId ? rows.find((r) => r.centreId === q.centreId) : undefined;
  const centreFilter = geoFilterOptions({
    options: centres.data ?? [],
    loading: centres.loading,
    allLabel: 'All centres',
    selected: q.centreId,
    selectedLabel: linkedRow
      ? `${linkedRow.centreName} (${linkedRow.centreCode})${linkedRow.centreIsActive ? '' : ' (inactive)'}`
      : 'Selected centre (inactive)',
  });
  /* Only an active centre can take a new record, so an inactive deep-linked one is not carried into Add. */
  const centreIsOffered = !!q.centreId && (centres.data ?? []).some((c) => c.id === q.centreId);

  const columns: MasterColumn<ApiCentreLocation>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'centreName',
      l: 'Training Centre',
      render: (r) => (
        <span>
          <b className="lnk">{r.centreName}</b>
          {r.centreIsActive ? null : <span className="muted fs12"> (inactive)</span>}
        </span>
      ),
    },
    { k: 'centreCode', l: 'Centre Code', render: (r) => <span className="mono fs12">{r.centreCode}</span> },
    {
      k: 'address',
      l: 'Address',
      sortable: false,
      render: (r) => (
        <span className="fs12" title={r.address}>
          {r.address.length > 60 ? `${r.address.slice(0, 60)}…` : r.address}
          {r.pinCode ? <span className="muted"> – {r.pinCode}</span> : null}
        </span>
      ),
    },
    {
      k: 'parking',
      l: 'Parking',
      sortable: false,
      render: (r) => <span className="fs12">{r.parking ? PARKING_LABELS[r.parking] : <span className="muted">—</span>}</span>,
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/centre-locations/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateCentreLocation">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/centre-locations/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateCentreLocation">
            <StatusToggle compact isActive={r.isActive} name={r.centreName} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteCentreLocation">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.centreId !== '' || q.parking !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Location Information' }]}
        title="Location Information"
        sub="Address, map link and accessibility of each training centre — one record per centre."
        back={
          <BackButton
            to={listBackTarget([[urlCentreId, '/cms/training-centres', can('viewTrainingCentres') && canOpen('cms-training-centres')]])}
          />
        }
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createCentreLocation">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(centreIsOffered ? `/cms/centre-locations/create?centreId=${q.centreId}` : '/cms/centre-locations/create')}
              >
                <Icon name="plus" />Add Location Information
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: q.centreId ? 'Records for centre' : 'Total records', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
          { label: 'Parking available', value: stats.data?.parking, tone: 'v', title: 'Records with parking recorded as Yes' },
        ]}
      />

      <FilterBar
        id="cms-centre-locations"
        fields={[
          { k: 'centreId', l: 'Training Centre', options: centreFilter },
          { k: 'parking', l: 'Parking', options: PARKING_FILTER },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ centreId: q.centreId, parking: q.parking, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<CentreLocationQuery>)}
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Location records <span className="sub">live from the backend</span></h3>
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
          searchLabel="centre, code, address or landmark"
          emptyMsg={
            filtered
              ? 'No location record matches the current search and filters.'
              : 'No location information has been added yet. Use Add Location Information to create the first record.'
          }
          rowLink={can('viewCentreLocations') ? (r) => `/cms/centre-locations/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate location information' : 'Activate location information'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the location information of ${confirming.centreName}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => centreLocationService.setStatus(row.id, !row.isActive),
              row.isActive ? 'Location information deactivated' : 'Location information activated',
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
          title="Delete location information"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'centre-location', id: deleting.id }}
          message={
            `Delete the location information of ${deleting.centreName} (${deleting.centreCode})? It is soft-deleted and kept for audit history. ` +
            'Nothing else depends on it, and the centre can then be given a new location record.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => centreLocationService.remove(deleting.id), 'Location information deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, dateFmt, useGo } from '../../../../components/ui';
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
import { ConfirmModal, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import BatchStatusPill from '../components/BatchStatusPill';
import { batchService, type BatchQuery } from '../services/batchService';
import {
  BATCH_STATUSES, BATCH_STATUS_LABELS, DELIVERY_MODES, DELIVERY_MODE_LABELS, type ApiBatch,
} from '../types/batch.types';

const BATCH_STATUS_OPTIONS: Option[] = [{ v: '', l: 'All batch statuses' }, ...BATCH_STATUSES.map((s) => ({ v: s, l: BATCH_STATUS_LABELS[s] }))];
const DELIVERY_MODE_OPTIONS: Option[] = [{ v: '', l: 'All delivery modes' }, ...DELIVERY_MODES.map((m) => ({ v: m, l: DELIVERY_MODE_LABELS[m] }))];

/* The listing with no search and no filters; centreId comes from a ?centreId= deep link. */
const emptyQuery = (centreId = ''): BatchQuery => ({ ...masterQuery('name'), centreId, batchStatus: '', deliveryMode: '' });

const assignments = (n: number) => `${n} student ${n === 1 ? 'assignment' : 'assignments'}`;

/* Batch Master listing. Accepts ?centreId= so a training centre can link straight to its batches. */
export default function BatchList() {
  usePageTitle('Batch Master');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlCentreId = params.get('centreId') ?? '';

  const initial = useMemo<BatchQuery>(() => emptyQuery(urlCentreId), [urlCentreId]);
  const { query: q, patch } = useMasterQuery<BatchQuery>(initial);
  const page = useApiData(() => batchService.list(q), [q]);
  const centres = useApiData(() => masterOptions.trainingCentres(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiBatch | null>(null);
  const [confirming, setConfirming] = useState<ApiBatch | null>(null);

  /* A fresh ?centreId= (clicking through from a centre) replaces the filter; the mount value is already in. */
  const appliedCentreId = useRef(urlCentreId);
  useEffect(() => {
    if (appliedCentreId.current === urlCentreId) return;
    appliedCentreId.current = urlCentreId;
    patch({ centreId: urlCentreId });
  }, [urlCentreId, patch]);

  /*
   * Reset clears every filter, the deep-linked centre included: ?centreId= leaves the URL as well, so the
   * listing really shows all batches again instead of quietly restoring the link's centre.
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
   * Totals for the KPI row. They follow the centre filter (the page is then about that centre) but not the
   * search box or the other filters, so the tiles stay a stable frame of reference.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = q.centreId ? { centreId: q.centreId } : {};
      const [total, active, assignable] = await Promise.all([
        batchService.count(scope),
        batchService.count({ ...scope, isActive: 'true' }),
        batchService.assignable(),
      ]);
      return { total, active, inactive: total - active, assignable };
    },
    [statsKey, q.centreId],
  );

  /*
   * "Open for assignment" counts exactly what the Assign Batch form offers: active, Open batches of active
   * centres. That feed has no centre filter, so for a centre-scoped page its rows are picked by centre code;
   * a centre missing from the active list is inactive, and no batch of an inactive centre can be assigned.
   */
  const openForAssignment = (() => {
    const assignable = stats.data?.assignable;
    if (!assignable) return undefined;
    if (!q.centreId) return assignable.length;
    if (centres.loading || centres.error) return undefined;
    const code = centres.data?.find((c) => c.id === q.centreId)?.code;
    return code ? assignable.filter((b) => b.centreCode === code).length : 0;
  })();

  const rows = page.data?.items ?? [];
  /* A deep-linked centre may be inactive (not in the active list); the filter then names it from the rows. */
  const linkedRow = q.centreId ? rows.find((r) => r.centreId === q.centreId) : undefined;
  /* Only an active centre can take a new batch, so an inactive deep-linked one is not carried into Add Batch. */
  const centreIsOffered = !!q.centreId && (centres.data ?? []).some((c) => c.id === q.centreId);
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiBatch>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'name',
      l: 'Batch Name',
      render: (r) => (
        <div>
          <b className="lnk">{r.name}</b>
          {r.trackName ? <div className="muted fs12">{r.trackName}</div> : null}
        </div>
      ),
    },
    { k: 'code', l: 'Batch Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'centreName',
      l: 'Training Centre',
      render: (r) => (
        <span className="fs12">
          {r.centreName}
          {r.centreIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    {
      k: 'startDate',
      l: 'Schedule',
      render: (r) => (
        <span className="fs12">
          {dateFmt(r.startDate)}
          {r.endDate ? ` – ${dateFmt(r.endDate)}` : ''}
          <span className="muted"> · {DELIVERY_MODE_LABELS[r.deliveryMode] ?? r.deliveryMode}</span>
        </span>
      ),
    },
    {
      k: 'capacity',
      l: 'Assigned / Capacity',
      render: (r) => (
        <span className="fs12" title={`${r.seatsLeft} seats left`}>
          <b>{r.assignedCount}</b> / {r.capacity}
        </span>
      ),
    },
    { k: 'batchStatus', l: 'Batch Status', render: (r) => <BatchStatusPill status={r.batchStatus} /> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/batches/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateCmsBatch">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/batches/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateCmsBatch">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteCmsBatch">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.centreId !== '' || q.batchStatus !== '' || q.deliveryMode !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Batch Master' }]}
        title="Batch Master"
        sub="Programme batches run at the training centres. Students are placed into them through Assign Batch."
        back={
          <BackButton
            to={listBackTarget([[urlCentreId, '/cms/training-centres', can('viewTrainingCentres') && canOpen('cms-training-centres')]])}
          />
        }
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createCmsBatch">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(centreIsOffered ? `/cms/batches/create?centreId=${q.centreId}` : '/cms/batches/create')}
              >
                <Icon name="plus" />Add Batch
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: q.centreId ? 'Batches at centre' : 'Total batches', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered in dropdowns' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a' },
          {
            label: 'Open for assignment',
            value: openForAssignment,
            tone: 'v',
            title: 'Active batches with status Open at an active centre: the batches Assign Batch offers',
          },
        ]}
      />

      <FilterBar
        id="cms-batches"
        fields={[
          {
            k: 'centreId',
            l: 'Training centre',
            options: geoFilterOptions({
              options: centres.data ?? [],
              loading: centres.loading,
              allLabel: 'All centres',
              selected: q.centreId,
              selectedLabel: linkedRow
                ? `${linkedRow.centreName} (${linkedRow.centreCode})${linkedRow.centreIsActive ? '' : ' (inactive)'}`
                : 'Selected centre (inactive)',
            }),
          },
          { k: 'batchStatus', l: 'Batch status', options: BATCH_STATUS_OPTIONS },
          { k: 'deliveryMode', l: 'Delivery mode', options: DELIVERY_MODE_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ centreId: q.centreId, batchStatus: q.batchStatus, deliveryMode: q.deliveryMode, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<BatchQuery>)}
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Batches <span className="sub">live from the backend</span></h3>
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
          searchLabel="batch, code, centre or track"
          emptyMsg={filtered ? 'No batch matches the current search and filters.' : 'No batches have been added yet. Use Add Batch to create the first one.'}
          rowLink={can('viewCmsBatches') ? (r) => `/cms/batches/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate batch' : 'Activate batch'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the batch ${confirming.name} (${confirming.code})?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => batchService.setStatus(row.id, !row.isActive), row.isActive ? 'Batch deactivated' : 'Batch activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete batch"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'batch', id: deleting.id }}
          message={
            deleting.assignmentCount > 0
              ? `The batch ${deleting.name} (${deleting.code}) still has ${assignments(deleting.assignmentCount)} (active or inactive), ` +
                'so the server will refuse to delete it. Delete those assignments in Assign Batch first, or deactivate the batch instead.'
              : `Delete the batch ${deleting.name} (${deleting.code})? It is soft-deleted and kept for audit history. ` +
                'A batch that still has student assignments cannot be deleted — deactivate it instead.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => batchService.remove(deleting.id), 'Batch deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

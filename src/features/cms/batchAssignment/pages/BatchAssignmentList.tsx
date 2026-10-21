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
import { batchAssignmentService, type BatchAssignmentQuery } from '../services/batchAssignmentService';
import { ASSIGNMENT_REASONS, REASON_LABELS, type ApiBatchAssignment } from '../types/batchAssignment.types';

const REASON_OPTIONS: Option[] = [{ v: '', l: 'All reasons' }, ...ASSIGNMENT_REASONS.map((r) => ({ v: r, l: REASON_LABELS[r] }))];

/* The listing with no search and no filters; batchId comes from a ?batchId= deep link. */
const emptyQuery = (batchId = ''): BatchAssignmentQuery => ({ ...masterQuery('studentName'), batchId, centreId: '', reasonCode: '' });

/* Assign Batch listing. Accepts ?batchId= so the Batch view can link straight to the students of a batch. */
export default function BatchAssignmentList() {
  usePageTitle('Assign Batch');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlBatchId = params.get('batchId') ?? '';

  const initial = useMemo<BatchAssignmentQuery>(() => emptyQuery(urlBatchId), [urlBatchId]);
  const { query: q, patch } = useMasterQuery<BatchAssignmentQuery>(initial);
  const page = useApiData(() => batchAssignmentService.list(q), [q]);
  const batches = useApiData(() => masterOptions.batches(), []);
  const centres = useApiData(() => masterOptions.trainingCentres(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiBatchAssignment | null>(null);
  const [confirming, setConfirming] = useState<ApiBatchAssignment | null>(null);

  /* A fresh ?batchId= (clicking through from a batch) replaces the filter; the mount value is already in. */
  const appliedBatchId = useRef(urlBatchId);
  useEffect(() => {
    if (appliedBatchId.current === urlBatchId) return;
    appliedBatchId.current = urlBatchId;
    patch({ batchId: urlBatchId });
  }, [urlBatchId, patch]);

  /*
   * Reset clears every filter, the deep-linked batch included: ?batchId= leaves the URL as well, so the
   * listing really shows all assignments again instead of quietly restoring the link's batch.
   */
  const resetFilters = () => {
    if (urlBatchId) {
      appliedBatchId.current = '';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('batchId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /*
   * Totals for the KPI row. They follow the batch and centre filters (the page is then about that batch or
   * centre) but not the search box or the status filter.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { batchId: q.batchId, centreId: q.centreId };
      const [total, active] = await Promise.all([
        batchAssignmentService.count(scope),
        batchAssignmentService.count({ ...scope, isActive: 'true' }),
      ]);
      return { total, active, inactive: total - active };
    },
    [statsKey, q.batchId, q.centreId],
  );

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  /*
   * The batch filter lists active batches only. A deep link to an inactive batch still has to read as that
   * batch rather than as "All batches", so it is added as an entry named from the rows.
   */
  const linkedRow = q.batchId ? rows.find((r) => r.batchId === q.batchId) : undefined;
  const batchFilterOptions = geoFilterOptions({
    options: batches.data ?? [],
    loading: batches.loading,
    allLabel: 'All batches',
    selected: q.batchId,
    selectedLabel: linkedRow
      ? `${linkedRow.batchName} (${linkedRow.batchCode})${linkedRow.batchIsActive ? '' : ' (inactive)'}`
      : 'Selected batch (inactive)',
  });

  const columns: MasterColumn<ApiBatchAssignment>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'studentName',
      l: 'Student',
      render: (r) => (
        <div>
          <b className="lnk">{r.studentName}</b>
          {r.studentPreferredCentreCode ? <div className="muted fs12">Preferred centre {r.studentPreferredCentreCode}</div> : null}
        </div>
      ),
    },
    { k: 'studentCode', l: 'Student Code', render: (r) => <span className="mono fs12">{r.studentCode}</span> },
    {
      k: 'batchName',
      l: 'Batch',
      render: (r) => (
        <div className="fs12">
          {r.batchName}
          {r.batchIsActive ? null : <span className="muted"> (inactive)</span>}
          <div className="mono muted">{r.batchCode}</div>
        </div>
      ),
    },
    { k: 'centreName', l: 'Training Centre', render: (r) => <span className="fs12">{r.centreName}</span> },
    {
      k: 'reasonCode',
      l: 'Reason',
      sortable: false,
      render: (r) => <span className="fs12">{r.reasonCode ? REASON_LABELS[r.reasonCode] ?? r.reasonCode : <span className="muted">—</span>}</span>,
    },
    { k: 'assignedAt', l: 'Assigned On', render: (r) => <span className="fs12">{fmtDateTime(r.assignedAt)}</span> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/batch-assignments/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateBatchAssignment">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/batch-assignments/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateBatchAssignment">
            <StatusToggle compact isActive={r.isActive} name={r.studentName} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteBatchAssignment">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.batchId !== '' || q.centreId !== '' || q.reasonCode !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Assign Batch' }]}
        title="Assign Batch"
        sub="Students placed into programme batches. Each student holds at most one batch, and a batch never exceeds its capacity."
        back={<BackButton to={listBackTarget([[urlBatchId, '/cms/batches', can('viewCmsBatches') && canOpen('cms-batches')]])} />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createBatchAssignment">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(q.batchId ? `/cms/batch-assignments/create?batchId=${q.batchId}` : '/cms/batch-assignments/create')}
              >
                <Icon name="plus" />Assign Student
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: q.batchId ? 'Students in batch' : 'Total assignments', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Holding a seat' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept, but not holding a seat' },
        ]}
      />

      <FilterBar
        id="cms-batch-assignments"
        fields={[
          { k: 'batchId', l: 'Batch', options: batchFilterOptions },
          {
            k: 'centreId',
            l: 'Training centre',
            options: geoFilterOptions({ options: centres.data ?? [], loading: centres.loading, allLabel: 'All centres' }),
          },
          { k: 'reasonCode', l: 'Reason', options: REASON_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ batchId: q.batchId, centreId: q.centreId, reasonCode: q.reasonCode, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<BatchAssignmentQuery>)}
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Assignments <span className="sub">live from the backend</span></h3>
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
          searchLabel="student name or code, batch name or code"
          emptyMsg={
            filtered
              ? 'No assignment matches the current search and filters.'
              : 'No student has been assigned to a batch yet. Use Assign Student to place the first one.'
          }
          rowLink={can('viewBatchAssignments') ? (r) => `/cms/batch-assignments/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate assignment' : 'Activate assignment'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate the assignment of ${confirming.studentName} to batch ${confirming.batchCode}? The seat is freed; the record is kept.`
              : `Activate the assignment of ${confirming.studentName} to batch ${confirming.batchCode}? It takes a seat again, so it is refused when the batch is full.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => batchAssignmentService.setStatus(row.id, !row.isActive),
              row.isActive ? 'Assignment deactivated' : 'Assignment activated',
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
          title="Delete assignment"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Remove ${deleting.studentName} (${deleting.studentCode}) from batch ${deleting.batchCode}? ` +
            'The assignment is soft-deleted and kept for audit history, the seat is freed, and the student can then be assigned again.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => batchAssignmentService.remove(deleting.id), 'Assignment deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

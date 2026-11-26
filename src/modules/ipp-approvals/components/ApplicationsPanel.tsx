import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fmt } from '../../../components/ui';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import type { ServerSort } from '../../../components/tables/ServerTable';
import { useApplications, useBatch, useBatchOptions, useIppDistricts } from '../hooks/useIppApprovals';
import { useDecisions } from '../hooks/useDecisions';
import { useDebouncedSearch, useExistingPage, useListParams } from '../hooks/useListParams';
import { useRowSelection } from '../hooks/useRowSelection';
import { STAGE_LABEL, stageAfterApproval, stageAfterRejection } from '../labels';
import {
  APPLICATION_VIEWS,
  STAGES,
  type ApplicationRow,
  type ApplicationSort,
  type ApplicationView,
  type ApprovalSummary,
  type BatchRow,
} from '../types/ippApprovals.types';
import ApplicationsTable from './ApplicationsTable';
import ApproveModal from './ApproveModal';
import BulkBar from './BulkBar';
import RejectModal from './RejectModal';
import { LoadProblem, Loading, Notice } from './common';

const PAGE_SIZE = 25;
const SORTS: readonly ApplicationSort[] = ['stageUpdatedAt', 'name', 'registrationId'];
const VIEWS: Record<ApplicationView, { label: string; hint: string; empty: string }> = {
  TO_DECIDE: {
    label: 'To decide',
    hint: 'Applications that wait for your decision now.',
    empty: 'No application waits for your decision.',
  },
  SENT_ON: {
    label: 'Sent on',
    hint: 'Applications that have gone on above your level, final approvals included.',
    empty: 'No application has gone on above your level.',
  },
  SENT_BACK: {
    label: 'Sent back',
    hint: 'Applications that a rejection has sent back below your level.',
    empty: 'No application is sent back below your level.',
  },
  ALL: { label: 'All', hint: 'Every application you may see.', empty: 'No applications yet. They appear here when IPP sends a batch.' },
};

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

interface Props {
  summary: ApprovalSummary;
  /* On a batch's own page: only its applications, without the batch and district filters. */
  batch?: BatchRow;
  defaultView: ApplicationView;
}

/*
 * Applications with their tabs, filters, bulk bar and decisions: the Applications screen, and the list on a batch's
 * page. A user who decides at no stage reads the whole list: no tabs, no checkboxes, no decisions.
 */
export default function ApplicationsPanel({ summary, batch, defaultView }: Props) {
  const location = useLocation();
  const { text, id, oneOf, page, update } = useListParams();
  const decides = summary.stages.length > 0;
  const view: ApplicationView = decides ? (oneOf('view', APPLICATION_VIEWS) ?? defaultView) : 'ALL';
  const search = text('q');
  const stage = oneOf('stage', STAGES);
  const districtId = batch ? '' : id('district');
  const batchId = batch ? batch.id : id('batch');
  const sortBy = oneOf('sort', SORTS);
  const sortOrder = oneOf('dir', ['ASC', 'DESC'] as const) ?? 'ASC';
  const sort: ServerSort | undefined = sortBy ? { sortBy, sortOrder } : undefined;

  const [searchInput, setSearchInput] = useDebouncedSearch(search, (q) => update({ q }));
  const list = useApplications({
    page,
    limit: PAGE_SIZE,
    view,
    search: search || undefined,
    stage,
    batchId: batchId || undefined,
    districtId: districtId || undefined,
    sortBy,
    sortOrder: sortBy ? sortOrder : undefined,
  });
  useExistingPage(page, list.isPlaceholderData ? undefined : list.data?.meta.totalPages, (p) => update({ page: String(p) }));

  /* Filter options: the officer's own districts, or all of them; the batches of the chosen district. */
  const allDistricts = useIppDistricts(!batch && !summary.districts);
  const districts = summary.districts ?? allDistricts.data ?? [];
  const batchOptions = useBatchOptions(districtId || undefined, !batch);
  const filteredBatch = useBatch(batch ? '' : batchId);
  const chosenBatch = batch ?? filteredBatch.data;

  const scope = [view, search, stage, districtId, batchId].join('|');
  const decisions = useDecisions(scope);
  const selection = useRowSelection(scope);
  const [approving, setApproving] = useState<ApplicationRow | null>(null);
  const [rejecting, setRejecting] = useState<ApplicationRow | null>(null);

  const rows = list.data?.items ?? [];
  /* Sent on and Sent back hold nothing to decide, so nothing to choose. */
  const selectable = decides && (view === 'TO_DECIDE' || view === 'ALL');
  const counts: Partial<Record<ApplicationView, number>> = batch
    ? { TO_DECIDE: batch.toDecide, ALL: batch.students }
    : { TO_DECIDE: summary.toDecide, ALL: sum(summary.counts) };
  const otherFilters = !!search || !!stage;
  const filtered = otherFilters || !!districtId || (!batch && !!batchId);

  const label = (s: ReturnType<typeof stageAfterApproval>) => (s ? STAGE_LABEL[s] : null);
  const goesTo = summary.stages.length === 1 ? label(stageAfterApproval(summary.stages[0], summary.headOfficeEnabled)) : null;

  const reset = () => {
    setSearchInput('');
    update({ q: '', stage: '', district: '', batch: '' });
  };
  const batchChoices = [
    { value: '', label: 'All batches' },
    ...(batchOptions.data ?? []).map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` })),
  ];
  if (batchId && !batchChoices.some((o) => o.value === batchId)) {
    batchChoices.push({
      value: batchId,
      label: filteredBatch.data ? `${filteredBatch.data.code} · ${filteredBatch.data.name}` : 'Selected batch',
    });
  }

  return (
    <>
      {decides ? (
        <>
          <div className="pills mb6" role="group" aria-label="Applications">
            {APPLICATION_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className={'chip' + (view === v ? ' on' : '')}
                aria-pressed={view === v}
                onClick={() => update({ view: v === defaultView ? '' : v })}
              >
                {VIEWS[v].label} {counts[v] !== undefined ? <b>{fmt(counts[v])}</b> : null}
              </button>
            ))}
          </div>
          <p className="muted fs12 mb10 tw-mt-0">{VIEWS[view].hint}</p>
        </>
      ) : null}

      <div className="filterbar" role="search" aria-label="Filter applications">
        <div className="fld">
          <label htmlFor="ipp-q">Search</label>
          <input
            id="ipp-q"
            className="inp"
            placeholder="Name, registration ID, mobile or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="fld">
          <label htmlFor="ipp-stage">Stage</label>
          <select id="ipp-stage" className="inp" value={stage ?? ''} onChange={(e) => update({ stage: e.target.value })}>
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {batch ? null : (
          <>
            <div className="fld">
              <label htmlFor="ipp-district">District</label>
              <select
                id="ipp-district"
                className="inp"
                value={districtId}
                onChange={(e) => update({ district: e.target.value, batch: '' })}
              >
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                {districtId && !districts.some((d) => d.id === districtId) ? <option value={districtId}>Selected district</option> : null}
              </select>
            </div>
            <div className="fld">
              <label htmlFor="ipp-batch">Batch</label>
              <SearchableSelect
                id="ipp-batch"
                label="batch"
                options={batchChoices}
                value={batchId}
                placeholder="All batches"
                searchPlaceholder="Search code or name…"
                onChange={(v) => update({ batch: v })}
              />
            </div>
          </>
        )}
        <div className="fb-actions">
          <button type="button" className="btn" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <Notice value={decisions.notice} />

      {list.isError ? (
        <LoadProblem error={list.error} what="the applications" onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        <div className="card">
          <div className="card-b">
            <Loading what="applications" />
          </div>
        </div>
      ) : (
        <>
          {selectable ? (
            <BulkBar
              selection={selection}
              rows={rows}
              batch={batch ? undefined : chosenBatch}
              otherFilters={otherFilters}
              goesTo={goesTo}
              busy={decisions.busy}
              error={decisions.approveError}
              onOpen={decisions.resetApprove}
              onApprove={decisions.approveMany}
            />
          ) : null}
          <div className="card">
            <ApplicationsTable
              rows={rows}
              meta={list.data.meta}
              page={page}
              onPage={(p) => update({ page: String(p) })}
              sort={sort}
              onSort={(s) => update({ sort: s.sortBy, dir: s.sortOrder })}
              fetching={list.isFetching}
              emptyText={filtered ? 'No applications match these filters.' : VIEWS[view].empty}
              selection={selectable ? selection : null}
              hideBatch={!!batch}
              back={location.pathname + location.search}
              onApprove={(row) => {
                decisions.resetApprove();
                setApproving(row);
              }}
              onReject={(row) => {
                decisions.resetReject();
                setRejecting(row);
              }}
            />
          </div>
        </>
      )}

      {approving ? (
        <ApproveModal
          title={`Approve — ${approving.name}`}
          message={`Approve the application of ${approving.name} (${approving.registrationId})? After your approval: ${label(stageAfterApproval(approving.stage, summary.headOfficeEnabled)) ?? 'the next level'}.`}
          confirmLabel={decisions.busy ? 'Approving…' : 'Approve application'}
          askReason={approving.reasonRequired}
          busy={decisions.busy}
          error={decisions.approveError}
          onClose={() => setApproving(null)}
          onApprove={(reason) =>
            decisions.approveOne(approving.id, reason, () => {
              selection.set([approving.id], false);
              setApproving(null);
            })
          }
        />
      ) : null}
      {rejecting ? (
        <RejectModal
          name={rejecting.name}
          registrationId={rejecting.registrationId}
          returnsTo={label(stageAfterRejection(rejecting.stage))}
          busy={decisions.rejecting}
          error={decisions.rejectError}
          onClose={() => setRejecting(null)}
          onReject={(reason) =>
            decisions.reject(rejecting.id, reason, () => {
              selection.set([rejecting.id], false);
              setRejecting(null);
            })
          }
        />
      ) : null}
    </>
  );
}

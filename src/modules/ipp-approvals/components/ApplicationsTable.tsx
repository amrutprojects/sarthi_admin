import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import ServerTable, { type ServerColumn, type ServerSort } from '../../../components/tables/ServerTable';
import type { PageMeta } from '../../../services/api-client';
import type { RowSelection } from '../hooks/useRowSelection';
import { useShowNames } from '../hooks/useShowNames';
import { eventLabel, whoLabel } from '../labels';
import type { ApplicationRow } from '../types/ippApprovals.types';
import { applicationPath, batchPath, type ListState } from '../utils';
import { ForWhom, StageBadge, Wrap } from './common';

/* Ticked when every application of the page that can be chosen is, half-ticked when some are. */
function PageCheckbox({ rows, selection }: { rows: ApplicationRow[]; selection: RowSelection }) {
  const ref = useRef<HTMLInputElement>(null);
  const ids = rows.filter((r) => r.canDecide).map((r) => r.id);
  const chosen = selection.wholeBatch ? ids.length : ids.filter(selection.has).length;
  const all = ids.length > 0 && chosen === ids.length;
  const some = chosen > 0 && !all;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all applications on this page"
      checked={all}
      disabled={!ids.length || selection.wholeBatch}
      onChange={() => selection.set(ids, !all)}
    />
  );
}

/* Where it is and the latest step; for a rejection who sent it back and why. */
function Standing({ row }: { row: ApplicationRow }) {
  const names = useShowNames();
  const e = row.lastEvent;
  return (
    <div className="tw-min-w-[190px] tw-max-w-[300px] tw-whitespace-normal">
      <StageBadge stage={row.stage} label={row.stageLabel} />
      {e ? (
        <div className="fs12 mt4">
          {eventLabel(e.event)} {e.event === 'RECEIVED' ? null : <span className="muted">by {whoLabel(e, names)}</span>}
          {e.event === 'REJECTED' && e.reason ? <div className="tw-text-danger">“{e.reason}”</div> : null}
          <div className="muted">{fmtDateTime(e.at)}</div>
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  rows: ApplicationRow[];
  meta?: PageMeta;
  page: number;
  onPage: (page: number) => void;
  sort?: ServerSort;
  onSort: (sort: ServerSort) => void;
  fetching: boolean;
  emptyText: string;
  /* null = nothing can be chosen in this list. */
  selection: RowSelection | null;
  /* A batch's own page leaves the batch and its district out. */
  hideBatch?: boolean;
  /* Where the application's Back button returns to. */
  back: string;
  onApprove: (row: ApplicationRow) => void;
  onReject: (row: ApplicationRow) => void;
}

/* Applications of one server page. A row offers Approve / Reject only when the API says that this user can decide it now. */
export default function ApplicationsTable({
  rows,
  meta,
  page,
  onPage,
  sort,
  onSort,
  fetching,
  emptyText,
  selection,
  hideBatch,
  back,
  onApprove,
  onReject,
}: Props) {
  const state: ListState = { ids: rows.map((r) => r.id), back };

  const columns: ServerColumn<ApplicationRow>[] = [
    ...(selection
      ? [
          {
            key: 'select',
            label: 'Select',
            header: <PageCheckbox rows={rows} selection={selection} />,
            render: (r: ApplicationRow) => (
              <input
                type="checkbox"
                aria-label={`Select ${r.name}, ${r.registrationId}`}
                title={r.canDecide ? undefined : 'Not waiting for your decision'}
                checked={r.canDecide && (selection.wholeBatch || selection.has(r.id))}
                disabled={!r.canDecide || selection.wholeBatch}
                onChange={(e) => selection.set([r.id], e.target.checked)}
              />
            ),
          },
        ]
      : []),
    {
      key: 'name',
      label: 'Student',
      sortKey: 'name',
      render: (r) => (
        <div className="tw-min-w-[110px] tw-whitespace-normal">
          <Link to={applicationPath(r.id)} state={state} className="lnk">
            {r.name}
          </Link>
          <div className="mono fs12">{r.registrationId}</div>
        </div>
      ),
    },
    ...(hideBatch
      ? []
      : [
          { key: 'district', label: 'District', render: (r: ApplicationRow) => <Wrap>{r.district.name}</Wrap> },
          {
            key: 'batch',
            label: 'Batch',
            render: (r: ApplicationRow) => (
              <>
                <Link to={batchPath(r.batch.id)} className="lnk mono">
                  {r.batch.code}
                </Link>
                <div className="muted fs12">{r.batch.name}</div>
              </>
            ),
          },
        ]),
    { key: 'category', label: 'Category', render: (r) => <Wrap>{r.category}</Wrap> },
    { key: 'centre', label: 'Centre', render: (r) => <Wrap min={88}>{r.centre}</Wrap> },
    { key: 'technology', label: 'Technology', render: (r) => <Wrap>{r.technology}</Wrap> },
    {
      key: 'documents',
      label: 'Documents verified',
      header: <span className="tw-block tw-min-w-[84px] tw-whitespace-normal">Documents verified</span>,
      render: (r) => (
        <span className={r.documents.verified < r.documents.uploaded ? 'tw-text-warn' : undefined}>
          {r.documents.verified} / {r.documents.uploaded}
        </span>
      ),
    },
    { key: 'stage', label: 'Stage and last step', sortKey: 'stageUpdatedAt', render: (r) => <Standing row={r} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="tw-relative tw-flex tw-flex-col tw-items-stretch tw-gap-1">
          <Link to={applicationPath(r.id)} state={state} className="btn xs">
            View
            <ForWhom>{r.name}</ForWhom>
          </Link>
          {r.canDecide ? (
            <>
              <button type="button" className="btn xs primary" onClick={() => onApprove(r)}>
                Approve
                <ForWhom>{r.name}</ForWhom>
              </button>
              <button type="button" className="btn xs danger" onClick={() => onReject(r)}>
                Reject
                <ForWhom>{r.name}</ForWhom>
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ServerTable
      rows={rows}
      rowKey={(r) => r.id}
      columns={columns}
      meta={meta}
      page={page}
      onPage={onPage}
      sort={sort}
      onSort={onSort}
      fetching={fetching}
      emptyText={emptyText}
    />
  );
}

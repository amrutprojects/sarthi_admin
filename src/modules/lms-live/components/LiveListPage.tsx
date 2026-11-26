import { useQuery } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Callout, PageHead } from '../../../components/ui';
import DataTable, { type Column, type SearchKey } from '../../../components/tables/DataTable';
import { ApiError } from '../../../services/api-client';
import type { LiveResult } from '../types/lmsLive.types';
import { DataSourceBadge } from './DataSource';

/* Why a live read failed, in words a Panel user can act on (codes from sarthi-api docs/lms-reads/README.md). */
const ERROR_TEXT: Record<string, string> = {
  LMS_TIMEOUT: 'The LMS did not answer in time.',
  LMS_UNREACHABLE: 'The LMS cannot be reached.',
  LMS_UNAVAILABLE: 'The LMS is temporarily unavailable.',
  LMS_RATE_LIMITED: 'The LMS is busy (too many requests).',
  LMS_KEY_REJECTED: 'The LMS refused Sarthi’s tenant key.',
  LMS_BAD_ANSWER: 'The LMS sent an answer the Panel cannot read.',
  LMS_NOT_CONFIGURED: 'The LMS link is not configured on the server.',
  LMS_NOT_FOUND: 'The LMS does not offer this data yet.',
  LMS_LIVE_DATA_OFF: 'Live LMS data has just been switched off. Reload the page.',
  LMS_READS_DISABLED: 'Live LMS reads are switched off on the server. Reload the page.',
};

/* The error state of a live screen: what failed and a retry. Never replaced by local data. */
export function LiveError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const code = error instanceof ApiError ? error.code : 'ERROR';
  const requestId = error instanceof ApiError ? error.details.find((d) => d.field === 'lmsRequestId')?.message : undefined;
  return (
    <div role="alert">
      <Callout tone="err" title="Live LMS data could not be loaded">
        <div>{ERROR_TEXT[code] ?? (error instanceof Error ? error.message : 'Request failed.')}</div>
        <div className="muted mt8" style={{ fontSize: 12 }}>
          Code {code}
          {requestId ? ` · LMS request ${requestId}` : ''}. No local data is shown while live data is switched on.
        </div>
        <button type="button" className="btn sm mt10" onClick={onRetry}>
          Retry
        </button>
      </Callout>
    </div>
  );
}

interface LiveListPageProps<R, T> {
  title: string;
  crumbs: { l: string; link?: string }[];
  sub?: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<LiveResult<R>>;
  rows: (data: R) => T[];
  columns: Column<T>[];
  search?: SearchKey<T>[];
  exportName: string;
  emptyMsg?: string;
  /* Controls above the table (e.g. a group-by select). */
  toolbar?: ReactNode;
  /* Extra line under the table (gaps of the live source). */
  note?: ReactNode;
}

/* A live LMS screen: the page title, the "Live from LMS" badge with the fetch time, and one table of one live answer. */
export function LiveListPage<R, T>(p: LiveListPageProps<R, T>) {
  const q = useQuery({ queryKey: p.queryKey, queryFn: p.queryFn, retry: false });
  useEffect(() => {
    document.title = `${p.title} — SARTHI Admin`;
  }, [p.title]);
  const total = q.data?.meta?.total;
  const rows = q.data ? p.rows(q.data.data) : [];
  return (
    <div className="page">
      <PageHead
        crumbs={p.crumbs}
        title={p.title}
        sub={p.sub}
        actions={q.isSuccess ? <DataSourceBadge source="live" fetchedAt={q.data.fetchedAt} /> : <DataSourceBadge source="live" />}
      />
      {p.toolbar}
      {q.isPending ? (
        <p className="muted" role="status">
          Loading live data from the LMS…
        </p>
      ) : q.isError ? (
        <LiveError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={p.columns}
            search={p.search}
            exportName={p.exportName}
            emptyMsg={p.emptyMsg ?? 'The LMS has no records yet.'}
          />
          {total !== undefined && total > rows.length ? (
            <p className="muted mt8" style={{ fontSize: 12 }}>
              Showing the first {rows.length} of {total} records from the LMS.
            </p>
          ) : null}
          {p.note ? (
            <p className="muted mt8" style={{ fontSize: 12 }}>
              {p.note}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

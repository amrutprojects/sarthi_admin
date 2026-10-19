import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EmptyState, fmt, useGo } from '../../../components/ui';
import type { ApiError, PageMeta } from '../../../services/http';
import { LoadState } from '../shared';

/* Query state of a CMS listing. Mirrors the list parameters the backend accepts. */
export interface MasterQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  /* '' = any, 'true' = active only, 'false' = inactive only. */
  status: '' | 'true' | 'false';
}

export const masterQuery = (sortBy: string, limit = 15): MasterQuery => ({
  page: 1,
  limit,
  search: '',
  sortBy,
  sortOrder: 'asc',
  status: '',
});

export interface MasterColumn<T> {
  /* Server sort field. Pass sortable: false for a presentation-only column. */
  k: string;
  l: string;
  w?: string;
  align?: 'right';
  sortable?: boolean;
  render: (row: T, srNo: number) => ReactNode;
}

interface MasterTableProps<T> {
  columns: MasterColumn<T>[];
  rows: T[];
  meta?: PageMeta;
  loading: boolean;
  error: ApiError | null;
  query: MasterQuery;
  /* Patch the query; page resets to 1 unless the patch sets it explicitly. */
  onQuery: (patch: Partial<MasterQuery>) => void;
  onRetry: () => void;
  searchLabel: string;
  emptyMsg: string;
  rowLink?: (row: T) => string;
}

const PAGE_SIZES = [10, 15, 25, 50, 100];

/*
 * Listing table for the CMS masters.
 *
 * Unlike the shared DataTable (which sorts and paginates an array already in the browser), this one
 * drives the backend: search, sort, status filter and paging are all request parameters. Master data
 * grows without a ceiling — a national taluka list runs into the thousands — so fetching every row to
 * page it client-side would eventually break. The markup and class names are DataTable's, so the two
 * look identical.
 */
export default function MasterTable<T extends { id: string }>({
  columns, rows, meta, loading, error, query, onQuery, onRetry, searchLabel, emptyMsg, rowLink,
}: MasterTableProps<T>) {
  const go = useGo();
  const [searchText, setSearchText] = useState(query.search);
  const typed = useRef(false);

  /* Debounced search: one request when typing settles, not one per keystroke. */
  useEffect(() => {
    if (!typed.current) return;
    const t = setTimeout(() => onQuery({ search: searchText.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  /* A reset from the page (Reset filters) has to show in the input too. */
  useEffect(() => {
    if (query.search === '') {
      typed.current = false;
      setSearchText('');
    }
  }, [query.search]);

  const toggleSort = (k: string) =>
    onQuery(query.sortBy === k ? { sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc' } : { sortBy: k, sortOrder: 'asc' });

  const total = meta?.total ?? 0;
  const pages = Math.max(1, meta?.totalPages ?? 1);
  const cur = Math.min(query.page, pages);
  const first = total ? (cur - 1) * query.limit + 1 : 0;

  let from = Math.max(1, cur - 2);
  const to = Math.min(pages, from + 4);
  from = Math.max(1, to - 4);
  const pageBtns: number[] = [];
  for (let p = from; p <= to; p++) pageBtns.push(p);

  return (
    <div>
      <div className="tbl-top">
        <div className="grow">
          <input
            className="inp sm"
            placeholder={'Search ' + searchLabel + '...'}
            value={searchText}
            onChange={(e) => { typed.current = true; setSearchText(e.target.value); }}
          />
        </div>
      </div>

      <LoadState loading={loading && !rows.length} error={error} onRetry={onRetry} />

      {error && !rows.length ? null : (
        <>
          <div className="tbl-wrap">
            <table className="tbl" aria-busy={loading}>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const sortable = c.sortable !== false;
                    const on = query.sortBy === c.k;
                    return (
                      <th
                        key={c.k}
                        className={(sortable ? 'sortable' : '') + (on ? ' on' : '')}
                        style={c.w ? { width: c.w } : undefined}
                        onClick={sortable ? () => toggleSort(c.k) : undefined}
                      >
                        {c.l}
                        {sortable ? <span className="arw">{on ? (query.sortOrder === 'asc' ? '▲' : '▼') : '⇅'}</span> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r, i) => {
                    const link = rowLink ? rowLink(r) : null;
                    return (
                      <tr key={r.id} className={link ? undefined : 'norow'} onClick={link ? () => go(link) : undefined}>
                        {columns.map((c) => (
                          <td key={c.k} className={c.align === 'right' ? 'num' : ''}>{c.render(r, first + i)}</td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr className="norow">
                    <td colSpan={columns.length}>
                      {loading ? <div className="skel" style={{ height: 14, margin: '10px 0' }} /> : <EmptyState title="No records found" msg={emptyMsg} />}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="tbl-bot">
            <div className="info">
              Showing <b>{first}-{Math.min(total, cur * query.limit)}</b> of <b>{fmt(total)}</b> records
            </div>
            <select
              className="inp sm"
              style={{ width: 'auto' }}
              aria-label="Rows per page"
              value={query.limit}
              onChange={(e) => onQuery({ limit: parseInt(e.target.value, 10) })}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <div className="pager">
              <button type="button" disabled={cur === 1} onClick={() => onQuery({ page: 1 })}>«</button>
              <button type="button" disabled={cur === 1} onClick={() => onQuery({ page: cur - 1 })}>‹</button>
              {pageBtns.map((p) => (
                <button type="button" key={p} className={p === cur ? 'on' : ''} onClick={() => onQuery({ page: p })}>{p}</button>
              ))}
              <button type="button" disabled={cur === pages} onClick={() => onQuery({ page: cur + 1 })}>›</button>
              <button type="button" disabled={cur === pages} onClick={() => onQuery({ page: pages })}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


import type { ReactNode } from 'react';
import type { PageMeta } from '../../services/api-client';

export interface ServerColumn<T> {
  key: string;
  label: string;
  /* Shown in the header instead of the label, e.g. a checkbox that selects the page. */
  header?: ReactNode;
  render: (row: T) => ReactNode;
  /* Backend sortBy value; when set, the header toggles server-side sorting. */
  sortKey?: string;
}

export interface ServerSort {
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

interface Props<T> {
  rows: T[];
  rowKey: (row: T) => string;
  columns: ServerColumn<T>[];
  meta?: PageMeta;
  page: number;
  onPage: (page: number) => void;
  sort?: ServerSort;
  onSort?: (sort: ServerSort) => void;
  fetching?: boolean;
  emptyText?: string;
}

/*
 * Server-paged table: the backend does paging, search, filtering and sorting; this only renders the current page,
 * the sortable headers and the pager. Shared by every list that is paged on the server.
 */
export default function ServerTable<T>({
  rows,
  rowKey,
  columns,
  meta,
  page,
  onPage,
  sort,
  onSort,
  fetching,
  emptyText = 'No records found',
}: Props<T>) {
  const pages = Math.max(meta?.totalPages ?? 1, 1);
  const toggle = (key: string) => onSort?.({ sortBy: key, sortOrder: sort?.sortBy === key && sort.sortOrder === 'ASC' ? 'DESC' : 'ASC' });

  return (
    <div className="dt">
      <div className="tbl-wrap">
        <table className="tbl" aria-busy={fetching}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort && c.sortKey && sort.sortBy === c.sortKey ? (sort.sortOrder === 'ASC' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {c.header ? (
                    c.header
                  ) : c.sortKey && onSort ? (
                    <button
                      type="button"
                      className="tw-cursor-pointer tw-border-0 tw-bg-transparent tw-p-0 tw-text-inherit"
                      style={{ font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }}
                      onClick={() => toggle(c.sortKey as string)}
                    >
                      {c.label}
                      {sort?.sortBy === c.sortKey ? (sort.sortOrder === 'ASC' ? ' ▲' : ' ▼') : ''}
                    </button>
                  ) : c.label ? (
                    c.label
                  ) : (
                    <span className="tw-sr-only">Actions</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={fetching ? 'tw-opacity-60' : undefined}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="tw-py-6 tw-text-center tw-text-ink-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={rowKey(r)}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render(r)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {meta && meta.total > 0 ? (
        <div className="tbl-bot">
          <div className="info">
            Showing{' '}
            <b>
              {(page - 1) * meta.limit + 1}–{Math.min(meta.total, page * meta.limit)}
            </b>{' '}
            of <b>{meta.total}</b>
          </div>
          <div className="pager" role="navigation" aria-label="Pagination">
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
              ‹
            </button>
            <button type="button" className="on" aria-current="page">
              {page} / {pages}
            </button>
            <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

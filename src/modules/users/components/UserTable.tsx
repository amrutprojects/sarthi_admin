import type { ReactNode } from 'react';
import { Badge, GenBadge } from '../../../components/ui';
import Avatar from '../../../components/ui/Avatar';
import type { PageMeta } from '../../../services/api-client';
import type { User } from '../types/user.types';

export interface UserTableProps {
  users: User[];
  meta?: PageMeta;
  page: number;
  onPage: (page: number) => void;
  currentUserId?: string;
  showRoles: boolean;
  /* Row actions, rendered by the container (which knows the permissions). */
  renderActions: (user: User) => ReactNode;
  /* Status cell (the container renders the toggle); defaults to a badge. */
  renderStatus?: (user: User) => ReactNode;
  fetching?: boolean;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/* Server-paged user table. Purely presentational: data and actions come from props. */
export default function UserTable({
  users,
  meta,
  page,
  onPage,
  currentUserId,
  showRoles,
  renderActions,
  renderStatus,
  fetching,
}: UserTableProps) {
  const pages = meta?.totalPages ?? 1;
  return (
    <div className="dt">
      <div className="tbl-wrap">
        <table className="tbl" aria-busy={fetching}>
          <thead>
            <tr>
              <th scope="col">User</th>
              {showRoles ? <th scope="col">Roles</th> : null}
              <th scope="col">Status</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">
                <span className="tw-sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className={fetching ? 'tw-opacity-60' : undefined}>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <Avatar name={u.name} />
                    <div className="tw-min-w-0">
                      <b>{u.name}</b> {u.id === currentUserId ? <Badge tone="saffron">You</Badge> : null}
                      <div className="tw-truncate tw-text-xs tw-text-ink-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                {showRoles ? (
                  <td>
                    {u.roles?.length ? (
                      <div className="tw-flex tw-flex-wrap tw-gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.id} tone="blue">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="tw-text-ink-muted">No role</span>
                    )}
                  </td>
                ) : null}
                <td>{renderStatus ? renderStatus(u) : <GenBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />}</td>
                <td className="tw-whitespace-nowrap">{fmt(u.lastLoginAt)}</td>
                <td>{renderActions(u)}</td>
              </tr>
            ))}
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

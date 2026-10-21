import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, GenBadge, PageHead } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { ApiError } from '../../../services/api-client';
import { useAuth } from '../../auth';
import { registrationApi, type RegistrationListParams } from '../services/registrationApi';

const PAGE_SIZE = 20;

/* Student Registration menu: server-paged list of registrations, with the registration form at the top right. */
export default function RegistrationsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    document.title = 'Student registration — AMRUT × SUMAGO Admin';
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) {
        setSearch(searchInput.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const params: RegistrationListParams = { page, limit: PAGE_SIZE, search: search || undefined, sortBy: 'createdAt', sortOrder: 'DESC' };
  const list = useQuery({
    queryKey: ['registrations', 'list', params],
    queryFn: ({ signal }) => registrationApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
  const forbidden = list.error instanceof ApiError && list.error.status === 403;
  const pages = list.data?.meta.totalPages ?? 1;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student Registration' }]}
        title="Student Registration"
        badge={<Badge tone="green">Live</Badge>}
        sub="Registrations from the website and entered here. Mobile and email are shown in full to reviewers; every such view is recorded in the audit log."
        actions={
          permissions.has('registrations.create') ? (
            <Link className="btn primary" to="/student-registrations/new">
              <Icon name="plus" />
              Registration form
            </Link>
          ) : undefined
        }
      />
      <div className="card">
        <div className="card-h">
          <h3>Registrations</h3>
          <input
            type="search"
            className="inp sm"
            style={{ width: 260, maxWidth: '100%' }}
            placeholder="Search code, name, email or last 4 of mobile"
            aria-label="Search registrations"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {forbidden ? (
          <div className="card-b">
            <Callout tone="warn" title="Not permitted. ">
              You do not have permission to view registrations.
            </Callout>
          </div>
        ) : list.isError ? (
          <div className="card-b">
            <Callout tone="err" title="Could not load registrations. ">
              {list.error instanceof ApiError ? list.error.fullMessage : 'Unexpected error'}{' '}
              <button type="button" className="btn xs" onClick={() => void list.refetch()}>
                Retry
              </button>
            </Callout>
          </div>
        ) : list.isPending ? (
          <div className="card-b" aria-busy="true" aria-label="Loading registrations">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel tw-mb-3" style={{ height: 16 }} />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <div className="card-b tw-py-10 tw-text-center tw-text-ink-muted">
            {search ? 'No registrations match this search.' : 'No registrations yet.'}
          </div>
        ) : (
          <div className="dt">
            <div className="tbl-wrap">
              <table className="tbl" aria-busy={list.isFetching}>
                <thead>
                  <tr>
                    <th scope="col">Registration</th>
                    <th scope="col">Name</th>
                    <th scope="col">Course centre</th>
                    <th scope="col">Technology</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Status</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">
                      <span className="tw-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={list.isFetching ? 'tw-opacity-60' : undefined}>
                  {list.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>
                        <Link to={`/student-registrations/${r.id}`} className="tw-font-bold hover:tw-underline">
                          {r.name}
                        </Link>
                        <div className="tw-text-xs tw-text-ink-muted">{r.unmasked?.email ?? r.email}</div>
                      </td>
                      <td>{r.centreName ?? r.centreCode ?? '—'}</td>
                      <td>{r.trackName ?? 'To be confirmed'}</td>
                      <td className="mono">{r.unmasked?.mobile ?? r.mobile ?? '—'}</td>
                      <td>
                        <GenBadge status={r.status} />
                      </td>
                      <td className="tw-whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                      <td>
                        <button type="button" className="btn xs" onClick={() => navigate(`/student-registrations/${r.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tbl-bot">
              <div className="info">
                Showing{' '}
                <b>
                  {(page - 1) * list.data.meta.limit + 1}–{Math.min(list.data.meta.total, page * list.data.meta.limit)}
                </b>{' '}
                of <b>{list.data.meta.total}</b>
              </div>
              <div className="pager" role="navigation" aria-label="Pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                  ‹
                </button>
                <button type="button" className="on" aria-current="page">
                  {page} / {pages}
                </button>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

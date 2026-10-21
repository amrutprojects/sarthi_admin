import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal, fmtDateTime, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, PageHead } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import StatusToggle from '../../../components/ui/StatusToggle';
import { ApiError } from '../../../services/api-client';
import { useAuth } from '../../auth';
import { registrationApi, type Registration, type RegistrationListParams } from '../services/registrationApi';

const PAGE_SIZE = 20;
type SourceFilter = 'all' | 'IMPORT' | 'PUBLIC_REGISTRATION';
const SOURCE_LABEL: Record<Registration['source'], string> = { IMPORT: 'Import', PUBLIC_REGISTRATION: 'Registration' };

/*
 * Student Registration menu: imported students and registrations from the one students table, server-paged, with a
 * Source filter, an active/inactive toggle, Edit and Delete per row, and the registration form at the top right.
 */
export default function RegistrationsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canUpdate = permissions.has('registrations.update');
  const canDelete = permissions.has('registrations.delete');
  const [source, setSource] = useState<SourceFilter>('all');
  const [deleting, setDeleting] = useState<Registration | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['registrations'] });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => registrationApi.setStatus(id, isActive),
    onSuccess: (_d, v) => {
      toastOk(v.isActive ? 'Student activated' : 'Student deactivated');
      void refresh();
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => registrationApi.remove(id),
    onSuccess: () => {
      toastOk('Student deleted');
      setDeleting(null);
      void refresh();
    },
    onError: toastError,
  });
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

  const params: RegistrationListParams = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    source: source === 'all' ? undefined : source,
  };
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
        sub="Imported students and registrations, from one students table. Mobile and email are shown in full to reviewers; every such view is recorded in the audit log."
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
          <h3>Students</h3>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
            <select
              className="inp sm"
              style={{ width: 170 }}
              aria-label="Filter by source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value as SourceFilter);
                setPage(1);
              }}
            >
              <option value="all">All sources</option>
              <option value="IMPORT">Import</option>
              <option value="PUBLIC_REGISTRATION">Registration</option>
            </select>
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
                    <th scope="col">Code</th>
                    <th scope="col">Source</th>
                    <th scope="col">Name</th>
                    <th scope="col">Course centre</th>
                    <th scope="col">Technology</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Active</th>
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
                        <Badge tone={r.source === 'IMPORT' ? 'blue' : 'saffron'}>{SOURCE_LABEL[r.source]}</Badge>
                      </td>
                      <td>
                        <Link to={`/student-registrations/${r.id}`} className="tw-font-bold hover:tw-underline">
                          {r.name}
                        </Link>
                        <div className="tw-text-xs tw-text-ink-muted">{r.unmasked?.email ?? r.email}</div>
                      </td>
                      <td>{r.centreName ?? r.centreCode ?? '—'}</td>
                      <td>{r.trackName ?? 'To be confirmed'}</td>
                      <td className="mono">{r.unmasked?.mobile ?? r.mobile ?? '—'}</td>
                      <td className="tw-whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                      <td>
                        <StatusToggle
                          active={r.isActive}
                          label={`Status of ${r.name}`}
                          busy={setActive.isPending && setActive.variables?.id === r.id}
                          onChange={canUpdate ? (isActive) => setActive.mutate({ id: r.id, isActive }) : undefined}
                        />
                      </td>
                      <td>
                        <div className="tw-flex tw-flex-wrap tw-gap-1">
                          <button type="button" className="btn xs" onClick={() => navigate(`/student-registrations/${r.id}`)}>
                            View
                          </button>
                          {canUpdate ? (
                            <button type="button" className="btn xs" onClick={() => navigate(`/student-registrations/${r.id}/edit`)}>
                              Edit
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button type="button" className="btn xs tw-text-danger" onClick={() => setDeleting(r)}>
                              Delete
                            </button>
                          ) : null}
                        </div>
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
      {deleting ? (
        <ConfirmModal
          title="Delete student"
          danger
          busy={remove.isPending}
          confirmLabel="Delete"
          message={`Delete ${deleting.name} (${deleting.code})? The record is soft-deleted: it disappears from lists but is kept, with its documents, for history and audit.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id)}
        />
      ) : null}
    </div>
  );
}

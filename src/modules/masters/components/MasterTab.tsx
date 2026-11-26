import StatusToggle from '../../../components/ui/StatusToggle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal, fmtDateTime, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, GenBadge, KvList } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import { ApiError, needsNewIdempotencyKey, newIdempotencyKey } from '../../../services/api-client';
import { useAuth } from '../../auth';
import { masterPermission, type MasterAction, type MasterConfig } from '../config';
import { useCreateMaster, useDeleteMaster, useMasterList, useSetMasterStatus, useUpdateMaster } from '../hooks/useMasters';
import type { MasterFormValues } from '../schemas/masterSchema';
import type { MasterListParams, MasterRecord, MasterSortField } from '../types';
import MasterForm from './MasterForm';

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; row: MasterRecord }
  | { type: 'view'; row: MasterRecord }
  | { type: 'delete'; row: MasterRecord };
type Status = 'all' | 'active' | 'inactive';
const PAGE_SIZE = 20;
const FORM_FIELDS = ['code', 'name', 'description', 'isMandatory', 'nameEn', 'displayOrder'] as const;

/* Field errors from a 422 / 409 response, mapped onto the form. */
function serverFieldErrors(err: unknown): Partial<Record<keyof MasterFormValues, string>> {
  if (!(err instanceof ApiError)) return {};
  if (err.status === 409) {
    if (/ code /i.test(err.message)) return { code: err.message };
    if (/ name /i.test(err.message)) return { name: err.message };
    return {};
  }
  const out: Partial<Record<keyof MasterFormValues, string>> = {};
  for (const d of err.details) {
    const f = d.field?.replace(/^body\./, '');
    if (f && (FORM_FIELDS as readonly string[]).includes(f)) out[f as keyof MasterFormValues] = d.message;
  }
  return out;
}

const toInput = (v: MasterFormValues, m: MasterConfig) => ({
  code: v.code,
  name: v.name,
  description: v.description || null,
  ...(m.hasMandatory ? { isMandatory: v.isMandatory } : {}),
  ...(m.hasEnglishName ? { nameEn: v.nameEn || null } : {}),
  /* Left out when blank: the backend appends a new record at the end, and an edit keeps the current place. */
  ...(m.ordered && v.displayOrder !== null ? { displayOrder: v.displayOrder } : {}),
});

/*
 * One master's screen: server-paged list with search, status filter and sorting; view, create, edit, activate /
 * deactivate and soft delete. Buttons follow the signed-in user's permissions (the backend enforces them again).
 */
export default function MasterTab({ master }: { master: MasterConfig }) {
  const { permissions } = useAuth();
  const can = (a: MasterAction) => permissions.has(masterPermission(master, a));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  /* An ordered master (castes) opens in its official sequence. */
  const [sort, setSort] = useState<{ by: MasterSortField; order: 'ASC' | 'DESC' }>({
    by: master.ordered ? 'displayOrder' : 'name',
    order: 'ASC',
  });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const plural = master.plural.toLowerCase();

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) {
        setSearch(searchInput.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const params: MasterListParams = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: status === 'all' ? undefined : status === 'active',
    sortBy: sort.by,
    sortOrder: sort.order,
  };
  const list = useMasterList(master, params);
  const setActive = useSetMasterStatus(master);
  const remove = useDeleteMaster(master);
  const forbidden = list.error instanceof ApiError && list.error.status === 403;

  const toggleSort = useCallback(
    (by: MasterSortField) => {
      setSort((s) => ({ by, order: s.by === by && s.order === 'ASC' ? 'DESC' : 'ASC' }));
      setPage(1);
    },
    [setSort],
  );
  const sortMark = (by: MasterSortField) => (sort.by === by ? (sort.order === 'ASC' ? ' ▲' : ' ▼') : '');
  const ariaSort = (by: MasterSortField) => (sort.by === by ? (sort.order === 'ASC' ? 'ascending' : 'descending') : 'none');
  const pages = list.data?.meta.totalPages ?? 1;

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>{master.plural}</h3>
          {/* One row on wider screens (inline widths: .inp sets width: 100%, which outranks the utilities). */}
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
            <input
              type="search"
              className="inp sm"
              style={{ width: 240, maxWidth: '100%' }}
              placeholder="Search code or name"
              aria-label={`Search ${plural}`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select
              className="inp sm"
              style={{ width: 150 }}
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Status);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {can('create') ? (
              <button type="button" className="btn sm primary tw-whitespace-nowrap" onClick={() => setDialog({ type: 'create' })}>
                <Icon name="plus" />
                Add {master.label.toLowerCase()}
              </button>
            ) : null}
          </div>
        </div>

        {forbidden ? (
          <div className="card-b">
            <Callout tone="warn" title="Not permitted. ">
              You do not have permission to view {plural}.
            </Callout>
          </div>
        ) : list.isError ? (
          <div className="card-b">
            <Callout tone="err" title={`Could not load ${plural}. `}>
              {list.error instanceof ApiError ? list.error.fullMessage : 'Unexpected error'}{' '}
              <button type="button" className="btn xs" onClick={() => void list.refetch()}>
                Retry
              </button>
            </Callout>
          </div>
        ) : list.isPending ? (
          <div className="card-b" aria-busy="true" aria-label={`Loading ${plural}`}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel tw-mb-3" style={{ height: 16 }} />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <div className="card-b tw-py-10 tw-text-center tw-text-ink-muted">
            {search || status !== 'all' ? `No ${plural} match these filters.` : `No ${plural} yet.`}
          </div>
        ) : (
          <div className="dt">
            <div className="tbl-wrap">
              <table className="tbl" aria-busy={list.isFetching}>
                <thead>
                  <tr>
                    {master.ordered ? (
                      <th scope="col" aria-sort={ariaSort('displayOrder')}>
                        <button
                          type="button"
                          className="tw-bg-transparent tw-p-0 tw-font-semibold"
                          onClick={() => toggleSort('displayOrder')}
                        >
                          No.{sortMark('displayOrder')}
                        </button>
                      </th>
                    ) : null}
                    <th scope="col" aria-sort={ariaSort('code')}>
                      <button type="button" className="tw-bg-transparent tw-p-0 tw-font-semibold" onClick={() => toggleSort('code')}>
                        Code{sortMark('code')}
                      </button>
                    </th>
                    <th scope="col" aria-sort={ariaSort('name')}>
                      <button type="button" className="tw-bg-transparent tw-p-0 tw-font-semibold" onClick={() => toggleSort('name')}>
                        Name{sortMark('name')}
                      </button>
                    </th>
                    {master.hasMandatory ? <th scope="col">Mandatory</th> : null}
                    <th scope="col">Status</th>
                    <th scope="col" aria-sort={ariaSort('updatedAt')}>
                      <button type="button" className="tw-bg-transparent tw-p-0 tw-font-semibold" onClick={() => toggleSort('updatedAt')}>
                        Updated{sortMark('updatedAt')}
                      </button>
                    </th>
                    <th scope="col">
                      <span className="tw-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={list.isFetching ? 'tw-opacity-60' : undefined}>
                  {list.data.items.map((r) => (
                    <tr key={r.id}>
                      {master.ordered ? <td className="mono">{r.displayOrder ?? '—'}</td> : null}
                      <td className="mono">{r.code}</td>
                      <td>
                        <b>{r.name}</b>
                        {master.hasEnglishName && r.nameEn ? <div className="tw-text-xs tw-text-ink-2">{r.nameEn}</div> : null}
                        {r.description ? <div className="tw-truncate tw-text-xs tw-text-ink-muted">{r.description}</div> : null}
                      </td>
                      {master.hasMandatory ? <td>{r.isMandatory ? <Badge tone="saffron">Mandatory</Badge> : 'Optional'}</td> : null}
                      <td>
                        <StatusToggle
                          active={r.isActive}
                          label={`Status of ${r.name}`}
                          busy={setActive.isPending && setActive.variables?.id === r.id}
                          onChange={
                            can('status')
                              ? (isActive) =>
                                  setActive.mutate(
                                    { id: r.id, isActive },
                                    {
                                      onSuccess: () => toastOk(`${master.label} ${isActive ? 'activated' : 'deactivated'}`),
                                      onError: toastError,
                                    },
                                  )
                              : undefined
                          }
                        />
                      </td>
                      <td className="tw-whitespace-nowrap">{fmtDateTime(r.updatedAt)}</td>
                      <td>
                        <div className="tw-flex tw-flex-wrap tw-gap-1">
                          <button type="button" className="btn xs" onClick={() => setDialog({ type: 'view', row: r })}>
                            View
                          </button>
                          {can('update') ? (
                            <button type="button" className="btn xs" onClick={() => setDialog({ type: 'edit', row: r })}>
                              Edit
                            </button>
                          ) : null}
                          {can('delete') ? (
                            <button type="button" className="btn xs tw-text-danger" onClick={() => setDialog({ type: 'delete', row: r })}>
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

      {dialog?.type === 'create' ? <CreateDialog master={master} onClose={close} /> : null}
      {dialog?.type === 'edit' ? <EditDialog master={master} row={dialog.row} onClose={close} /> : null}
      {dialog?.type === 'view' ? (
        <Drawer title={`${master.label} — ${dialog.row.name}`} onClose={close}>
          <KvList
            pairs={[
              ['Code', <span className="mono">{dialog.row.code}</span>],
              [master.hasEnglishName ? 'Name (Marathi)' : 'Name', dialog.row.name],
              ...(master.hasEnglishName ? [['English name', dialog.row.nameEn || '—'] as [string, string]] : []),
              ...(master.ordered ? [['Display order', String(dialog.row.displayOrder ?? '—')] as [string, string]] : []),
              ['Description', dialog.row.description || '—'],
              ...(master.hasMandatory ? [['Mandatory', dialog.row.isMandatory ? 'Yes' : 'No'] as [string, string]] : []),
              ['Status', <GenBadge status={dialog.row.isActive ? 'ACTIVE' : 'INACTIVE'} />],
              ['Created', fmtDateTime(dialog.row.createdAt)],
              ['Updated', fmtDateTime(dialog.row.updatedAt)],
            ]}
          />
        </Drawer>
      ) : null}
      {dialog?.type === 'delete' ? (
        <ConfirmModal
          title={`Delete ${master.label.toLowerCase()}`}
          danger
          busy={remove.isPending}
          confirmLabel="Delete"
          dependencies={{ kind: master.key === 'documentType' ? 'document-type' : master.key, id: dialog.row.id }}
          message={`Delete ${dialog.row.name} (${dialog.row.code})? It is soft-deleted and kept for history; its code and name cannot be reused. Records in use by students cannot be deleted.`}
          onClose={close}
          onConfirm={() =>
            remove.mutate(dialog.row.id, {
              onSuccess: () => {
                toastOk(`${master.label} deleted`);
                close();
              },
              onError: toastError,
            })
          }
        />
      ) : null}
    </>
  );
}

function CreateDialog({ master, onClose }: { master: MasterConfig; onClose: () => void }) {
  const create = useCreateMaster(master);
  /* One key per dialog: a retry of the same submission is replayed, not duplicated. */
  const key = useRef(newIdempotencyKey());
  const serverErrors = useMemo(() => serverFieldErrors(create.error), [create.error]);
  return (
    <Modal title={`Add ${master.label.toLowerCase()}`} onClose={onClose}>
      <MasterForm
        master={master}
        mode="create"
        submitting={create.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) =>
          create.mutate(
            { input: toInput(v, master), idempotencyKey: key.current },
            {
              onSuccess: () => {
                toastOk(`${master.label} created`);
                onClose();
              },
              onError: (e) => {
                /* A refused create is stored under its key: the corrected form needs a new one. */
                if (needsNewIdempotencyKey(e)) key.current = newIdempotencyKey();
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          )
        }
      />
    </Modal>
  );
}

function EditDialog({ master, row, onClose }: { master: MasterConfig; row: MasterRecord; onClose: () => void }) {
  const update = useUpdateMaster(master);
  const serverErrors = useMemo(() => serverFieldErrors(update.error), [update.error]);
  return (
    <Modal title={`Edit ${row.name}`} onClose={onClose}>
      <MasterForm
        master={master}
        mode="edit"
        defaultValues={{
          code: row.code,
          name: row.name,
          description: row.description ?? '',
          isMandatory: !!row.isMandatory,
          nameEn: row.nameEn ?? '',
          displayOrder: row.displayOrder === undefined ? '' : String(row.displayOrder),
        }}
        submitting={update.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) =>
          update.mutate(
            { id: row.id, input: toInput(v, master) },
            {
              onSuccess: () => {
                toastOk(`${master.label} updated`);
                onClose();
              },
              onError: (e) => {
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          )
        }
      />
    </Modal>
  );
}

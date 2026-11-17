import { useMemo, useState, type ReactNode } from 'react';
import Icon from '../../../../components/ui/Icon';
import { useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { itemName } from '../constants';
import type { Bilingual } from '../types/livedashboard.types';

interface Item {
  id: string;
  label: Bilingual;
  value: string;
  displayOrder: number;
  isActive: boolean;
  updatedAt: string;
}

/*
 * One ordered list of the Live Dashboard — the KPI cards, or the side figures — as a card of the tab: a listing like
 * FAQ Management's (search, sorting, paging in the browser), each row viewed, edited, switched on or off and deleted
 * on its own, and moved up or down while the table shows the website order, with its Add button in the card head.
 *
 * Every action names its row by id, never by its position on screen, so a list that has moved on since it was
 * loaded can never delete, hide or reorder the wrong row.
 */
export default function OrderedItemsCard<T extends Item>({
  title,
  noun,
  api,
  addLabel,
  createPath,
  viewPath,
  editPath,
  columns: own,
  searchText,
  searchLabel,
  emptyMsg,
}: {
  title: string;
  /* 'KPI card' or 'figure', as the confirmations and toasts name a row. */
  noun: string;
  api: {
    list: () => Promise<T[]>;
    setStatus: (id: string, isActive: boolean) => Promise<unknown>;
    remove: (id: string) => Promise<void>;
    reorder: (ids: string[]) => Promise<unknown>;
  };
  addLabel: string;
  createPath: string;
  viewPath: (id: string) => string;
  editPath: (id: string) => string;
  /* The kind's own columns, between the label and the status. */
  columns: MasterColumn<T>[];
  searchText: (row: T) => string;
  searchLabel: string;
  emptyMsg: string;
}) {
  const go = useGo();
  const can = useCan();
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const items = useApiData(() => api.list(), []);
  /* Display order first, so the table reads the way the website shows the rows. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<T | null>(null);
  const [toggling, setToggling] = useState<T | null>(null);

  const all = useMemo(() => items.data ?? [], [items.data]);
  const list: ClientListOptions<T> = {
    searchText,
    sortValue: {
      displayOrder: (r) => r.displayOrder,
      label: (r) => r.label.en,
      value: (r) => r.value,
      /* Active first on ascending. */
      isActive: (r) => (r.isActive ? 0 : 1),
      updatedAt: (r) => r.updatedAt,
    },
    isActive: (r) => r.isActive,
  };
  const { rows, meta } = clientPage(all, query, list);
  const filtered = query.search !== '' || query.status !== '';

  /*
   * Moving a row swaps it with its neighbour in the website order, so the buttons only work while the table shows
   * exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the whole list is sent.
   */
  const canReorder = can('updateLiveDashboard') && all.length > 1;
  const inSiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && !filtered;

  const move = (id: string, by: -1 | 1) => {
    const ids = all.map((r) => r.id);
    const from = ids.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => api.reorder(ids),
      'Display order updated',
      () => items.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void items.reload();
    });
  };

  const columns: MasterColumn<T>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (r) => {
        const at = all.findIndex((x) => x.id === r.id);
        const off = busy || !inSiteOrder;
        const why = inSiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {r.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${r.label.en} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(r.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${r.label.en} down`}
                  disabled={off || at < 0 || at === all.length - 1}
                  onClick={() => move(r.id, 1)}
                >
                  ↓
                </button>
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      k: 'label',
      l: 'Label',
      render: (r) => (
        <div style={{ whiteSpace: 'normal', minWidth: 150, maxWidth: 260 }}>
          <b className="lnk" lang="en">
            {r.label.en}
          </b>
          <div className="muted fs12" lang="mr">
            {r.label.mr}
          </div>
        </div>
      ),
    },
    {
      k: 'value',
      l: 'Value',
      render: (r) => <b style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--brand-600)', whiteSpace: 'nowrap' }}>{r.value}</b>,
    },
    ...own,
    { k: 'isActive', l: 'Status', render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.label.en}`} onClick={() => go(viewPath(r.id))}>
            <Icon name="eye" />
          </button>
          <Can action="updateLiveDashboard">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.label.en}`} onClick={() => go(editPath(r.id))}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateLiveDashboard">
            <StatusToggle compact isActive={r.isActive} name={r.label.en} canChange disabled={busy} onToggle={() => setToggling(r)} />
          </Can>
          <Can action="deleteLiveDashboardItem">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${r.label.en}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(r)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  let head: ReactNode = null;
  if (items.data) {
    head = (
      <span className="tag">
        {all.length} listed, {all.filter((r) => r.isActive).length} shown on the website
      </span>
    );
  }

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          {title} <span className="sub">live from the backend</span>
        </h3>
        <div className="f ac gp8 wrap">
          {canReorder && !inSiteOrder ? <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span> : null}
          {filtered ? <span className="tag">filtered</span> : null}
          {head}
          <Can action="createLiveDashboardItem">
            <button type="button" className="btn primary sm" onClick={() => go(createPath)}>
              <Icon name="plus" />
              {addLabel}
            </button>
          </Can>
        </div>
      </div>
      <MasterTable
        columns={columns}
        rows={rows}
        meta={items.data ? meta : undefined}
        loading={items.loading}
        error={items.error}
        query={query}
        onQuery={patch}
        onRetry={() => void items.reload()}
        searchLabel={searchLabel}
        emptyMsg={filtered ? `No ${noun} matches the current search.` : emptyMsg}
        rowLink={can('viewLiveDashboard') ? (r) => viewPath(r.id) : undefined}
      />

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? `Deactivate ${noun}` : `Activate ${noun}`}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            toggling.isActive
              ? `Deactivate ${itemName(toggling)}? It is hidden from the website but stays in this list and can be activated again.`
              : `Activate ${itemName(toggling)} and show it on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const r = toggling;
            void run(
              () => api.setStatus(r.id, !r.isActive),
              `${Noun} ${r.isActive ? 'deactivated' : 'activated'}`,
              async () => {
                setToggling(null);
                await items.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title={`Delete ${noun}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${itemName(deleting)}? It is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const r = deleting;
            void run(
              () => api.remove(r.id),
              `${Noun} deleted`,
              async () => {
                setDeleting(null);
                await items.reload();
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

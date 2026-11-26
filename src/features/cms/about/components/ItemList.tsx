import { useMemo, useState, type ReactNode } from 'react';
import Icon from '../../../../components/ui/Icon';
import { useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, fmtDateTime, useAction } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { KINDS, aboutEditPath, aboutViewPath, itemLabel } from '../constants';
import { aboutService } from '../services/aboutService';
import type { AboutItem, AboutKind, Bilingual } from '../types/about.types';

/* How each table is headed and searched. Facts show their value as an extra column; cards only their title. */
const TABLE: Record<AboutKind, { title: string; searchLabel: string; empty: string }> = {
  facts: {
    title: 'Label',
    searchLabel: 'label or value',
    empty: 'No information rows yet: the website shows none until one is added. Use Add New Information Row to create the first one.',
  },
  cards: {
    title: 'Title',
    searchLabel: 'title or description',
    empty: 'No About cards yet: the website shows none until one is added. Use Add New About Card to create the first one.',
  },
};

/* Search, sorting and paging in the browser: the API returns every row and card at once (clientList.ts). */
const LIST: ClientListOptions<AboutItem> = {
  searchText: (i) => [i.first.en, i.first.mr, i.second.en, i.second.mr].join(' '),
  sortValue: {
    displayOrder: (i) => i.displayOrder,
    firstEn: (i) => i.first.en,
    secondEn: (i) => i.second.en,
    /* Active first on ascending. */
    isActive: (i) => (i.isActive ? 0 : 1),
    updatedAt: (i) => i.updatedAt,
  },
  isActive: (i) => i.isActive,
};

/* English in the brand colour with Marathi underneath, like the FAQ question. Long text wraps (cells do not by default). */
const Title = ({ value }: { value: Bilingual }) => (
  <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 320 }}>
    <b className="lnk" lang="en">
      {value.en}
    </b>
    <div className="muted fs12" lang="mr">
      {value.mr}
    </div>
  </div>
);

/* A fact's value: English, Marathi underneath. */
const Value = ({ value }: { value: Bilingual }) => (
  <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 360 }}>
    <div lang="en">{value.en}</div>
    <div className="muted fs12" lang="mr">
      {value.mr}
    </div>
  </div>
);

/*
 * The information rows or the cards as a listing like FAQ Management's: search, sorting and paging, each record
 * viewed, edited, switched on or off and deleted on its own, and moved up or down while the table shows the
 * website order. Every action names its record by id, never by its position on screen. Required cards (Mission,
 * Vision, Values) offer no status switch or delete: the server refuses both.
 */
export default function ItemList({
  kind,
  heading,
  items,
  loading,
  onChanged,
}: {
  kind: AboutKind;
  heading: ReactNode;
  /* The whole list, in the server's display order. */
  items: AboutItem[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const k = KINDS[kind];
  const t = TABLE[kind];
  const go = useGo();
  const can = useCan();
  /* Display order first, so the table reads the way the website shows the records. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<AboutItem | null>(null);
  const [toggling, setToggling] = useState<AboutItem | null>(null);

  const { rows, meta } = useMemo(() => clientPage(items, query, LIST), [items, query]);
  const filtered = query.search !== '' || query.status !== '';

  /*
   * Moving a record swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour may be
   * on the next page, and the whole list is sent.
   */
  const canReorder = can('updateAbout') && items.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && !filtered;

  const move = (i: AboutItem, by: -1 | 1) => {
    const ids = items.map((x) => x.id);
    const from = ids.indexOf(i.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(() => aboutService.reorder(kind, ids), 'Display order updated', onChanged).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void onChanged();
    });
  };

  const columns: MasterColumn<AboutItem>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_i, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (i) => {
        const at = items.findIndex((x) => x.id === i.id);
        const off = busy || !inWebsiteOrder;
        const why = inWebsiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {i.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${i.first.en} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${i.first.en} down`}
                  disabled={off || at < 0 || at === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </span>
            ) : null}
          </div>
        );
      },
    },
    { k: 'firstEn', l: t.title, render: (i) => <Title value={i.first} /> },
    ...(kind === 'facts' ? [{ k: 'secondEn', l: 'Value', render: (i: AboutItem) => <Value value={i.second} /> }] : []),
    {
      k: 'isActive',
      l: 'Status',
      render: (i) => (
        <div className="f ac gp4 wrap">
          <MasterStatusBadge isActive={i.isActive} />
          {i.isRequired ? (
            <span className="tag" title="Can be edited and reordered, not deactivated or deleted">
              Required
            </span>
          ) : null}
        </div>
      ),
    },
    { k: 'updatedAt', l: 'Updated', render: (i) => <span className="fs12">{fmtDateTime(i.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (i) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn xs"
            title="View"
            aria-label={`View ${i.first.en}`}
            onClick={() => go(aboutViewPath(kind, i.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateAbout">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${i.first.en}`}
              onClick={() => go(aboutEditPath(kind, i.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateAbout">
            <StatusToggle
              compact
              isActive={i.isActive}
              name={i.first.en}
              canChange={!i.isRequired}
              disabled={busy}
              onToggle={() => setToggling(i)}
            />
          </Can>
          {!i.isRequired ? (
            <Can action="deleteAboutItem">
              <button
                type="button"
                className="btn xs"
                title="Delete"
                aria-label={`Delete ${i.first.en}`}
                style={{ color: 'var(--red)' }}
                disabled={busy}
                onClick={() => setDeleting(i)}
              >
                <Icon name="trash" />
              </button>
            </Can>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="card mb14">
        <div className="card-h">
          <h3>
            {heading} <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            <span className="tag">
              {items.length} listed, {items.filter((i) => i.isActive).length} shown on the website
            </span>
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          /* A failed (re)load is reported once, above the tab's areas. */
          error={null}
          query={query}
          onQuery={patch}
          onRetry={() => void onChanged()}
          searchLabel={t.searchLabel}
          emptyMsg={filtered ? `No ${k.nounLower} matches the current search.` : t.empty}
          rowLink={can('viewAbout') ? (i) => aboutViewPath(kind, i.id) : undefined}
        />
      </div>

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? `Deactivate ${k.nounLower}` : `Activate ${k.nounLower}`}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            toggling.isActive
              ? `Deactivate ${itemLabel(toggling)}? It is hidden from the website but stays in this list and can be activated again.`
              : `Activate ${itemLabel(toggling)} and show it on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const i = toggling;
            void run(
              () => aboutService.setItemStatus(kind, i.id, !i.isActive),
              i.isActive ? `${k.noun} deactivated` : `${k.noun} activated`,
              async () => {
                setToggling(null);
                await onChanged();
              },
            );
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title={`Delete ${k.nounLower}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: kind === 'facts' ? 'about-fact' : 'about-card', id: deleting.id }}
          message={`Delete ${itemLabel(deleting)}? It is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const i = deleting;
            void run(
              () => aboutService.removeItem(kind, i.id),
              `${k.noun} deleted`,
              async () => {
                setDeleting(null);
                await onChanged();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}

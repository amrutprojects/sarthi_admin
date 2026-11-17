import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { SectionTabHead } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { QUICK_ACTION_CREATE_PATH, quickActionEditPath, quickActionIconLabel, quickActionName, quickActionViewPath } from '../constants';
import { quickActionsService } from '../services/quickActionsService';
import type { ApiQuickAction } from '../types/quickactions.types';
import QuickActionsPreview from './QuickActionsPreview';

/* The tile's icon on its saffron square, as the website draws it, named for screen readers. */
const IconTile = ({ id }: { id: string }) => (
  <div
    title={quickActionIconLabel(id)}
    role="img"
    aria-label={`Icon: ${quickActionIconLabel(id)}`}
    style={{
      width: 32,
      height: 32,
      borderRadius: 9,
      background: 'var(--saffron-100)',
      color: 'var(--brand-600)',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <Icon name={id} />
  </div>
);

/* Where a click on the tile leads: a page of the website or another site. */
const Destination = ({ link }: { link: string }) =>
  link.startsWith('/') ? (
    <span className="mono fs12">{link}</span>
  ) : (
    <span className="mono fs12" style={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 240 }}>
      {link} <span aria-label="opens another site">↗</span>
    </span>
  );

/* Search, sorting and paging in the browser: the API returns every tile at once (clientList.ts). */
const LIST: ClientListOptions<ApiQuickAction> = {
  searchText: (a) => [a.title.en, a.title.mr, a.subtitle.en, a.subtitle.mr, a.link].join(' '),
  sortValue: {
    displayOrder: (a) => a.displayOrder,
    title: (a) => a.title.en,
    link: (a) => a.link,
    /* Active first on ascending. */
    isActive: (a) => (a.isActive ? 0 : 1),
    updatedAt: (a) => a.updatedAt,
  },
  isActive: (a) => a.isActive,
};

/*
 * Quick Actions — the Quick Actions tab of Home Page Management: the strip of tiles right under the banner of the
 * public home page (Apply Now, Check Application Status, Verify Certificate, Training centres), and a preview of it
 * below. The tiles are a listing like FAQ Management's: search, sorting and paging, each row viewed, edited, switched
 * on or off and deleted on its own, and moved up or down while the table shows the website order. Whether the
 * website shows the strip at all is the tab's "Show on website" switch above it (HomePageView); there are no other
 * settings.
 *
 * Every action names its tile by id, never by its position on screen, so a list that has moved on since it
 * was loaded can never delete, hide or reorder the wrong one.
 */
export default function QuickActionsTab() {
  const go = useGo();
  const can = useCan();
  const actions = useApiData(() => quickActionsService.list(), []);
  /* Display order first, so the table reads the way the strip shows the tiles, left to right. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiQuickAction | null>(null);
  const [confirming, setConfirming] = useState<ApiQuickAction | null>(null);

  const all = useMemo(() => actions.data ?? [], [actions.data]);
  const { rows, meta } = useMemo(() => clientPage(all, query, LIST), [all, query]);

  /*
   * Moving a tile swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour may be
   * on the next page, and the whole list is sent.
   */
  const canReorder = can('updateQuickAction') && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (a: ApiQuickAction, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(a.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => quickActionsService.reorder(ids),
      'Display order updated',
      () => actions.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void actions.reload();
    });
  };

  const columns: MasterColumn<ApiQuickAction>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_a, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (a) => {
        const at = all.findIndex((x) => x.id === a.id);
        const off = busy || !inWebsiteOrder;
        const why = inWebsiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {a.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${a.title.en} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(a, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${a.title.en} down`}
                  disabled={off || at < 0 || at === all.length - 1}
                  onClick={() => move(a, 1)}
                >
                  ↓
                </button>
              </span>
            ) : null}
          </div>
        );
      },
    },
    /* The icon is a picture, not something to sort by. */
    { k: 'icon', l: 'Icon', w: '64px', sortable: false, render: (a) => <IconTile id={a.icon} /> },
    {
      k: 'title',
      l: 'Title',
      render: (a) => (
        <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 280 }}>
          <b className="lnk">{a.title.en}</b>
          <div className="muted fs12" lang="mr">
            {a.title.mr}
          </div>
        </div>
      ),
    },
    {
      k: 'subtitle',
      l: 'Subtitle',
      sortable: false,
      render: (a) =>
        a.subtitle.en || a.subtitle.mr ? (
          <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 280 }}>
            <div className="fs12">{a.subtitle.en}</div>
            <div className="muted fs12" lang="mr">
              {a.subtitle.mr}
            </div>
          </div>
        ) : (
          <span className="muted fs12">None</span>
        ),
    },
    { k: 'link', l: 'Link', render: (a) => <Destination link={a.link} /> },
    { k: 'isActive', l: 'Status', render: (a) => <MasterStatusBadge isActive={a.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (a) => <span className="fs12">{fmtDateTime(a.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (a) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn xs"
            title="View"
            aria-label={`View ${a.title.en}`}
            onClick={() => go(quickActionViewPath(a.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateQuickAction">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${a.title.en}`}
              onClick={() => go(quickActionEditPath(a.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateQuickAction">
            <StatusToggle compact isActive={a.isActive} name={a.title.en} canChange disabled={busy} onToggle={() => setConfirming(a)} />
          </Can>
          <Can action="deleteQuickAction">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${a.title.en}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(a)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '' || query.status !== '';
  /* The strip as the website shows it: the active tiles, in display order. */
  const shown = all.filter((a) => a.isActive);

  return (
    <>
      <SectionTabHead
        actions={
          <Can action="createQuickAction">
            <button type="button" className="btn primary" onClick={() => go(QUICK_ACTION_CREATE_PATH)}>
              <Icon name="plus" />
              Add quick action
            </button>
          </Can>
        }
      >
        The strip of tiles right under the banner of the public home page: each tile&rsquo;s icon, title, subtitle and destination, in
        display order from the left.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Quick actions <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {actions.data ? (
              <span className="tag">
                {all.length} listed, {shown.length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={actions.data ? meta : undefined}
          loading={actions.loading}
          error={actions.error}
          query={query}
          onQuery={patch}
          onRetry={() => void actions.reload()}
          searchLabel="title, subtitle or link"
          emptyMsg={
            filtered
              ? 'No quick action matches the current search.'
              : 'No quick actions have been added yet. Use Add quick action to create the first one. While the list is empty, the website shows no quick-action strip.'
          }
          rowLink={can('viewQuickActions') ? (a) => quickActionViewPath(a.id) : undefined}
        />
      </div>

      {actions.data ? (
        <div className="card mb14">
          <div className="card-h">
            <h3>
              Quick actions preview <span className="sub">the active tiles, as the strip under the banner shows them</span>
            </h3>
          </div>
          <div className="card-b">
            <QuickActionsPreview tiles={shown} />
          </div>
        </div>
      ) : null}

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate quick action' : 'Activate quick action'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${quickActionName(confirming)}? The tile leaves the strip on the website; it stays in this list and can be activated again.`
              : `Activate ${quickActionName(confirming)}? The tile appears in the strip on the website again.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const a = confirming;
            void run(
              () => quickActionsService.setStatus(a.id, !a.isActive),
              a.isActive ? 'Quick action hidden from the website' : 'Quick action shown on the website',
              async () => {
                setConfirming(null);
                await actions.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete quick action"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${quickActionName(deleting)}? The tile is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const a = deleting;
            void run(
              () => quickActionsService.remove(a.id),
              'Quick action deleted',
              async () => {
                setDeleting(null);
                await actions.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}

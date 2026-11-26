import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, KvList, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { SectionTabHead } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { announcementEditPath, announcementLabel, announcementViewPath } from '../constants';
import { announcementsService } from '../services/announcementsService';
import type { ApiAnnouncement, Bilingual } from '../types/announcements.types';

/* Marathi first, as on the public site; English underneath. */
const Pair = ({ value }: { value: Bilingual }) =>
  value.mr || value.en ? (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

/* Where a click on the item leads: a page of the website, another site (new tab), or nowhere (plain text). */
const Destination = ({ link }: { link: string | null }) =>
  !link ? (
    <span className="muted fs12" title="The item is plain text in the ticker">
      No link
    </span>
  ) : link.startsWith('/') ? (
    <span className="mono fs12">{link}</span>
  ) : (
    <span className="mono fs12" style={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 240 }}>
      {link} <span aria-label="opens another site">↗</span>
    </span>
  );

/* Search, sorting and paging in the browser: the API returns every announcement at once (clientList.ts). */
const LIST: ClientListOptions<ApiAnnouncement> = {
  searchText: (a) => [a.title.en, a.title.mr, a.detail?.en ?? '', a.detail?.mr ?? '', a.link ?? ''].join(' '),
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
 * Announcements — the Announcements tab of Home Page Management: the ticker that scrolls continuously across the
 * strip at the very top of every page of the public website, and its settings below. The announcements are a
 * listing like FAQ Management's: search, sorting and paging, each row viewed, edited, switched on or off and
 * deleted on its own, and moved up or down while the table shows the website order.
 *
 * Every action names its announcement by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong one.
 */
export default function AnnouncementsTab() {
  const go = useGo();
  const can = useCan();
  const announcements = useApiData(() => announcementsService.list(), []);
  const section = useApiData(() => announcementsService.getSection(), []);
  /* Display order first, so the table reads the way the ticker shows the items. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiAnnouncement | null>(null);
  const [confirming, setConfirming] = useState<ApiAnnouncement | null>(null);

  const all = useMemo(() => announcements.data ?? [], [announcements.data]);
  const { rows, meta } = useMemo(() => clientPage(all, query, LIST), [all, query]);

  /*
   * Moving an announcement swaps it with its neighbour in the website order, so the buttons only work while the
   * table shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour
   * may be on the next page, and the whole list is sent.
   */
  const canReorder = can('updateAnnouncement') && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (a: ApiAnnouncement, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(a.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => announcementsService.reorder(ids),
      'Display order updated',
      () => announcements.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void announcements.reload();
    });
  };

  const columns: MasterColumn<ApiAnnouncement>[] = [
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
    {
      k: 'title',
      l: 'Title',
      render: (a) => (
        /* Titles run long, and panel cells do not wrap unless told to. */
        <div style={{ whiteSpace: 'normal', minWidth: 180, maxWidth: 420 }}>
          <b className="lnk">{a.title.en}</b>
          <div className="muted fs12" lang="mr">
            {a.title.mr}
          </div>
        </div>
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
            onClick={() => go(announcementViewPath(a.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateAnnouncement">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${a.title.en}`}
              onClick={() => go(announcementEditPath(a.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateAnnouncement">
            <StatusToggle compact isActive={a.isActive} name={a.title.en} canChange disabled={busy} onToggle={() => setConfirming(a)} />
          </Can>
          <Can action="deleteAnnouncement">
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
  const sec = section.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateAnnouncement">
              <button type="button" className="btn" disabled={!sec} onClick={() => go('/cms/announcements/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createAnnouncement">
              <button type="button" className="btn primary" onClick={() => go('/cms/announcements/create')}>
                <Icon name="plus" />
                Add announcement
              </button>
            </Can>
          </>
        }
      >
        The announcements ticker at the very top of every page of the public website: each item&rsquo;s title, optional detail and link,
        scrolling past in display order.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Announcements <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {announcements.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((a) => a.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={announcements.data ? meta : undefined}
          loading={announcements.loading}
          error={announcements.error}
          query={query}
          onQuery={patch}
          onRetry={() => void announcements.reload()}
          searchLabel="title, detail or link"
          emptyMsg={
            filtered
              ? 'No announcement matches the current search.'
              : 'No announcements have been added yet. Use Add announcement to create the first one. While the list is empty, the website shows no ticker.'
          }
          rowLink={can('viewAnnouncements') ? (a) => announcementViewPath(a.id) : undefined}
        />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Ticker settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={section.loading && !section.data} error={section.error} onRetry={() => void section.reload()} />
          {sec ? (
            <KvList
              pairs={[
                ['Label', <Pair key="l" value={sec.label} />],
                [
                  'Ticker',
                  <Badge key="v" tone={sec.showSection ? 'green' : 'grey'}>
                    {sec.showSection ? 'Shown' : 'Hidden'}
                  </Badge>,
                ],
                ['Last updated', fmtDateTime(sec.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate announcement' : 'Activate announcement'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${announcementLabel(confirming)}? It leaves the ticker on the website; the announcement stays in this list and can be activated again.`
              : `Activate ${announcementLabel(confirming)}? It scrolls past in the ticker on the website again.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const a = confirming;
            void run(
              () => announcementsService.setStatus(a.id, !a.isActive),
              a.isActive ? 'Announcement deactivated' : 'Announcement activated',
              async () => {
                setConfirming(null);
                await announcements.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete announcement"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'announcement', id: deleting.id }}
          message={`Delete ${announcementLabel(deleting)}? The announcement is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const a = deleting;
            void run(
              () => announcementsService.remove(a.id),
              'Announcement deleted',
              async () => {
                setDeleting(null);
                await announcements.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}

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
import { boardMemberEditPath, boardMemberViewPath, memberLabel } from '../constants';
import { boardService, photoSrc } from '../services/boardService';
import type { ApiBoardMember, Bilingual } from '../types/board.types';

/* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
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

/* The member's photo, round like on the website; the person icon when there is none or it fails to load. */
function Thumb({ member }: { member: ApiBoardMember }) {
  const [broken, setBroken] = useState(false);
  const src = photoSrc(member.photoUrl);
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg,#FBE3CB,#F0C9A2)',
      }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt={`Photo of ${memberLabel(member)}`}
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Icon name="users" />
      )}
    </div>
  );
}

/* Search, sorting and paging in the browser: the API returns every member at once (clientList.ts). */
const LIST: ClientListOptions<ApiBoardMember> = {
  searchText: (m) =>
    [
      m.name?.en ?? '',
      m.name?.mr ?? '',
      m.designation.en,
      m.designation.mr,
      m.category.en,
      m.category.mr,
      m.description.en,
      m.description.mr,
    ].join(' '),
  sortValue: {
    displayOrder: (m) => m.displayOrder,
    name: (m) => m.name?.en,
    category: (m) => m.category.en,
    /* Active first on ascending. */
    isActive: (m) => (m.isActive ? 0 : 1),
    updatedAt: (m) => m.updatedAt,
  },
  isActive: (m) => m.isActive,
};

/*
 * Leadership & Governing Board — the Board Members Management tab of Home Page Management: the मान्यवर व
 * संचालक मंडळ section of the home and About pages, its members and its section settings. The members are a
 * listing like FAQ Management's: search, sorting and paging, each row viewed, edited, switched on or off and
 * deleted on its own, and moved up or down while the table shows the website order.
 *
 * Every action names its member by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong member.
 */
export default function BoardMembersTab() {
  const go = useGo();
  const can = useCan();
  const members = useApiData(() => boardService.list(), []);
  const section = useApiData(() => boardService.getSection(), []);
  /* Display order first, so the table reads the way the website shows the cards. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiBoardMember | null>(null);
  const [confirming, setConfirming] = useState<ApiBoardMember | null>(null);

  const all = useMemo(() => members.data ?? [], [members.data]);
  const { rows, meta } = useMemo(() => clientPage(all, query, LIST), [all, query]);

  /*
   * Moving a member swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour may be
   * on the next page, and the whole list is sent.
   */
  const canReorder = can('updateBoardMember') && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (m: ApiBoardMember, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(m.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => boardService.reorder(ids),
      'Display order updated',
      () => members.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void members.reload();
    });
  };

  const columns: MasterColumn<ApiBoardMember>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_m, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (m) => {
        const at = all.findIndex((x) => x.id === m.id);
        const off = busy || !inWebsiteOrder;
        const why = inWebsiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {m.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${memberLabel(m)} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(m, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${memberLabel(m)} down`}
                  disabled={off || at < 0 || at === all.length - 1}
                  onClick={() => move(m, 1)}
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
      k: 'name',
      l: 'Name',
      render: (m) => (
        /* Designations run long, and panel cells do not wrap unless told to. */
        <div style={{ whiteSpace: 'normal', minWidth: 180, maxWidth: 340 }}>
          {m.name ? (
            <>
              <b className="lnk">{m.name.en}</b>
              <div className="fs12" lang="mr">
                {m.name.mr}
              </div>
            </>
          ) : (
            <i className="muted">— name to be filled —</i>
          )}
          <div className="muted fs12">{m.designation.en}</div>
          <div className="muted fs12" lang="mr">
            {m.designation.mr}
          </div>
        </div>
      ),
    },
    /* The extras after the title column, as in every home page table. */
    { k: 'photo', l: 'Photo', w: '64px', sortable: false, render: (m) => <Thumb member={m} /> },
    { k: 'category', l: 'Category', render: (m) => <Pair value={m.category} /> },
    { k: 'isActive', l: 'Status', render: (m) => <MasterStatusBadge isActive={m.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (m) => <span className="fs12">{fmtDateTime(m.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (m) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn xs"
            title="View"
            aria-label={`View ${memberLabel(m)}`}
            onClick={() => go(boardMemberViewPath(m.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateBoardMember">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${memberLabel(m)}`}
              onClick={() => go(boardMemberEditPath(m.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateBoardMember">
            <StatusToggle compact isActive={m.isActive} name={memberLabel(m)} canChange disabled={busy} onToggle={() => setConfirming(m)} />
          </Can>
          <Can action="deleteBoardMember">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${memberLabel(m)}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(m)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '' || query.status !== '';
  const s = section.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateBoardMember">
              <button type="button" className="btn" disabled={!s} onClick={() => go('/cms/board-members/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createBoardMember">
              <button type="button" className="btn primary" onClick={() => go('/cms/board-members/create')}>
                <Icon name="plus" />
                Add Member
              </button>
            </Can>
          </>
        }
      >
        The मान्यवर व संचालक मंडळ section of the home and About pages: each member&rsquo;s photo, name, badge, designation and description,
        in display order.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Board Members <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {members.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((m) => m.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={members.data ? meta : undefined}
          loading={members.loading}
          error={members.error}
          query={query}
          onQuery={patch}
          onRetry={() => void members.reload()}
          searchLabel="name, designation or category"
          emptyMsg={
            filtered ? 'No member matches the current search.' : 'No members have been added yet. Use Add Member to create the first card.'
          }
          rowLink={can('viewBoardMembers') ? (m) => boardMemberViewPath(m.id) : undefined}
        />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={section.loading && !section.data} error={section.error} onRetry={() => void section.reload()} />
          {s ? (
            <KvList
              pairs={[
                ['Heading', <Pair key="h" value={s.heading} />],
                ['Subtitle', <Pair key="s" value={s.subtitle} />],
                [
                  'Notice',
                  <Badge key="n" tone={s.showNotice ? 'green' : 'grey'}>
                    {s.showNotice ? 'Shown' : 'Hidden'}
                  </Badge>,
                ],
                ['Notice heading', <Pair key="nt" value={s.noticeTitle} />],
                ['Notice text', <Pair key="nb" value={s.noticeBody} />],
                ['Last updated', fmtDateTime(s.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate member' : 'Activate member'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${memberLabel(confirming)}? The card is hidden from the website; the member stays in this list and can be activated again.`
              : `Activate ${memberLabel(confirming)}? The card is shown on the website again.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const m = confirming;
            void run(
              () => boardService.setStatus(m.id, !m.isActive),
              m.isActive ? 'Member deactivated' : 'Member activated',
              async () => {
                setConfirming(null);
                await members.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete member"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete ${memberLabel(deleting)}? The card is removed from the website and from this list, and its photo is deleted. ` +
            'The record itself is kept for audit history.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const m = deleting;
            void run(
              () => boardService.remove(m.id),
              'Member deleted',
              async () => {
                setDeleting(null);
                await members.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}

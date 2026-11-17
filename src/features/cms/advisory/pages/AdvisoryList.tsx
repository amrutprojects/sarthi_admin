import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../components/MasterTable';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery, usePageTitle } from '../../useMasterQuery';
import GroupsCard from '../components/GroupsCard';
import {
  ADVISORY_CREATE_PATH,
  ADVISORY_SETTINGS_PATH,
  ADVISORY_TITLE,
  advisoryMemberEditPath,
  advisoryMemberViewPath,
  groupOptionLabel,
  memberLabel,
} from '../constants';
import { advisoryService, photoSrc } from '../services/advisoryService';
import type { ApiAdvisoryMember, Bilingual } from '../types/advisory.types';

/* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
const Pair = ({ value }: { value: Bilingual }) =>
  value.mr || value.en ? (
    <div style={{ whiteSpace: 'normal', minWidth: 140, maxWidth: 280 }}>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

/* The Advisory Committee member's photo, round like on the website; the person icon when there is none or it fails to load. */
function Thumb({ member }: { member: ApiAdvisoryMember }) {
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

/* Search, sorting and paging in the browser: the API returns every Advisory Committee member at once (clientList.ts). */
const LIST: ClientListOptions<ApiAdvisoryMember> = {
  searchText: (m) => [m.name.en, m.name.mr, m.designation.en, m.designation.mr].join(' '),
  sortValue: {
    displayOrder: (m) => m.displayOrder,
    name: (m) => m.name.en,
    designation: (m) => m.designation.en,
    /* Advisory Committee members without a group sort last, as blanks do. */
    group: (m) => m.group?.name.en,
    /* Shown first on ascending. */
    isActive: (m) => (m.isActive ? 0 : 1),
  },
  isActive: (m) => m.isActive,
};

/* The group filter's "No group" value; group ids are UUIDs, so it cannot clash with one. */
const NO_GROUP = 'none';

interface AdvisoryQuery extends MasterQuery {
  /* '' = every Advisory Committee member, NO_GROUP = Advisory Committee members without a group, otherwise a group's id. */
  group: string;
}

const inGroup = (m: ApiAdvisoryMember, group: string) => group === '' || (group === NO_GROUP ? !m.groupId : m.groupId === group);

/*
 * Advisory Committee Management — the website's Advisory Committee page (अमृत कलश सल्लागार समिती): its heading
 * and subtitle, and the Advisory Committee members listed on it. The list works like Board Members Management's:
 * search, sorting and paging, each Advisory Committee member viewed, edited, shown or hidden and deleted on its own, and moved up
 * or down while the table shows the website order.
 *
 * Every action names its Advisory Committee member by id, never by its position on screen, so a list that has moved on since it
 * was loaded can never delete, hide or reorder the wrong Advisory Committee member.
 */
export default function AdvisoryList() {
  usePageTitle(ADVISORY_TITLE);
  const go = useGo();
  const can = useCan();
  const members = useApiData(() => advisoryService.list(), []);
  const section = useApiData(() => advisoryService.getSection(), []);
  const groups = useApiData(() => advisoryService.listGroups(), []);
  /* Display order first, so the table reads the way the website shows the Advisory Committee members. */
  const initial = useMemo<AdvisoryQuery>(() => ({ ...masterQuery('displayOrder'), group: '' }), []);
  const { query, patch, reset } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiAdvisoryMember | null>(null);
  const [confirming, setConfirming] = useState<ApiAdvisoryMember | null>(null);

  const all = useMemo(() => members.data ?? [], [members.data]);
  const groupList = useMemo(() => groups.data ?? [], [groups.data]);
  const hiddenGroups = useMemo(() => new Set(groupList.filter((g) => !g.isActive).map((g) => g.id)), [groupList]);
  const inFilter = useMemo(() => all.filter((m) => inGroup(m, query.group)), [all, query.group]);
  const { rows, meta } = useMemo(() => clientPage(inFilter, query, LIST), [inFilter, query]);

  /* A group deleted while it was the filter: back to every Advisory Committee member, rather than a filter the select cannot show. */
  useEffect(() => {
    if (groups.data && query.group && query.group !== NO_GROUP && !groups.data.some((g) => g.id === query.group)) patch({ group: '' });
  }, [groups.data, query.group, patch]);

  /*
   * Moving an Advisory Committee member swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched or filtered by status. Paging is fine —
   * the neighbour may be on the next page, and the whole list is sent. With a group picked in the filter the
   * neighbour is the previous / next Advisory Committee member of that group: the order the website shows under its heading.
   */
  const canUpdate = can('updateAdvisoryMember');
  const canReorder = canUpdate && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (m: ApiAdvisoryMember, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const shown = inFilter.map((x) => x.id);
    const at = shown.indexOf(m.id);
    const other = at < 0 ? undefined : shown[at + by];
    const from = ids.indexOf(m.id);
    const to = other === undefined ? -1 : ids.indexOf(other);
    if (from < 0 || to < 0) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => advisoryService.reorder(ids),
      'Display order updated',
      () => members.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void members.reload();
    });
  };

  const columns: MasterColumn<ApiAdvisoryMember>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_m, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (m) => {
        const at = inFilter.findIndex((x) => x.id === m.id);
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
                  disabled={off || at < 0 || at === inFilter.length - 1}
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
    { k: 'photo', l: 'Photo', w: '64px', sortable: false, render: (m) => <Thumb member={m} /> },
    {
      k: 'name',
      l: 'Name',
      render: (m) => (
        <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 300 }}>
          <b className="lnk">{m.name.en}</b>
          <div className="fs12" lang="mr">
            {m.name.mr}
          </div>
        </div>
      ),
    },
    { k: 'designation', l: 'Position', render: (m) => <Pair value={m.designation} /> },
    {
      k: 'group',
      l: 'Group',
      render: (m) =>
        m.group ? (
          <div style={{ whiteSpace: 'normal', minWidth: 140, maxWidth: 260 }}>
            <div>
              {m.group.name.en}
              {/* The website hides a hidden group's Advisory Committee members too, whatever their own status. */}
              {hiddenGroups.has(m.group.id) ? <span className="muted"> (hidden)</span> : null}
            </div>
            <div className="muted fs12" lang="mr">
              {m.group.name.mr}
            </div>
          </div>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      k: 'isActive',
      l: 'Status',
      /* The switch for an administrator who may change it; the plain badge otherwise. */
      render: (m) => (
        <StatusToggle isActive={m.isActive} name={memberLabel(m)} canChange={canUpdate} disabled={busy} onToggle={() => setConfirming(m)} />
      ),
    },
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
            onClick={() => go(advisoryMemberViewPath(m.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateAdvisoryMember">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${memberLabel(m)}`}
              onClick={() => go(advisoryMemberEditPath(m.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="deleteAdvisoryMember">
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

  const searched = query.search !== '' || query.status !== '';
  const filtered = searched || query.group !== '';
  const s = section.data;
  /* An Advisory Committee member in a hidden group is not on the website either. */
  const shownCount = all.filter((m) => m.isActive && !(m.groupId && hiddenGroups.has(m.groupId))).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: ADVISORY_TITLE }]}
        title={ADVISORY_TITLE}
        sub="The website's Advisory Committee page (अमृत कलश सल्लागार समिती): its heading and subtitle, and the Advisory Committee members listed on it, in Marathi and English."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createAdvisoryMember">
              <button type="button" className="btn primary" onClick={() => go(ADVISORY_CREATE_PATH)}>
                <Icon name="plus" />
                Add Advisory Committee member
              </button>
            </Can>
          </div>
        }
      />

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Section settings <span className="sub">the heading and subtitle above the Advisory Committee members</span>
          </h3>
          <Can action="updateAdvisoryMember">
            <button type="button" className="btn sm" disabled={!s} onClick={() => go(ADVISORY_SETTINGS_PATH)}>
              <Icon name="edit" />
              Edit settings
            </button>
          </Can>
        </div>
        <div className="card-b">
          <LoadState loading={section.loading && !section.data} error={section.error} onRetry={() => void section.reload()} />
          {s ? (
            <KvList
              pairs={[
                ['Heading', <Pair key="h" value={s.heading} />],
                ['Subtitle', <Pair key="s" value={s.subtitle} />],
                ['Last updated', fmtDateTime(s.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      <GroupsCard groups={groups} onMembersChanged={() => members.reload()} />

      {/* Only offered once there is a group to filter by (or while a filter is still set). */}
      {groupList.length || query.group ? (
        <FilterBar
          id="cms-advisory"
          fields={[
            {
              k: 'group',
              l: 'Group',
              options: [
                { v: '', l: 'All groups' },
                { v: NO_GROUP, l: 'No group' },
                ...groupList.map((g) => ({ v: g.id, l: groupOptionLabel(g) })),
              ],
            },
          ]}
          value={{ group: query.group }}
          onChange={(_key, value) => patch({ group: value })}
          onReset={reset}
        />
      ) : null}

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Committee members <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {members.data ? (
              <span className="tag">
                {all.length} listed, {shownCount} shown on the website
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
          searchLabel="name or position"
          emptyMsg={
            searched
              ? 'No Advisory Committee member matches the current search.'
              : query.group === NO_GROUP
                ? 'Every Advisory Committee member is in a group.'
                : query.group
                  ? 'No Advisory Committee member is in the chosen group. An Advisory Committee member’s group is chosen on its form.'
                  : 'No Advisory Committee members have been added yet. Use Add Advisory Committee member to add the first one.'
          }
          rowLink={can('viewAdvisoryCommittee') ? (m) => advisoryMemberViewPath(m.id) : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Hide Advisory Committee member' : 'Show Advisory Committee member'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            confirming.isActive
              ? `Hide ${memberLabel(confirming)} from the website? The Advisory Committee member stays in this list and can be shown again.`
              : `Show ${memberLabel(confirming)} on the website's Advisory Committee page again?`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const m = confirming;
            void run(
              () => advisoryService.setStatus(m.id, !m.isActive),
              m.isActive ? 'Advisory Committee member hidden from the website' : 'Advisory Committee member shown on the website',
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
          title="Delete Advisory Committee member"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete ${memberLabel(deleting)}? The Advisory Committee member is removed from the website and from this list, and the photo is deleted. ` +
            'The record itself is kept for audit history.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const m = deleting;
            void run(
              () => advisoryService.remove(m.id),
              'Advisory Committee member deleted',
              async () => {
                setDeleting(null);
                await members.reload();
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, EmptyState, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { BOARD_CRUMBS, memberLabel } from '../constants';
import { boardService, photoSrc } from '../services/boardService';
import type { ApiBoardMember, Bilingual } from '../types/board.types';

/*
 * Marathi first, as on the public site; English underneath so both are checkable at a glance.
 * `wrap` lets long text (designations, descriptions) wrap: table cells do not wrap by default here.
 */
const Pair = ({ value, wrap }: { value: Bilingual; wrap?: boolean }) =>
  value.mr || value.en ? (
    <div style={wrap ? { whiteSpace: 'normal', minWidth: 160, maxWidth: 240 } : undefined}>
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
        width: 40,
        height: 40,
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

/*
 * Board Members Management — the मान्यवर व संचालक मंडळ section of the home and About pages.
 *
 * Every action names its member by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong card.
 */
export default function BoardMembersPage() {
  usePageTitle('Board Members Management');
  const go = useGo();
  const can = useCan();
  const members = useApiData(() => boardService.list(), []);
  const section = useApiData(() => boardService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiBoardMember | null>(null);
  const [toggling, setToggling] = useState<ApiBoardMember | null>(null);

  const rows = members.data ?? [];
  const canReorder = can('updateBoardMember') && rows.length > 1;

  const move = (index: number, by: -1 | 1) => {
    const ids = rows.map((m) => m.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    void run(
      () => boardService.reorder(ids),
      'Display order updated',
      () => members.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void members.reload();
    });
  };

  const s = section.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...BOARD_CRUMBS.slice(0, 2), { l: 'Board Members Management' }]}
        title="Board Members Management"
        sub="The मान्यवर व संचालक मंडळ section of the home and About pages: each member's photo, name, badge, designation and description, in display order."
        actions={
          <Can action="createBoardMember">
            <button type="button" className="btn primary" onClick={() => go('/cms/board-members/create')}>
              <Icon name="plus" />
              Add Member
            </button>
          </Can>
        }
      />

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Members{' '}
            <span className="sub">
              {members.data ? `${rows.length} listed, ${rows.filter((m) => m.isActive).length} shown on the website` : ''}
            </span>
          </h3>
        </div>
        <LoadState loading={members.loading && !members.data} error={members.error} onRetry={() => void members.reload()} />
        {members.data && rows.length === 0 ? (
          <EmptyState title="No members yet" msg="The section shows no cards until a member is added.">
            <Can action="createBoardMember">
              <button type="button" className="btn primary" onClick={() => go('/cms/board-members/create')}>
                <Icon name="plus" />
                Add Member
              </button>
            </Can>
          </EmptyState>
        ) : null}
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 92 }}>Order</th>
                  <th style={{ width: 56 }}>Photo</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Designation</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} className="norow" data-member-id={m.id}>
                    <td>
                      <div className="f ac gp4">
                        <b className="mono fs12" style={{ minWidth: 22 }}>
                          {m.displayOrder}
                        </b>
                        {canReorder ? (
                          <>
                            <button
                              type="button"
                              className="btn xs"
                              title="Move up"
                              aria-label={`Move ${memberLabel(m)} up`}
                              disabled={busy || i === 0}
                              onClick={() => move(i, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn xs"
                              title="Move down"
                              aria-label={`Move ${memberLabel(m)} down`}
                              disabled={busy || i === rows.length - 1}
                              onClick={() => move(i, 1)}
                            >
                              ↓
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Thumb member={m} />
                    </td>
                    <td>{m.name ? <b>{m.name}</b> : <i className="muted">— name to be filled —</i>}</td>
                    <td>
                      <Pair value={m.category} />
                    </td>
                    <td>
                      <Pair value={m.designation} wrap />
                    </td>
                    <td>
                      <Pair value={m.description} wrap />
                    </td>
                    <td>
                      <MasterStatusBadge isActive={m.isActive} />
                    </td>
                    <td>
                      <div className="f gp4">
                        <Can action="updateBoardMember">
                          <button
                            type="button"
                            className="btn xs"
                            title="Edit"
                            aria-label={`Edit ${memberLabel(m)}`}
                            onClick={() => go(`/cms/board-members/${m.id}/edit`)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="btn xs"
                            title={m.isActive ? 'Hide from the website' : 'Show on the website'}
                            aria-label={`${m.isActive ? 'Hide' : 'Show'} ${memberLabel(m)}`}
                            style={{ color: m.isActive ? 'var(--amber)' : 'var(--green)' }}
                            disabled={busy}
                            onClick={() => setToggling(m)}
                          >
                            <Icon name="power" />
                          </button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
          {s ? (
            <Can action="updateBoardMember">
              <button type="button" className="btn sm" onClick={() => go('/cms/board-members/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
          ) : null}
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

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? 'Hide member' : 'Show member'}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            toggling.isActive
              ? `Hide ${memberLabel(toggling)} from the website? The member stays in this list and can be shown again.`
              : `Show ${memberLabel(toggling)} on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const m = toggling;
            void run(
              () => boardService.setStatus(m.id, !m.isActive),
              m.isActive ? 'Member hidden' : 'Member shown',
              async () => {
                setToggling(null);
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
    </div>
  );
}

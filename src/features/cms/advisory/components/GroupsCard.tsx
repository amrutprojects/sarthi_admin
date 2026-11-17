import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import type { ApiError } from '../../../../services/api-client';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, LoadState, useAction } from '../../shared';
import { advisoryService } from '../services/advisoryService';
import type { ApiAdvisoryGroup } from '../types/advisory.types';
import GroupFormModal from './GroupFormModal';

const membersLabel = (n: number) => (n === 1 ? '1 Advisory Committee member' : `${n} Advisory Committee members`);

/* The contract's wording; a group with nobody in it has nothing to keep. */
const deleteMessage = (g: ApiAdvisoryGroup) =>
  `Delete group "${g.name.en}"? ` +
  (g.memberCount === 0
    ? 'It has no Advisory Committee members.'
    : `Its ${membersLabel(g.memberCount)} ${g.memberCount === 1 ? 'stays' : 'stay'}, shown without a group heading.`);

/*
 * The Groups card on the Advisory Committee list: the headings the website lists Advisory Committee members under (such as the
 * organisation they belong to), in website order. Groups are optional; an Advisory Committee member's group is picked on its form.
 *
 * Like the Advisory Committee members, every action names its group by id, and a reorder sends the whole list of ids, so a list
 * that has moved on since it was loaded can never change the wrong group. Deleting or renaming a group also
 * changes the Advisory Committee members table (its Group column), hence onMembersChanged.
 */
export default function GroupsCard({
  groups,
  onMembersChanged,
}: {
  groups: { data: ApiAdvisoryGroup[] | null; loading: boolean; error: ApiError | null; reload: () => Promise<void> };
  onMembersChanged: () => void | Promise<void>;
}) {
  const can = useCan();
  const { busy, run } = useAction();
  /* 'new' = the Add group dialog. */
  const [editing, setEditing] = useState<ApiAdvisoryGroup | 'new' | null>(null);
  const [confirming, setConfirming] = useState<ApiAdvisoryGroup | null>(null);
  const [deleting, setDeleting] = useState<ApiAdvisoryGroup | null>(null);

  const all = groups.data ?? [];
  const canUpdate = can('updateAdvisoryMember');
  const canReorder = canUpdate && all.length > 1;

  const move = (g: ApiAdvisoryGroup, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(g.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => advisoryService.reorderGroups(ids),
      'Group order updated',
      () => groups.reload(),
    ).then((ok) => {
      /* A 409 means a group was added or deleted elsewhere; show the current list rather than the stale one. */
      if (!ok) void groups.reload();
    });
  };

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          Groups <span className="sub">optional headings the Advisory Committee members are listed under on the website</span>
        </h3>
        <Can action="createAdvisoryMember">
          <button type="button" className="btn sm" onClick={() => setEditing('new')}>
            <Icon name="plus" />
            Add group
          </button>
        </Can>
      </div>
      <div className="card-b">
        <LoadState loading={groups.loading && !groups.data} error={groups.error} onRetry={() => void groups.reload()} />
        {groups.data && all.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Optional: show Advisory Committee members under headings such as the organisation they belong to. Without groups the website lists every Advisory Committee member
            together. Add a group, then choose it on each Advisory Committee member&rsquo;s form.
          </p>
        ) : null}
        {all.length ? (
          <>
            <p className="muted fs12" style={{ marginTop: 0 }}>
              The website lists Advisory Committee members without a group first, then each group under its heading, in this order. An Advisory Committee member&rsquo;s group is
              chosen on its form.
            </p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: canReorder ? 120 : 86 }}>Order</th>
                    <th>Group name</th>
                    <th style={{ width: 210 }}>Advisory Committee members</th>
                    <th>Status</th>
                    <th style={{ width: 110 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((g, at) => (
                    <tr key={g.id} className="norow">
                      <td>
                        <div className="f ac gp4">
                          <span className="mono fs12" style={{ minWidth: 22 }}>
                            {g.displayOrder}
                          </span>
                          {canReorder ? (
                            <>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move up"
                                aria-label={`Move group ${g.name.en} up`}
                                disabled={busy || at === 0}
                                onClick={() => move(g, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move down"
                                aria-label={`Move group ${g.name.en} down`}
                                disabled={busy || at === all.length - 1}
                                onClick={() => move(g, 1)}
                              >
                                ↓
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'normal', minWidth: 180, maxWidth: 420 }}>
                          <b>{g.name.en}</b>
                          <div className="fs12" lang="mr">
                            {g.name.mr}
                          </div>
                        </div>
                      </td>
                      <td>{membersLabel(g.memberCount)}</td>
                      <td>
                        <StatusToggle
                          isActive={g.isActive}
                          name={`Group ${g.name.en}`}
                          canChange={canUpdate}
                          disabled={busy}
                          onToggle={() => setConfirming(g)}
                        />
                      </td>
                      <td>
                        <div className="f gp4">
                          <Can action="updateAdvisoryMember">
                            <button
                              type="button"
                              className="btn xs"
                              title="Edit"
                              aria-label={`Edit group ${g.name.en}`}
                              disabled={busy}
                              onClick={() => setEditing(g)}
                            >
                              <Icon name="edit" />
                            </button>
                          </Can>
                          <Can action="deleteAdvisoryMember">
                            <button
                              type="button"
                              className="btn xs"
                              title="Delete"
                              aria-label={`Delete group ${g.name.en}`}
                              style={{ color: 'var(--red)' }}
                              disabled={busy}
                              onClick={() => setDeleting(g)}
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
          </>
        ) : null}
      </div>

      {editing ? (
        <GroupFormModal
          group={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await Promise.all([groups.reload(), onMembersChanged()]);
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Hide group' : 'Show group'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            confirming.isActive
              ? `Hide group "${confirming.name.en}" from the website? Its heading and the Advisory Committee members in it are hidden with it; ` +
                'they stay in this list and the group can be shown again.'
              : `Show group "${confirming.name.en}" on the website again? Its Advisory Committee members that are shown on the website appear under its heading.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const g = confirming;
            void run(
              () => advisoryService.setGroupStatus(g.id, !g.isActive),
              g.isActive ? 'Group hidden from the website' : 'Group shown on the website',
              async () => {
                setConfirming(null);
                await groups.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete group"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={deleteMessage(deleting)}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const g = deleting;
            void run(
              () => advisoryService.removeGroup(g.id),
              'Group deleted',
              async () => {
                setDeleting(null);
                await Promise.all([groups.reload(), onMembersChanged()]);
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

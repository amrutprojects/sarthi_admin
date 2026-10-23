import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Dash, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { BOARD_CRUMBS, BOARD_TAB_PATH, boardMemberEditPath, memberLabel } from '../constants';
import { boardService, photoSrc } from '../services/boardService';
import type { ApiBoardMember, Bilingual } from '../types/board.types';

/* A Marathi / English pair, or a dash when both are blank (optional texts come back as { mr: '', en: '' }). */
const Text = ({ value }: { value: Bilingual }) => (value.mr || value.en ? <Bi value={value} /> : <Dash />);

/* The member's photo as the website shows it, round; a note when the card shows the person icon instead. */
function Photo({ member }: { member: ApiBoardMember }) {
  const [broken, setBroken] = useState(false);
  const src = photoSrc(member.photoUrl);
  if (!src) return <span className="muted">No photo — the card shows the person icon</span>;
  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg,#FBE3CB,#F0C9A2)',
      }}
    >
      {broken ? (
        <Icon name="users" />
      ) : (
        <img
          src={src}
          alt={`Photo of ${memberLabel(member)}`}
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}

/*
 * View Member — read-only detail page of one board member, reached from the View action (or a click on the row)
 * on the Leadership & Governing Board tab of Home Page Management. Loads the saved record by its id.
 */
export default function BoardMemberView() {
  usePageTitle('Board Member');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => boardService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const member = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...BOARD_CRUMBS, { l: 'View' }]}
        title={member ? memberLabel(member) : 'Board Member'}
        badge={member ? <span className="tag">Order {member.displayOrder}</span> : undefined}
        back={<BackButton to={BOARD_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {member ? (
              <>
                <Can action="deleteBoardMember">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateBoardMember">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => boardService.setStatus(member.id, !member.isActive),
                        member.isActive ? 'Member deactivated' : 'Member activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateBoardMember">
                  <button type="button" className="btn primary" onClick={() => go(boardMemberEditPath(member.id))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {member ? (
        <div className="cms-sections">
          <div className="card">
            <div className="card-h">
              <h3>
                Member details <span className="sub">as the card on the home and About pages shows them</span>
              </h3>
            </div>
            <FieldTable
              rows={[
                ['Photo', <Photo member={member} />],
                ['Name', member.name ?? <i className="muted">Not yet available — the website prints its placeholder</i>],
                ['Category (badge)', <Text value={member.category} />],
                ['Designation', <Text value={member.designation} />],
                ['Description', <Text value={member.description} />],
                ['Subtitle', <Text value={member.subtitle} />],
                ['Display order', String(member.displayOrder)],
                ['Status', <MasterStatusBadge isActive={member.isActive} />],
                ['On the website', member.isActive ? 'Shown in the Leadership & Governing Board section' : 'Hidden from the website'],
                ['Created', fmtDateTime(member.createdAt)],
                ['Last updated', fmtDateTime(member.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {member && deleting ? (
        <ConfirmModal
          title="Delete member"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={
            `Delete ${memberLabel(member)}? The card is removed from the website and from this list, and its photo is deleted. ` +
            'The record itself is kept for audit history.'
          }
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => boardService.remove(member.id),
              'Member deleted',
              () => {
                setDeleting(false);
                navigate(BOARD_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

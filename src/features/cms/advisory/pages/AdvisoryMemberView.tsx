import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Dash, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { ADVISORY_CRUMBS, ADVISORY_PATH, PROFILE_LIST_LABELS, advisoryMemberEditPath, memberLabel } from '../constants';
import { advisoryService, photoSrc } from '../services/advisoryService';
import { PROFILE_LISTS, type ApiAdvisoryMember, type Bilingual, type BilingualList } from '../types/advisory.types';

/* A Marathi / English pair, or a dash when both are blank (optional texts come back as { mr: '', en: '' }). */
const Text = ({ value }: { value: Bilingual }) => (value.mr || value.en ? <Bi value={value} /> : <Dash />);

const LANGS = [
  ['mr', 'Marathi', 'English', 'bi-main'],
  ['en', 'English', 'Marathi', 'bi-alt'],
] as const;

/*
 * A profile part, Marathi first. It may be filled in one language only: the blank language is named, with
 * what the website shows in its place. A dash when both are blank (the website leaves the section out).
 */
function Profile({ filled, render }: { filled: (half: 'mr' | 'en') => boolean; render: (half: 'mr' | 'en') => ReactNode }) {
  if (!filled('mr') && !filled('en')) return <Dash />;
  return (
    <div className="fc gp8">
      {LANGS.map(([half, lang, other, cls]) =>
        filled(half) ? (
          <div key={half} className={cls} lang={half}>
            {render(half)}
          </div>
        ) : (
          <div key={half} className="muted fs12">
            {lang}: blank — the website shows the {other} text instead
          </div>
        ),
      )}
    </div>
  );
}

const ProfileText = ({ value }: { value: Bilingual }) => <Profile filled={(half) => value[half] !== ''} render={(half) => value[half]} />;

/* A profile list as the website shows it: a bulleted list per language. */
const ProfileList = ({ value }: { value: BilingualList }) => (
  <Profile
    filled={(half) => value[half].length > 0}
    render={(half) => (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {value[half].map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )}
  />
);

/* The group heading the Advisory Committee member is listed under, or where the website lists an Advisory Committee member without one. */
function Group({ group, hidden }: { group: ApiAdvisoryMember['group']; hidden: boolean }) {
  if (!group) return <span className="muted">No group — listed first on the website, without a heading</span>;
  return (
    <div className="fc gp4">
      <Bi value={group.name} />
      {hidden ? <span className="muted fs12">Hidden group — the website shows neither its heading nor its Advisory Committee members</span> : null}
    </div>
  );
}

/* The Advisory Committee member's photo as the website shows it, round; a note when the website shows the person icon instead. */
function Photo({ member }: { member: ApiAdvisoryMember }) {
  const [broken, setBroken] = useState(false);
  const src = photoSrc(member.photoUrl);
  if (!src) return <span className="muted">No photo — the website shows the person icon</span>;
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
 * View Advisory Committee member — read-only detail page of one Advisory Committee member, reached from the View action (or a click
 * on the row) on the Advisory Committee Management list. Loads the saved record by its id.
 */
export default function AdvisoryMemberView() {
  usePageTitle('Advisory Committee Member');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => advisoryService.get(id), [id]);
  /* Only to tell whether the Advisory Committee member's group is hidden; without the list the group is shown by name alone. */
  const groups = useApiData(() => advisoryService.listGroups(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const member = detail.data;
  const groupHidden = !!member?.groupId && !!groups.data?.some((g) => g.id === member.groupId && !g.isActive);

  return (
    <div className="page">
      <PageHead
        crumbs={[...ADVISORY_CRUMBS, { l: 'View' }]}
        title={member ? memberLabel(member) : 'Advisory Committee member'}
        badge={member ? <span className="tag">Order {member.displayOrder}</span> : undefined}
        back={<BackButton to={ADVISORY_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {member ? (
              <>
                <Can action="deleteAdvisoryMember">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateAdvisoryMember">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => advisoryService.setStatus(member.id, !member.isActive),
                        member.isActive ? 'Advisory Committee member hidden from the website' : 'Advisory Committee member shown on the website',
                        () => detail.reload(),
                      )
                    }
                  >
                    {member.isActive ? 'Hide from website' : 'Show on website'}
                  </button>
                </Can>
                <Can action="updateAdvisoryMember">
                  <button type="button" className="btn primary" onClick={() => go(advisoryMemberEditPath(member.id))}>
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
                Advisory Committee member details <span className="sub">as the website&rsquo;s Advisory Committee page shows them</span>
              </h3>
            </div>
            <FieldTable
              rows={[
                ['Photo', <Photo member={member} />],
                ['Name', <Text value={member.name} />],
                ['Position', <Text value={member.designation} />],
                ['Group', <Group group={member.group ?? null} hidden={groupHidden} />],
                ['Experience', <ProfileText value={member.experience} />],
                ...PROFILE_LISTS.map((key): [string, ReactNode] => [PROFILE_LIST_LABELS[key], <ProfileList value={member[key]} />]),
                ['Display order', String(member.displayOrder)],
                ['Status', <MasterStatusBadge isActive={member.isActive} />],
                [
                  'On the website',
                  !member.isActive
                    ? 'Hidden from the website'
                    : groupHidden
                      ? 'Hidden from the website: its group is hidden'
                      : 'Shown on the Advisory Committee page',
                ],
                ['Created', fmtDateTime(member.createdAt)],
                ['Last updated', fmtDateTime(member.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {member && deleting ? (
        <ConfirmModal
          title="Delete Advisory Committee member"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'advisory-member', id: member.id }}
          message={
            `Delete ${memberLabel(member)}? The Advisory Committee member is removed from the website and from this list, and the photo is deleted. ` +
            'The record itself is kept for audit history.'
          }
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => advisoryService.remove(member.id),
              'Advisory Committee member deleted',
              () => {
                setDeleting(false);
                navigate(ADVISORY_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

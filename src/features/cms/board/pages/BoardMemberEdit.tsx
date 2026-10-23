import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import MemberForm from '../components/MemberForm';
import { boardService, photoSrc } from '../services/boardService';
import { memberChanges, memberToForm } from '../validation/board.validation';
import { BOARD_CRUMBS, memberLabel } from '../constants';

/*
 * Edit Member — a dedicated page that loads the member's saved record by its id, so the form always
 * starts from what is actually stored. Only the fields changed here are sent, with the version the
 * page was opened at; a save over someone else's newer edit is refused rather than overwriting it.
 */
export default function BoardMemberEdit() {
  usePageTitle('Edit Board Member');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => boardService.get(id), [id]);

  const member = detail.data;
  const label = member ? memberLabel(member) : 'Member';

  return (
    <div className="page">
      <PageHead
        crumbs={[...BOARD_CRUMBS, { l: 'Edit' }]}
        title={member ? `Edit ${label}` : 'Edit Member'}
        sub="Leaving the photo untouched keeps the current one. Changes appear on the public website once saved."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {member && !can('updateBoardMember') ? (
        <Callout tone="warn" title="You can view this section but not edit members">
          Editing a member needs the &ldquo;Update Board Members Management&rdquo; permission.
        </Callout>
      ) : null}

      {member && can('updateBoardMember') ? (
        <MemberForm
          key={member.updatedAt}
          initial={memberToForm(member)}
          currentPhoto={photoSrc(member.photoUrl)}
          submitLabel="Save changes"
          backTo="/cms/board-members"
          isCreate={false}
          onSave={async (values, photo) => {
            const changes = memberChanges(member, values);
            if (photo.kind === 'remove') changes.removePhoto = true;
            await boardService.update(member.id, changes, photo.kind === 'new' ? photo.file : null);
            toastOk('Member updated');
            navigate('/cms/board-members');
          }}
        />
      ) : null}
    </div>
  );
}

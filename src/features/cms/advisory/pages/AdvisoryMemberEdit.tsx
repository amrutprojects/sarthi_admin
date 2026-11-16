import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import MemberForm from '../components/MemberForm';
import { ADVISORY_CRUMBS, ADVISORY_PATH, memberLabel } from '../constants';
import { advisoryService, photoSrc } from '../services/advisoryService';
import { memberChanges, memberToForm } from '../validation/advisory.validation';

/*
 * Edit trainer — a dedicated page that loads the trainer's saved record by its id, so the form always
 * starts from what is actually stored. Only the fields changed here are sent, with the version the
 * page was opened at; a save over someone else's newer edit is refused (409) rather than overwriting it.
 */
export default function AdvisoryMemberEdit() {
  usePageTitle('Edit Advisory Committee Trainer');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => advisoryService.get(id), [id]);

  const member = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ADVISORY_CRUMBS, { l: 'Edit' }]}
        title={member ? `Edit ${memberLabel(member)}` : 'Edit trainer'}
        sub="Leaving the photo untouched keeps the current one. Changes appear on the public website once saved."
        back={<BackButton to={ADVISORY_PATH} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {member && !can('updateAdvisoryMember') ? (
        <Callout tone="warn" title="You can view this section but not edit trainers">
          Editing a trainer needs the &ldquo;Update Advisory Committee Management&rdquo; permission.
        </Callout>
      ) : null}

      {member && can('updateAdvisoryMember') ? (
        <MemberForm
          key={member.updatedAt}
          initial={memberToForm(member)}
          currentPhoto={photoSrc(member.photoUrl)}
          currentGroup={member.group ?? null}
          submitLabel="Save changes"
          backTo={ADVISORY_PATH}
          onSave={async (values, photo) => {
            const changes = memberChanges(member, values);
            if (photo.kind === 'remove') changes.removePhoto = true;
            await advisoryService.update(member.id, changes, photo.kind === 'new' ? photo.file : null);
            toastOk('Trainer updated');
            navigate(ADVISORY_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import MemberForm from '../components/MemberForm';
import { ADVISORY_CRUMBS, ADVISORY_PATH } from '../constants';
import { advisoryService } from '../services/advisoryService';
import { emptyMemberForm, memberPayload } from '../validation/advisory.validation';

/* Add trainer — a dedicated page, reached from the Add trainer button on the list. */
export default function AdvisoryMemberCreate() {
  usePageTitle('Add Advisory Committee Trainer');
  const navigate = useNavigate();
  const can = useCan();

  return (
    <div className="page">
      <PageHead
        crumbs={[...ADVISORY_CRUMBS, { l: 'Add trainer' }]}
        title="Add trainer"
        sub="Adds a trainer to the end of the Advisory Committee list on the website. Text is entered in Marathi and English — the public site defaults to Marathi."
        back={<BackButton to={ADVISORY_PATH} />}
      />
      {can('createAdvisoryMember') ? (
        <MemberForm
          initial={emptyMemberForm()}
          currentPhoto={null}
          submitLabel="Add trainer"
          backTo={ADVISORY_PATH}
          onSave={async (values, photo) => {
            await advisoryService.create(memberPayload(values), photo.kind === 'new' ? photo.file : null);
            toastOk('Trainer added');
            navigate(ADVISORY_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add trainers">
          Adding a trainer needs the &ldquo;Add Advisory Committee Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

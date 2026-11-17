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

/* Add Advisory Committee member — a dedicated page, reached from the Add Advisory Committee member button on the list. */
export default function AdvisoryMemberCreate() {
  usePageTitle('Add Advisory Committee Member');
  const navigate = useNavigate();
  const can = useCan();

  return (
    <div className="page">
      <PageHead
        crumbs={[...ADVISORY_CRUMBS, { l: 'Add Advisory Committee member' }]}
        title="Add Advisory Committee member"
        sub="Adds an Advisory Committee member to the end of the Advisory Committee list on the website. Text is entered in Marathi and English — the public site defaults to Marathi."
        back={<BackButton to={ADVISORY_PATH} />}
      />
      {can('createAdvisoryMember') ? (
        <MemberForm
          initial={emptyMemberForm()}
          currentPhoto={null}
          submitLabel="Add Advisory Committee member"
          backTo={ADVISORY_PATH}
          onSave={async (values, photo) => {
            await advisoryService.create(memberPayload(values), photo.kind === 'new' ? photo.file : null);
            toastOk('Advisory Committee member added');
            navigate(ADVISORY_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add Advisory Committee members">
          Adding an Advisory Committee member needs the &ldquo;Add Advisory Committee Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

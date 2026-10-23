import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import MemberForm from '../components/MemberForm';
import { BOARD_CRUMBS } from '../constants';
import { boardService } from '../services/boardService';
import { emptyMemberForm, memberPayload } from '../validation/board.validation';

/* Add Member — a dedicated page, reached from the Add Member button on the listing. */
export default function BoardMemberCreate() {
  usePageTitle('Add Board Member');
  const navigate = useNavigate();
  const can = useCan();

  return (
    <div className="page">
      <PageHead
        crumbs={[...BOARD_CRUMBS, { l: 'Add Member' }]}
        title="Add Member"
        sub="Adds a card to the मान्यवर व संचालक मंडळ section. Text is entered in Marathi and English — the public site defaults to Marathi."
      />
      {can('createBoardMember') ? (
        <MemberForm
          initial={emptyMemberForm()}
          currentPhoto={null}
          submitLabel="Add member"
          backTo="/cms/board-members"
          isCreate
          onSave={async (values, photo) => {
            await boardService.create(memberPayload(values), photo.kind === 'new' ? photo.file : null);
            toastOk('Member added');
            navigate('/cms/board-members');
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add members">
          Adding a member needs the &ldquo;Add Board Members Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

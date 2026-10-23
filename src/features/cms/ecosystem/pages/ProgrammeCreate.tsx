import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ProgrammeForm from '../components/ProgrammeForm';
import { ECOSYSTEM_CRUMBS } from '../constants';
import { ecosystemService } from '../services/ecosystemService';
import { emptyProgrammeForm, programmePayload } from '../validation/ecosystem.validation';

/* Add New Programme — a dedicated page, reached from the button on the listing. */
export default function ProgrammeCreate() {
  usePageTitle('Add Programme — The AMRUT Ecosystem');
  const navigate = useNavigate();
  const can = useCan();
  const section = useApiData(() => ecosystemService.getSection(), []);
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the card twice. After a definitive refusal (a 4xx) the next attempt is a new
   * submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...ECOSYSTEM_CRUMBS, { l: 'Add New Programme' }]}
        title="Add New Programme"
        sub="Adds a card to the अमृत प्रणाली section of the public website. Text is entered in Marathi and English — the site defaults to Marathi."
      />
      {can('createEcosystemProgramme') ? (
        <ProgrammeForm
          initial={emptyProgrammeForm()}
          submitLabel="Save programme"
          backTo="/cms/amrut-ecosystem"
          isCreate
          defaultLabel={section.data?.linkLabel ?? null}
          onSave={async (values) => {
            try {
              await ecosystemService.create(programmePayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Programme added');
            navigate('/cms/amrut-ecosystem');
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add programmes">
          Adding a programme needs the &ldquo;Add The AMRUT Ecosystem&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

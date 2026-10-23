import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import SchemeForm from '../components/SchemeForm';
import { SCHEMES_CRUMBS } from '../constants';
import { schemesService } from '../services/schemesService';
import { emptySchemeForm, schemePayload } from '../validation/schemes.validation';

/* Add New Scheme — a dedicated page, reached from the button on the listing. */
export default function SchemeCreate() {
  usePageTitle('Add Scheme — AMRUT Schemes Management');
  const navigate = useNavigate();
  const can = useCan();
  const section = useApiData(() => schemesService.getSection(), []);
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the scheme twice. After a definitive refusal (a 4xx) the next attempt is a new
   * submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...SCHEMES_CRUMBS, { l: 'Add New Scheme' }]}
        title="Add New Scheme"
        sub="Adds a card to the AMRUT Schemes section of the public home page. Text is entered in Marathi and English — the site defaults to Marathi."
      />
      {can('createScheme') ? (
        <SchemeForm
          initial={emptySchemeForm()}
          submitLabel="Save scheme"
          backTo="/cms/amrut-schemes"
          isCreate
          defaultLabel={section.data?.buttonLabel ?? null}
          onSave={async (values) => {
            try {
              await schemesService.create(schemePayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Scheme added');
            navigate('/cms/amrut-schemes');
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add schemes">
          Adding a scheme needs the &ldquo;Add AMRUT Schemes Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

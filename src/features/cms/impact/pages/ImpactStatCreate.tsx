import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ImpactStatForm from '../components/ImpactStatForm';
import { IMPACT_CRUMBS } from '../constants';
import { impactService } from '../services/impactService';
import { emptyStatForm, statPayload } from '../validation/impact.validation';

/* Add New Statistic — a dedicated page, reached from the button on the listing. */
export default function ImpactStatCreate() {
  usePageTitle('Add Statistic — AMRUT Impact Management');
  const navigate = useNavigate();
  const can = useCan();
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the card twice. After a definitive refusal (a 4xx) the next attempt is a new
   * submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...IMPACT_CRUMBS, { l: 'Add New Statistic' }]}
        title="Add New Statistic"
        sub="Adds a card to the AMRUT's Impact section of the public home page. The label is entered in Marathi and English — the site defaults to Marathi."
      />
      {can('createImpactStat') ? (
        <ImpactStatForm
          initial={emptyStatForm()}
          submitLabel="Save statistic"
          backTo="/cms/impact"
          isCreate
          onSave={async (values) => {
            try {
              await impactService.create(statPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Statistic added');
            navigate('/cms/impact');
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add statistics">
          Adding a statistic needs the &ldquo;Add AMRUT Impact Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

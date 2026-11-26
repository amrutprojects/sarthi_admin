import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ImpactStatForm from '../components/ImpactStatForm';
import { IMPACT_CRUMBS, IMPACT_TAB_PATH } from '../constants';
import { impactService } from '../services/impactService';
import { emptyStatForm, statPayload } from '../validation/impact.validation';

/* Add New Statistic — a dedicated page, reached from the button on the listing. */
export default function ImpactStatCreate() {
  usePageTitle('Add Statistic — SARTHI Impact Management');
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
        sub="Adds a card to the SARTHI's Impact section of the public home page. The label is entered in Marathi and English — the site defaults to Marathi."
        back={<BackButton to={IMPACT_TAB_PATH} />}
      />
      {can('createImpactStat') ? (
        <ImpactStatForm
          initial={emptyStatForm()}
          submitLabel="Save statistic"
          backTo={IMPACT_TAB_PATH}
          isCreate
          onSave={async (values) => {
            try {
              await impactService.create(statPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Statistic added');
            navigate(IMPACT_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add statistics">
          Adding a statistic needs the &ldquo;Add SARTHI Impact Management&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

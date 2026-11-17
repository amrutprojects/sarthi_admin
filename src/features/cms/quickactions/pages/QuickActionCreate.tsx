import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import QuickActionForm from '../components/QuickActionForm';
import { QUICK_ACTIONS_CRUMBS, QUICK_ACTIONS_TAB_PATH } from '../constants';
import { quickActionsService } from '../services/quickActionsService';
import { emptyQuickActionForm, quickActionPayload } from '../validation/quickactions.validation';

/* Add quick action — a dedicated page, reached from the button on the listing. */
export default function QuickActionCreate() {
  usePageTitle('Add Quick Action — Quick Actions');
  const navigate = useNavigate();
  const can = useCan();
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the tile twice. After a definitive refusal (a 4xx) the next attempt is a
   * new submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...QUICK_ACTIONS_CRUMBS, { l: 'Add quick action' }]}
        title="Add quick action"
        sub="Adds a tile to the strip under the banner of the public home page. The title and subtitle are entered in Marathi and English — the site defaults to Marathi."
        back={<BackButton to={QUICK_ACTIONS_TAB_PATH} />}
      />
      {can('createQuickAction') ? (
        <QuickActionForm
          initial={emptyQuickActionForm()}
          submitLabel="Save quick action"
          backTo={QUICK_ACTIONS_TAB_PATH}
          isCreate
          onSave={async (values) => {
            try {
              await quickActionsService.create(quickActionPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Quick action added');
            navigate(QUICK_ACTIONS_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add quick actions">
          Adding a quick action needs the &ldquo;Add Quick Actions&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

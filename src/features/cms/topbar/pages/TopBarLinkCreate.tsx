import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import TopBarLinkForm from '../components/TopBarLinkForm';
import { TOPBAR_CRUMBS, TOPBAR_TAB_PATH } from '../constants';
import { topBarService } from '../services/topBarService';
import { emptyTopBarLinkForm, topBarLinkPayload } from '../validation/topbar.validation';

/* Add link — a dedicated page, reached from the button on the listing. */
export default function TopBarLinkCreate() {
  usePageTitle('Add Link — Top Bar');
  const navigate = useNavigate();
  const can = useCan();
  const settings = useApiData(() => topBarService.getSettings(), []);
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the link twice. After a definitive refusal (a 4xx) the next attempt is a
   * new submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...TOPBAR_CRUMBS, { l: 'Add link' }]}
        title="Add Link"
        sub="Adds a button to the strip at the very top of the public website. The label is entered in Marathi and English — the site defaults to Marathi."
        back={<BackButton to={TOPBAR_TAB_PATH} />}
      />
      {can('createTopBarLink') ? (
        <TopBarLinkForm
          initial={emptyTopBarLinkForm()}
          submitLabel="Save link"
          backTo={TOPBAR_TAB_PATH}
          isCreate
          settings={settings.data ?? null}
          onSave={async (values) => {
            try {
              await topBarService.create(topBarLinkPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Link added');
            navigate(TOPBAR_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add links">
          Adding a link needs the &ldquo;Add Top Bar&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

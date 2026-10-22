import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { eligibilityService } from '../services/eligibilityService';
import { toEligibilitySettingsFormValues } from '../validation/eligibility.validation';
import EligibilityPageForm from './EligibilityPageForm';

/*
 * Edit the Eligibility page text — a dedicated page, never a modal. The criteria and documents are
 * managed one by one from the listing; this edits the words around them.
 */
export default function EligibilityPageEdit() {
  usePageTitle('Edit Eligibility Page Text');
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => eligibilityService.getSettings(), []);

  const settings = detail.data;
  /*
   * The route is open to anyone who can see the menu, so a view-only administrator who follows a link
   * here gets an explanation instead of a form whose Save the server would refuse with a 403.
   */
  const canEdit = can('updateEligibility');

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Eligibility Page Management', link: '/cms/eligibility' },
          { l: 'Edit page text' },
        ]}
        title="Edit Eligibility Page Text"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
        back={<BackButton to="/cms/eligibility" />}
      />

      {canEdit ? (
        <>
          <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

          {settings ? (
            <EligibilityPageForm
              initial={toEligibilitySettingsFormValues(settings)}
              backTo="/cms/eligibility"
              onSave={async (values) => {
                await eligibilityService.updateSettings(values);
                toastOk('Eligibility page text updated');
                navigate('/cms/eligibility');
              }}
            />
          ) : null}
        </>
      ) : (
        <Callout tone="warn" title="You cannot change this page. ">
          Your role can view the Eligibility page text but not edit it. Ask an administrator for the Update permission on Eligibility Page
          Management.
        </Callout>
      )}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { applyService } from '../services/applyService';
import { applyListPath } from '../types/apply.types';
import { toApplySettingsFormValues } from '../validation/apply.validation';
import ApplyPageForm from './ApplyPageForm';

/*
 * Edit the Apply page text — a dedicated page, never a modal. The steps and at-a-glance rows are
 * managed one by one from the listing; this edits the words around them and the Apply box.
 */
export default function ApplyPageEdit() {
  usePageTitle('Edit Apply Page Text');
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => applyService.getSettings(), []);

  const settings = detail.data;
  /*
   * The route is open to anyone who can see the menu, so a view-only administrator who follows a link
   * here gets an explanation instead of a form whose Save the server would refuse with a 403.
   */
  const canEdit = can('updateApplyPage');
  /* Back, Cancel and Save all return to the Page text tab this form is opened from. */
  const listPath = applyListPath('page');

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Apply Page Management', link: listPath },
          { l: 'Edit page text' },
        ]}
        title="Edit Apply Page Text"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi. The portal link is one link for both."
        back={<BackButton to={listPath} />}
      />

      {canEdit ? (
        <>
          <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

          {settings ? (
            <ApplyPageForm
              initial={toApplySettingsFormValues(settings)}
              backTo={listPath}
              onSave={async (values) => {
                await applyService.updateSettings(values);
                toastOk('Apply page text updated');
                navigate(listPath);
              }}
            />
          ) : null}
        </>
      ) : (
        <Callout tone="warn" title="You cannot change this page. ">
          Your role can view the Apply page text but not edit it. Ask an administrator for the Update permission on Apply Page Management.
        </Callout>
      )}
    </div>
  );
}

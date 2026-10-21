import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { modulesService } from '../services/modulesService';
import { toFormValues, toPayload } from '../validation/modules.validation';
import ModulesForm from './ModulesForm';
import { useModulesTab } from './modulesTabs';

/*
 * Edit the Modules page — a dedicated page, never a modal.
 *
 * The open tab (?tab=) is carried both ways: Cancel and a successful save return to the view page
 * on the same tab, so the person lands on the section they were just working on.
 */
export default function ModulesEdit() {
  usePageTitle('Edit Modules Page');
  const navigate = useNavigate();
  const [tab] = useModulesTab();
  const detail = useApiData(() => modulesService.get(), []);

  /* Read when the save finishes, not when it starts, in case the tab was switched while it ran. */
  const tabNow = useRef(tab);
  useEffect(() => {
    tabNow.current = tab;
  }, [tab]);

  const page = detail.data;
  const viewPage = `/cms/modules?tab=${tab}`;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Modules Page', link: viewPage }, { l: 'Edit' }]}
        title="Edit Modules Page"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <ModulesForm
          initial={toFormValues(page)}
          backTo={viewPage}
          onSave={async (values) => {
            await modulesService.update(toPayload(values));
            toastOk('Modules page updated');
            navigate(`/cms/modules?tab=${tabNow.current}`);
          }}
        />
      ) : null}
    </div>
  );
}

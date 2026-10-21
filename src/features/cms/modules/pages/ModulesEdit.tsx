import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { modulesService } from '../services/modulesService';
import { toFormValues, toPayload } from '../validation/modules.validation';
import ModulesForm from './ModulesForm';

/* Edit the Modules page — a dedicated page, never a modal. */
export default function ModulesEdit() {
  usePageTitle('Edit Modules Page');
  const navigate = useNavigate();
  const detail = useApiData(() => modulesService.get(), []);

  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Modules Page', link: '/cms/modules' }, { l: 'Edit' }]}
        title="Edit Modules Page"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <ModulesForm
          initial={toFormValues(page)}
          backTo="/cms/modules"
          onSave={async (values) => {
            await modulesService.update(toPayload(values));
            toastOk('Modules page updated');
            navigate('/cms/modules');
          }}
        />
      ) : null}
    </div>
  );
}

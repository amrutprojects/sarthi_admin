import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { footerService } from '../services/footerService';
import { toFormValues, toPayload } from '../validation/footer.validation';
import FooterForm from './FooterForm';

/* Edit the site footer — a dedicated page, never a modal. */
export default function FooterEdit() {
  usePageTitle('Edit Footer');
  const navigate = useNavigate();
  const detail = useApiData(() => footerService.get(), []);

  const footer = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Footer', link: '/cms/footer' },
          { l: 'Edit' },
        ]}
        title="Edit Footer"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {footer ? (
        <FooterForm
          initial={toFormValues(footer)}
          backTo="/cms/footer"
          onSave={async (values) => {
            await footerService.update(toPayload(values));
            toastOk('Footer updated');
            navigate('/cms/footer');
          }}
        />
      ) : null}
    </div>
  );
}

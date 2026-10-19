import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { toFormValues, toPayload } from '../validation/contact.validation';
import ContactForm from './ContactForm';

/* Edit Contact page — a dedicated page, never a modal. */
export default function ContactEdit() {
  usePageTitle('Edit Contact Page');
  const navigate = useNavigate();
  const detail = useApiData(() => contactService.get(), []);

  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: '/cms/contact' },
          { l: 'Edit' },
        ]}
        title="Edit Contact Page"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <ContactForm
          initial={toFormValues(page)}
          backTo="/cms/contact"
          onSave={async (values) => {
            await contactService.update(toPayload(values));
            toastOk('Contact page updated');
            navigate('/cms/contact');
          }}
        />
      ) : null}
    </div>
  );
}

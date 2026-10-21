import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { highlightService } from '../services/highlightService';
import HighlightForm, { toFormValues, toPayload } from './HighlightForm';

/* Edit the home page's programme section — a dedicated page, never a modal. */
export default function HighlightEdit() {
  usePageTitle('Edit Home Programme Section');
  const navigate = useNavigate();
  const detail = useApiData(() => highlightService.get(), []);

  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Home Programme Section', link: '/cms/highlight' },
          { l: 'Edit' },
        ]}
        title="Edit Home Programme Section"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <HighlightForm
          initial={toFormValues(page)}
          backTo="/cms/highlight"
          onSave={async (values) => {
            await highlightService.update(toPayload(values));
            toastOk('Programme section updated');
            navigate('/cms/highlight');
          }}
        />
      ) : null}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { homePageCrumbs, homePageTabPath } from '../../homePage/homePageNav';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { highlightService } from '../services/highlightService';
import HighlightForm, { toFormValues, toPayload } from './HighlightForm';

/* Back, Cancel and Save return to the section's tab of Home Page Management. */
const BACK_TO = homePageTabPath('diploma');

/* Edit the home page's programme section — a dedicated page, never a modal. */
export default function HighlightEdit() {
  usePageTitle('Edit Home Programme Section');
  const navigate = useNavigate();
  const detail = useApiData(() => highlightService.get(), []);

  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...homePageCrumbs('diploma'), { l: 'Edit' }]}
        title="Edit Home Programme Section"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
        back={<BackButton to={BACK_TO} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <HighlightForm
          initial={toFormValues(page)}
          backTo={BACK_TO}
          onSave={async (values) => {
            await highlightService.update(toPayload(values));
            toastOk('Programme section updated');
            navigate(BACK_TO);
          }}
        />
      ) : null}
    </div>
  );
}

import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { homePageCrumbs, homePageTabPath } from '../../homePage/homePageNav';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { heroTabOf } from '../constants';
import { heroService } from '../services/heroService';
import { toFormValues, toPayload } from '../validation/hero.validation';
import HeroForm from './HeroForm';

/*
 * Edit the home page's rotating banner and its "Programme at a glance" card — a dedicated page, never a modal.
 * Opened from either of the section's tabs of Home Page Management; Back, Cancel and Save return to that tab.
 */
export default function HeroEdit() {
  usePageTitle('Edit Home Hero Section');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const detail = useApiData(() => heroService.get(), []);

  const hero = detail.data;
  const tab = heroTabOf(params.get('tab'));
  const backTo = homePageTabPath(tab);

  return (
    <div className="page">
      <PageHead
        crumbs={[...homePageCrumbs(tab), { l: 'Edit' }]}
        title="Edit Home Hero Section"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
        back={<BackButton to={backTo} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {hero ? (
        <HeroForm
          initial={toFormValues(hero)}
          glance={hero.glance}
          backTo={backTo}
          onSave={async (values) => {
            /* The version this form was opened with: a 409 means someone else saved in the meantime. */
            await heroService.update(toPayload(values, hero.updatedAt));
            toastOk('Home hero section updated');
            navigate(backTo);
          }}
        />
      ) : null}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { heroService } from '../services/heroService';
import { toFormValues, toPayload } from '../validation/hero.validation';
import HeroForm from './HeroForm';

/* Edit the home page's rotating banner and its "Programme at a glance" card — a dedicated page, never a modal. */
export default function HeroEdit() {
  usePageTitle('Edit Home Hero Section');
  const navigate = useNavigate();
  const detail = useApiData(() => heroService.get(), []);

  const hero = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Home Hero Section', link: '/cms/hero' }, { l: 'Edit' }]}
        title="Edit Home Hero Section"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {hero ? (
        <HeroForm
          initial={toFormValues(hero)}
          glance={hero.glance}
          backTo="/cms/hero"
          onSave={async (values) => {
            /* The version this form was opened with: a 409 means someone else saved in the meantime. */
            await heroService.update(toPayload(values, hero.updatedAt));
            toastOk('Home hero section updated');
            navigate('/cms/hero');
          }}
        />
      ) : null}
    </div>
  );
}

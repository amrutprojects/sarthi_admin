import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreService } from '../services/centreService';
import { emptyCentreForm } from '../validation/centre.validation';
import CentreForm from './CentreForm';

/* Add Center — a dedicated page. ?stateId= / ?districtId= preselect the cascade when opened from a filtered listing. */
export default function CentreCreate() {
  usePageTitle('Add Center');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Center Master', link: '/cms/centres' }, { l: 'Add Center' }]}
        title="Add Center"
        sub="A center is located in one district (the taluka is optional) and offers one or more technologies."
        back={<BackButton to="/cms/centres" />}
      />
      <CentreForm
        initial={emptyCentreForm(params.get('stateId') ?? '', params.get('districtId') ?? '')}
        submitLabel="Create center"
        backTo="/cms/centres"
        onSave={async (values) => {
          const created = await centreService.create(values);
          toastOk('Center created');
          navigate(`/cms/centres/${created.id}`);
        }}
      />
    </div>
  );
}

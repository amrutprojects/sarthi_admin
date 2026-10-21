import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreLocationService } from '../services/centreLocationService';
import { emptyCentreLocationForm } from '../validation/centreLocation.validation';
import CentreLocationForm from './CentreLocationForm';

/* Add Location Information — a dedicated page. ?centreId= preselects the centre (from a filter or a centre view). */
export default function CentreLocationCreate() {
  usePageTitle('Add Location Information');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Location Information', link: '/cms/centre-locations' },
          { l: 'Add Location Information' },
        ]}
        title="Add Location Information"
        sub="Address, map link and accessibility of a training centre. Each centre has one location record."
        back={<BackButton to="/cms/centre-locations" />}
      />
      <CentreLocationForm
        initial={emptyCentreLocationForm(params.get('centreId') ?? '')}
        submitLabel="Create location record"
        backTo="/cms/centre-locations"
        onSave={async (values) => {
          const created = await centreLocationService.create(values);
          toastOk('Location information created');
          navigate(`/cms/centre-locations/${created.id}`);
        }}
      />
    </div>
  );
}

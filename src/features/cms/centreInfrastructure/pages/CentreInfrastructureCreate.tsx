import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreInfrastructureService } from '../services/centreInfrastructureService';
import { emptyCentreInfrastructureForm } from '../validation/centreInfrastructure.validation';
import CentreInfrastructureForm from './CentreInfrastructureForm';

/* Add Capacity & Infrastructure — a dedicated page. ?centreId= preselects the centre (from a filter or a centre view). */
export default function CentreInfrastructureCreate() {
  usePageTitle('Add Capacity & Infrastructure');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Capacity & Infrastructure', link: '/cms/centre-infrastructure' },
          { l: 'Add Capacity & Infrastructure' },
        ]}
        title="Add Capacity & Infrastructure"
        sub="Seating, rooms, connectivity, amenities and the facilities checklist of a training centre. Each centre has one record."
        back={<BackButton to="/cms/centre-infrastructure" />}
      />
      <CentreInfrastructureForm
        initial={emptyCentreInfrastructureForm(params.get('centreId') ?? '')}
        submitLabel="Create record"
        backTo="/cms/centre-infrastructure"
        onSave={async (values) => {
          const created = await centreInfrastructureService.create(values);
          toastOk('Capacity & infrastructure details created');
          navigate(`/cms/centre-infrastructure/${created.id}`);
        }}
      />
    </div>
  );
}

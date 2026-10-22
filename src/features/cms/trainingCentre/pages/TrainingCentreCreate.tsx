import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';
import { emptyTrainingCentreForm } from '../validation/trainingCentre.validation';
import TrainingCentreForm from './TrainingCentreForm';

/*
 * Add Training Centre — a dedicated page, reached from the Add button on the listing. ?centreTypeId=,
 * ?stateId= and ?districtId= preselect the parents when it is opened from a filtered listing.
 */
export default function TrainingCentreCreate() {
  usePageTitle('Add Training Centre');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Training Centre Master', link: '/cms/training-centres' }, { l: 'Add Training Centre' }]}
        title="Add Training Centre"
        sub="Sections A and B of the centre profile. Location and capacity are recorded in their own masters once the centre exists."
        back={<BackButton to="/cms/training-centres" />}
      />
      <TrainingCentreForm
        initial={emptyTrainingCentreForm({
          centreTypeId: params.get('centreTypeId') ?? '',
          stateId: params.get('stateId') ?? '',
          districtId: params.get('districtId') ?? '',
        })}
        submitLabel="Create training centre"
        backTo="/cms/training-centres"
        onSave={async (values) => {
          const created = await trainingCentreService.create(values);
          toastOk(values.code ? 'Training centre created' : `Training centre created with code ${created.code}`);
          navigate(`/cms/training-centres/${created.id}`);
        }}
      />
    </div>
  );
}

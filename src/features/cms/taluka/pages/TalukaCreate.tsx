import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { talukaService } from '../services/talukaService';
import { emptyTalukaForm } from '../validation/taluka.validation';
import TalukaForm from './TalukaForm';

/* Add Taluka — a dedicated page. ?stateId= / ?districtId= preselect the cascade when linked into. */
export default function TalukaCreate() {
  usePageTitle('Add Taluka');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Taluka Master', link: '/cms/talukas' }, { l: 'Add Taluka' }]}
        title="Add Taluka"
        sub="Choose a state, then one of its districts. The taluka is stored against the district."
      />
      <TalukaForm
        initial={emptyTalukaForm(params.get('stateId') ?? '', params.get('districtId') ?? '')}
        submitLabel="Create taluka"
        backTo="/cms/talukas"
        onSave={async (values) => {
          const created = await talukaService.create(values);
          toastOk('Taluka created');
          navigate(`/cms/talukas/${created.id}`);
        }}
      />
    </div>
  );
}

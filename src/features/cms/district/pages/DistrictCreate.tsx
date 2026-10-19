import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { districtService } from '../services/districtService';
import { emptyDistrictForm } from '../validation/district.validation';
import DistrictForm from './DistrictForm';

/* Add District — a dedicated page. ?stateId= preselects the state when opened from a state filter. */
export default function DistrictCreate() {
  usePageTitle('Add District');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'District Master', link: '/cms/districts' }, { l: 'Add District' }]}
        title="Add District"
        sub="A district always belongs to one state, and its name and code must be unique within it."
      />
      <DistrictForm
        initial={emptyDistrictForm(params.get('stateId') ?? '')}
        submitLabel="Create district"
        backTo="/cms/districts"
        onSave={async (values) => {
          const created = await districtService.create(values);
          toastOk('District created');
          navigate(`/cms/districts/${created.id}`);
        }}
      />
    </div>
  );
}

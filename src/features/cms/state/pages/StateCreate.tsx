import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { stateService } from '../services/stateService';
import StateForm from './StateForm';

/* Add State — a dedicated page, reached from the Add State button on the listing. */
export default function StateCreate() {
  usePageTitle('Add State');
  const navigate = useNavigate();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'State Master', link: '/cms/states' }, { l: 'Add State' }]}
        title="Add State"
        sub="Creates a state that the District master and the public website forms can then use."
        back={<BackButton to="/cms/states" />}
      />
      <StateForm
        submitLabel="Create state"
        backTo="/cms/states"
        onSave={async (values) => {
          const created = await stateService.create(values);
          toastOk('State created');
          navigate(`/cms/states/${created.id}`);
        }}
      />
    </div>
  );
}

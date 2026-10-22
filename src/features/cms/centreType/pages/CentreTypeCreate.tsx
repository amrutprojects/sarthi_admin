import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreTypeService } from '../services/centreTypeService';
import CentreTypeForm from './CentreTypeForm';

/* Add Training Centre Type — a dedicated page, reached from the Add Centre Type button on the listing. */
export default function CentreTypeCreate() {
  usePageTitle('Add Training Centre Type');
  const navigate = useNavigate();

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Training Centre Type Master', link: '/cms/centre-types' },
          { l: 'Add Centre Type' },
        ]}
        title="Add Training Centre Type"
        sub="Creates an ownership type that training centres can then be classified under."
        back={<BackButton to="/cms/centre-types" />}
      />
      <CentreTypeForm
        submitLabel="Create centre type"
        backTo="/cms/centre-types"
        onSave={async (values) => {
          const created = await centreTypeService.create(values);
          toastOk('Training centre type created');
          navigate(`/cms/centre-types/${created.id}`);
        }}
      />
    </div>
  );
}

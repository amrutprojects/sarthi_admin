import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';
import { contactListPath } from '../types/contact.types';
import { centrePath } from '../types/trainingCentre.types';
import TrainingCentreForm from './TrainingCentreForm';

/* Add training centre — a dedicated page, reached from Add training centre on the Training centres tab. */
export default function TrainingCentreCreate() {
  usePageTitle('Add Training Centre');
  const navigate = useNavigate();
  const listPath = contactListPath('centres');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page', link: listPath }, { l: 'Add training centre' }]}
        title="Add Training Centre"
        sub="Adds a centre to the Approved training centres card on its district's page. A field left blank is not shown on the website."
        back={<BackButton to={listPath} />}
      />
      <TrainingCentreForm
        submitLabel="Create training centre"
        backTo={listPath}
        onSave={async (values) => {
          const created = await trainingCentreService.create(values);
          toastOk('Training centre created');
          navigate(centrePath(created.id));
        }}
      />
    </div>
  );
}

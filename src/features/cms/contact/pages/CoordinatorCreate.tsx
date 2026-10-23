import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { contactListPath } from '../types/contact.types';
import CoordinatorForm from './CoordinatorForm';

/* Add coordinator — a dedicated page, reached from Add coordinator on the District / cluster coordinators tab. */
export default function CoordinatorCreate() {
  usePageTitle('Add Coordinator');
  const navigate = useNavigate();
  const listPath = contactListPath('coordinators');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page', link: listPath }, { l: 'Add coordinator' }]}
        title="Add Coordinator"
        sub="Adds a district / cluster coordinator card to the public Contact page. Each district it covers links to its own District Office page."
        back={<BackButton to={listPath} />}
      />
      <CoordinatorForm
        submitLabel="Create coordinator"
        backTo={listPath}
        onSave={async (values) => {
          const created = await contactService.createCoordinator(values);
          toastOk('Coordinator created');
          navigate(`/cms/contact/coordinators/${created.id}`);
        }}
      />
    </div>
  );
}

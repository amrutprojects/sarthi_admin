import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { contactListPath } from '../types/contact.types';
import DistrictOfficeForm from './DistrictOfficeForm';

/* Add district office — a dedicated page, reached from Add district office on the District offices tab. */
export default function DistrictOfficeCreate() {
  usePageTitle('Add District Office');
  const navigate = useNavigate();
  const listPath = contactListPath('offices');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page', link: listPath }, { l: 'Add district office' }]}
        title="Add District Office"
        sub="Adds the Collectorate details shown on one district's page. Any field left blank reads “to be supplied from official records” on the website."
        back={<BackButton to={listPath} />}
      />
      <DistrictOfficeForm
        submitLabel="Create district office"
        backTo={listPath}
        onSave={async (values) => {
          const created = await contactService.createDistrictOffice(values);
          toastOk('District office created');
          navigate(`/cms/contact/offices/${created.id}`);
        }}
      />
    </div>
  );
}

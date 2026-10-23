import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { contactListPath } from '../types/contact.types';
import { toOfficeFormValues } from '../validation/contact.validation';
import DistrictOfficeForm from './DistrictOfficeForm';

/* Edit district office — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function DistrictOfficeEdit() {
  usePageTitle('Edit District Office');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => contactService.getDistrictOffice(id), [id]);
  const { busy, run } = useAction();

  const office = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: contactListPath('offices') },
          ...(office ? [{ l: office.district.name, link: `/cms/contact/offices/${office.id}` }] : []),
          { l: 'Edit' },
        ]}
        title="Edit District Office"
        sub="Changes appear on the district's page on the public website as soon as they are saved."
        back={<BackButton to={office ? `/cms/contact/offices/${office.id}` : contactListPath('offices')} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {office ? (
        <DistrictOfficeForm
          initial={toOfficeFormValues(office)}
          officeId={office.id}
          savedDistrict={office.district}
          submitLabel="Save changes"
          confirmMessage={`Are you sure you want to save the changes to the ${office.district.name} district office?`}
          backTo={`/cms/contact/offices/${office.id}`}
          onSave={async (values) => {
            await contactService.updateDistrictOffice(office.id, {
              districtId: values.districtId,
              collectorName: values.collectorName,
              address: values.address,
              phone: values.phone,
              email: values.email,
              officeHours: values.officeHours,
            });
            toastOk('District office updated');
            navigate(`/cms/contact/offices/${office.id}`);
          }}
          statusSlot={
            <MasterField
              id="of-status-current"
              label="Show on website"
              hint="An inactive entry is kept here but not shown on the district's page."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={office.isActive} />
                <Can action="updateContactPage">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => contactService.setDistrictOfficeStatus(office.id, !office.isActive),
                        office.isActive ? 'District office deactivated' : 'District office activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {office.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}
    </div>
  );
}

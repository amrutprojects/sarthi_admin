import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';
import { contactListPath } from '../types/contact.types';
import { centrePath } from '../types/trainingCentre.types';
import { toCentreFormValues } from '../validation/trainingCentre.validation';
import TrainingCentreForm from './TrainingCentreForm';

/* Edit training centre — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function TrainingCentreEdit() {
  usePageTitle('Edit Training Centre');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => trainingCentreService.get(id), [id]);
  const { busy, run } = useAction();

  const centre = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: contactListPath('centres') },
          ...(centre ? [{ l: centre.name.en, link: centrePath(centre.id) }] : []),
          { l: 'Edit' },
        ]}
        title="Edit Training Centre"
        sub="Changes appear on the district's page on the public website as soon as they are saved."
        back={<BackButton to={centre ? centrePath(centre.id) : contactListPath('centres')} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centre ? (
        <TrainingCentreForm
          initial={toCentreFormValues(centre)}
          savedDistrict={centre.district}
          orderRequired
          submitLabel="Save changes"
          confirmMessage={`Are you sure you want to save the changes to ${centre.name.en}?`}
          backTo={centrePath(centre.id)}
          onSave={async (values) => {
            await trainingCentreService.update(centre.id, {
              districtId: values.districtId,
              name: values.name,
              address: values.address,
              managerName: values.managerName,
              phone: values.phone,
              email: values.email,
              ...(values.displayOrder === undefined ? {} : { displayOrder: values.displayOrder }),
            });
            toastOk('Training centre updated');
            navigate(centrePath(centre.id));
          }}
          statusSlot={
            <MasterField id="tc-status-current" label="Show on website" hint="An inactive centre is kept here but not shown on the district's page.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={centre.isActive} />
                <Can action="updateContactPage">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => trainingCentreService.setStatus(centre.id, !centre.isActive),
                        centre.isActive ? 'Training centre deactivated' : 'Training centre activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {centre.isActive ? 'Deactivate' : 'Activate'}
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

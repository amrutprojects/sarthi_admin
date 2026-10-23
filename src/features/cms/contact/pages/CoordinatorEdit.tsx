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
import { toCoordinatorFormValues } from '../validation/contact.validation';
import CoordinatorForm from './CoordinatorForm';

/* Edit coordinator — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function CoordinatorEdit() {
  usePageTitle('Edit Coordinator');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => contactService.getCoordinator(id), [id]);
  const { busy, run } = useAction();

  const coordinator = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: contactListPath('coordinators') },
          ...(coordinator ? [{ l: coordinator.name, link: `/cms/contact/coordinators/${coordinator.id}` }] : []),
          { l: 'Edit' },
        ]}
        title="Edit Coordinator"
        sub="Changes appear on the public Contact page as soon as they are saved."
        back={<BackButton to={coordinator ? `/cms/contact/coordinators/${coordinator.id}` : contactListPath('coordinators')} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {coordinator ? (
        <CoordinatorForm
          initial={toCoordinatorFormValues(coordinator)}
          coordinatorId={coordinator.id}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this coordinator?"
          backTo={`/cms/contact/coordinators/${coordinator.id}`}
          onSave={async (values) => {
            await contactService.updateCoordinator(coordinator.id, {
              name: values.name,
              phone: values.phone,
              email: values.email,
              districtIds: values.districtIds,
              displayOrder: values.displayOrder,
            });
            toastOk('Coordinator updated');
            navigate(`/cms/contact/coordinators/${coordinator.id}`);
          }}
          statusSlot={
            <MasterField
              id="co-status-current"
              label="Show on website"
              hint="An inactive coordinator is kept here but not shown on the public Contact page."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={coordinator.isActive} />
                <Can action="updateContactPage">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => contactService.setCoordinatorStatus(coordinator.id, !coordinator.isActive),
                        coordinator.isActive ? 'Coordinator deactivated' : 'Coordinator activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {coordinator.isActive ? 'Deactivate' : 'Activate'}
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

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { lmsEntityService } from '../services/entityService';
import { lmsEntityFormFrom } from '../validation/entity.validation';
import LmsEntityForm from './LmsEntityForm';

const LIST = '/lms/entities';

/* Edit Entity — a dedicated page. Status is not part of the form: it has its own endpoint (toggle with confirmation). */
export default function LmsEntityEdit() {
  usePageTitle('Edit Entity');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => lmsEntityService.get(id), [id]);
  const options = useApiData(() => lmsEntityService.formOptions(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const entity = detail.data;
  const formOptions = options.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Entity Master', link: LIST },
          ...(entity ? [{ l: entity.name, link: `${LIST}/${entity.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={entity ? `Edit ${entity.name}` : 'Edit Entity'}
        sub="Identity, defaults and the centres and tracks this entity delivers."
        back={<BackButton to={entity ? `${LIST}/${entity.id}` : LIST} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {entity ? <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} /> : null}

      {entity && formOptions ? (
        <LmsEntityForm
          initial={lmsEntityFormFrom(entity)}
          formOptions={formOptions}
          savedCentres={entity.enabledCentres}
          savedTracks={entity.enabledTracks}
          codeLocked={entity.related?.codeLocked ?? false}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this entity?"
          backTo={`${LIST}/${entity.id}`}
          onSave={async (values) => {
            await lmsEntityService.update(entity.id, {
              name: values.name,
              ...(entity.related?.codeLocked ? {} : { code: values.code }),
              description: values.description,
              defaultLanguage: values.defaultLanguage,
              timeZone: values.timeZone,
              centreIds: values.centreIds,
              trackIds: values.trackIds,
            });
            toastOk('Entity updated');
            navigate(`${LIST}/${entity.id}`);
          }}
          statusSlot={
            <MasterField id="le-status-current" label="Status" hint="An inactive entity is kept but no longer offered to the other LMS masters.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={entity.isActive} />
                <Can action="updateLmsEntity">
                  <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                    {entity.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}

      {confirming && entity ? (
        <ConfirmModal
          title={entity.isActive ? 'Deactivate entity' : 'Activate entity'}
          busy={busy}
          confirmLabel={entity.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${entity.isActive ? 'deactivate' : 'activate'} the entity ${entity.name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => lmsEntityService.setStatus(entity.id, !entity.isActive), entity.isActive ? 'Entity deactivated' : 'Entity activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

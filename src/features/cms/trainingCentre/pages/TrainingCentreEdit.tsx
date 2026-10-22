import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';
import TrainingCentreForm from './TrainingCentreForm';

/*
 * Edit Training Centre — a dedicated page. Status is not part of the form: it has its own endpoint.
 *
 * The cascade starts on the saved state, district and taluka. Changing the state clears the district and
 * changing the district clears the taluka, so the centre can never point at a taluka of another district.
 */
export default function TrainingCentreEdit() {
  usePageTitle('Edit Training Centre');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => trainingCentreService.get(id), [id]);
  const { busy, run } = useAction();

  const centre = detail.data;
  const batchCount = centre?.related?.batchCount ?? 0;
  const codeLocked = batchCount > 0;

  /* Saved parents that have been deactivated since: still shown, but worth flagging. */
  const inactiveParents = centre
    ? [
        centre.centreTypeId && centre.centreTypeIsActive === false ? `the centre type ${centre.centreTypeName}` : null,
        centre.stateIsActive ? null : `the state ${centre.stateName}`,
        centre.districtIsActive ? null : `the district ${centre.districtName}`,
        centre.talukaId && centre.talukaIsActive === false ? `the taluka ${centre.talukaName}` : null,
      ].filter((s): s is string => !!s)
    : [];

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Training Centre Master', link: '/cms/training-centres' },
          ...(centre ? [{ l: centre.name, link: `/cms/training-centres/${centre.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={centre ? `Edit ${centre.name}` : 'Edit Training Centre'}
        badge={centre ? <span className="tag">{centre.code}</span> : undefined}
        sub="Changing the district re-checks the name against the centres of the new district and clears the taluka."
        back={<BackButton to={centre ? `/cms/training-centres/${centre.id}` : '/cms/training-centres'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centre ? (
        <>
          {inactiveParents.length ? (
            <div className="mb14">
              <Callout tone="warn" title="A saved selection is inactive">
                This centre uses {inactiveParents.join(' and ')}, {inactiveParents.length > 1 ? 'which have' : 'which has'} since been
                deactivated. The saved value stays selected and the centre can still be saved, but it is no longer offered for new
                records. Choose an active one, or reactivate it in its master.
              </Callout>
            </div>
          ) : null}

          <TrainingCentreForm
            initial={{
              name: centre.name,
              code: centre.code,
              centreTypeId: centre.centreTypeId ?? '',
              stateId: centre.stateId,
              districtId: centre.districtId,
              talukaId: centre.talukaId ?? '',
              contactNumber: centre.contactNumber ?? '',
              email: centre.email ?? '',
              pocName: centre.pocName ?? '',
              pocMobile: centre.pocMobile ?? '',
              centreHead: centre.centreHead ?? '',
              alternativeContact: centre.alternativeContact ?? '',
              coordinator1: centre.coordinator1 ?? '',
              coordinator2: centre.coordinator2 ?? '',
              isActive: centre.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this training centre?"
            backTo={`/cms/training-centres/${centre.id}`}
            currentCentreType={savedOption(centre.centreTypeId, centre.centreTypeName, centre.centreTypeCode, centre.centreTypeIsActive !== false)}
            currentState={savedOption(centre.stateId, centre.stateName, centre.stateCode, centre.stateIsActive)}
            currentDistrict={savedOption(centre.districtId, centre.districtName, centre.districtCode, centre.districtIsActive)}
            currentTaluka={savedOption(centre.talukaId, centre.talukaName, centre.talukaCode, centre.talukaIsActive !== false)}
            codeRequired
            codeLockedReason={
              codeLocked
                ? `Locked: ${batchCount === 1 ? '1 batch uses' : `${batchCount} batches use`} this centre, and batch codes are built from the centre code.`
                : undefined
            }
            onSave={async (values) => {
              await trainingCentreService.update(centre.id, {
                stateId: values.stateId,
                districtId: values.districtId,
                name: values.name,
                /* A locked code is not sent at all, so the request can never trip the batch rule. */
                ...(codeLocked || !values.code ? {} : { code: values.code }),
                centreTypeId: values.centreTypeId,
                talukaId: values.talukaId,
                contactNumber: values.contactNumber,
                email: values.email,
                pocName: values.pocName,
                pocMobile: values.pocMobile,
                centreHead: values.centreHead,
                alternativeContact: values.alternativeContact,
                coordinator1: values.coordinator1,
                coordinator2: values.coordinator2,
              });
              toastOk('Training centre updated');
              navigate(`/cms/training-centres/${centre.id}`);
            }}
            statusSlot={
              <MasterField
                id="tc-status-current"
                label="Status"
                hint="Deactivating keeps the record and its related records but stops offering the centre in any form."
              >
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={centre.isActive} />
                  <Can action="updateTrainingCentre">
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
        </>
      ) : null}
    </div>
  );
}

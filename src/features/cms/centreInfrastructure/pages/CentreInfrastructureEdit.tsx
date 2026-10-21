import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreInfrastructureService } from '../services/centreInfrastructureService';
import { facilityRows, triFromApi } from '../validation/centreInfrastructure.validation';
import CentreInfrastructureForm from './CentreInfrastructureForm';

const numText = (n: number | null) => (n === null ? '' : String(n));

/* Edit Capacity & Infrastructure — a dedicated page. The centre is fixed; status has its own endpoint. */
export default function CentreInfrastructureEdit() {
  usePageTitle('Edit Capacity & Infrastructure');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => centreInfrastructureService.get(id), [id]);
  const { busy, run } = useAction();

  const record = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Capacity & Infrastructure', link: '/cms/centre-infrastructure' },
          ...(record ? [{ l: record.centreName, link: `/cms/centre-infrastructure/${record.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={record ? `Edit capacity & infrastructure of ${record.centreName}` : 'Edit Capacity & Infrastructure'}
        sub="Correct the capacity, connectivity, amenities or facilities checklist of the centre."
        back={<BackButton to={record ? `/cms/centre-infrastructure/${record.id}` : '/cms/centre-infrastructure'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {record ? (
        <>
          {!record.centreIsActive ? (
            <div className="mb14">
              <Callout tone="warn" title="The training centre of this record is inactive">
                {record.centreName} has been deactivated. These details can still be corrected, but the centre is not offered
                anywhere until it is reactivated in the Training Centre Master.
              </Callout>
            </div>
          ) : null}

          <CentreInfrastructureForm
            initial={{
              centreId: record.centreId,
              maxSeatingCapacity: String(record.maxSeatingCapacity),
              numberOfFloors: numText(record.numberOfFloors),
              trainingRooms: numText(record.trainingRooms),
              computerSystems: numText(record.computerSystems),
              internetType: record.internetType ?? '',
              internetSpeed: record.internetSpeed ?? '',
              hasLift: triFromApi(record.hasLift),
              hasAc: triFromApi(record.hasAc),
              hasWashroom: triFromApi(record.hasWashroom),
              hasDrinkingWater: triFromApi(record.hasDrinkingWater),
              powerBackup: record.powerBackup ?? '',
              facilities: facilityRows(record.facilities),
              isActive: record.isActive,
            }}
            fixedCentre={{ name: record.centreName, code: record.centreCode, isActive: record.centreIsActive }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to these capacity & infrastructure details?"
            backTo={`/cms/centre-infrastructure/${record.id}`}
            onSave={async ({ centreId: _centreId, isActive: _isActive, ...changes }) => {
              await centreInfrastructureService.update(record.id, changes);
              toastOk('Capacity & infrastructure details updated');
              navigate(`/cms/centre-infrastructure/${record.id}`);
            }}
            statusSlot={
              <MasterField id="ci-status-current" label="Status" hint="Deactivating keeps the record but marks the details as not in use.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={record.isActive} />
                  <Can action="updateCentreInfrastructure">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => centreInfrastructureService.setStatus(record.id, !record.isActive),
                          record.isActive ? 'Capacity & infrastructure details deactivated' : 'Capacity & infrastructure details activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {record.isActive ? 'Deactivate' : 'Activate'}
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

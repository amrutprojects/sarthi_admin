import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreLocationService } from '../services/centreLocationService';
import CentreLocationForm from './CentreLocationForm';

/* Edit Location Information — a dedicated page. The centre is fixed; status has its own endpoint. */
export default function CentreLocationEdit() {
  usePageTitle('Edit Location Information');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => centreLocationService.get(id), [id]);
  const { busy, run } = useAction();

  const location = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Location Information', link: '/cms/centre-locations' },
          ...(location ? [{ l: location.centreName, link: `/cms/centre-locations/${location.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={location ? `Edit location of ${location.centreName}` : 'Edit Location Information'}
        sub="Correct the address, map link or accessibility details of the centre."
        back={<BackButton to={location ? `/cms/centre-locations/${location.id}` : '/cms/centre-locations'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {location ? (
        <>
          {!location.centreIsActive ? (
            <div className="mb14">
              <Callout tone="warn" title="The training centre of this record is inactive">
                {location.centreName} has been deactivated. These details can still be corrected, but the centre is not offered
                anywhere until it is reactivated in the Training Centre Master.
              </Callout>
            </div>
          ) : null}

          <CentreLocationForm
            initial={{
              centreId: location.centreId,
              address: location.address,
              pinCode: location.pinCode ?? '',
              locationUrl: location.locationUrl ?? '',
              nearestLandmark: location.nearestLandmark ?? '',
              nearestStation: location.nearestStation ?? '',
              publicTransport: location.publicTransport ?? '',
              parking: location.parking ?? '',
              remarks: location.remarks ?? '',
              isActive: location.isActive,
            }}
            fixedCentre={{ name: location.centreName, code: location.centreCode, isActive: location.centreIsActive }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this location information?"
            backTo={`/cms/centre-locations/${location.id}`}
            onSave={async ({ centreId: _centreId, isActive: _isActive, ...changes }) => {
              await centreLocationService.update(location.id, changes);
              toastOk('Location information updated');
              navigate(`/cms/centre-locations/${location.id}`);
            }}
            statusSlot={
              <MasterField id="cl-status-current" label="Status" hint="Deactivating keeps the record but marks the details as not in use.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={location.isActive} />
                  <Can action="updateCentreLocation">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => centreLocationService.setStatus(location.id, !location.isActive),
                          location.isActive ? 'Location information deactivated' : 'Location information activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {location.isActive ? 'Deactivate' : 'Activate'}
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

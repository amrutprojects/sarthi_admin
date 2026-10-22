import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreLocationService } from '../services/centreLocationService';
import { PARKING_LABELS } from '../types/centreLocation.types';

/* View Location Information — read-only detail page, titled with the training centre it belongs to. */
export default function CentreLocationView() {
  usePageTitle('Location Information');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => centreLocationService.get(id), [id]);
  const { busy, run } = useAction();

  const location = detail.data;
  const dash = (v: string | null) => v ?? '—';

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Location Information', link: '/cms/centre-locations' },
          { l: location ? location.centreName : 'Location Information' },
        ]}
        title={location ? location.centreName : 'Location Information'}
        badge={location ? <span className="tag">{location.centreCode}</span> : undefined}
        sub="Location information"
        back={<BackButton to="/cms/centre-locations" />}
        actions={
          <div className="f ac gp8 wrap">
            {location ? (
              <>
                <Can action="updateCentreLocation">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateCentreLocation">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/centre-locations/${location.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {location ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Address</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  [
                    'Training centre',
                    <>
                      {location.centreName} ({location.centreCode})
                      {location.centreIsActive ? null : <span className="muted"> (inactive)</span>}
                    </>,
                  ],
                  ['Address', location.address],
                  ['PIN code', <span className="mono">{dash(location.pinCode)}</span>],
                  [
                    'Google Maps / location URL',
                    location.locationUrl ? (
                      <a className="lnk" href={location.locationUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                        {location.locationUrl}
                      </a>
                    ) : (
                      '—'
                    ),
                  ],
                  ['Status', <MasterStatusBadge isActive={location.isActive} />],
                  ['Created', fmtDateTime(location.createdAt)],
                  ['Last updated', fmtDateTime(location.updatedAt)],
                ]}
              />
              <div className="f gp8 wrap mt10">
                <Can action="viewTrainingCentres">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/training-centres/${location.centreId}`)}>View training centre</button>
                </Can>
                <Can action="viewCentreInfrastructure">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/centre-infrastructure?centreId=${location.centreId}`)}>
                    Capacity &amp; infrastructure of this centre
                  </button>
                </Can>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Location &amp; accessibility</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Nearest landmark', dash(location.nearestLandmark)],
                  ['Nearest railway station / bus stand', dash(location.nearestStation)],
                  ['Public transport availability', dash(location.publicTransport)],
                  ['Parking', location.parking ? PARKING_LABELS[location.parking] : '—'],
                  ['Remarks', dash(location.remarks)],
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { Badge, KvList, PageHead, fmt, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreInfrastructureService } from '../services/centreInfrastructureService';
import {
  FACILITY_AVAILABILITY_LABELS, FACILITY_CODES, FACILITY_LABELS, type FacilityAvailability,
} from '../types/centreInfrastructure.types';

const AVAILABILITY_TONE: Record<FacilityAvailability, string> = { YES: 'green', NO: 'red', TBC: 'amber' };

const dash = (v: string | null) => v ?? '—';
const num = (n: number | null) => (n === null ? '—' : fmt(n));
const yesNo = (v: boolean | null) => (v === null ? '—' : v ? 'Yes' : 'No');

/* View Capacity & Infrastructure — read-only detail page, titled with the training centre it belongs to. */
export default function CentreInfrastructureView() {
  usePageTitle('Capacity & Infrastructure');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => centreInfrastructureService.get(id), [id]);
  const { busy, run } = useAction();

  const record = detail.data;
  const entries = record ? FACILITY_CODES.map((code) => ({ code, entry: record.facilities[code] })) : [];
  const tally = (a: FacilityAvailability) => entries.filter((e) => e.entry?.availability === a).length;
  const notRecorded = entries.filter((e) => !e.entry).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Capacity & Infrastructure', link: '/cms/centre-infrastructure' },
          { l: record ? record.centreName : 'Capacity & Infrastructure' },
        ]}
        title={record ? record.centreName : 'Capacity & Infrastructure'}
        badge={record ? <span className="tag">{record.centreCode}</span> : undefined}
        sub="Capacity & infrastructure"
        back={<BackButton to="/cms/centre-infrastructure" />}
        actions={
          <div className="f ac gp8 wrap">
            {record ? (
              <>
                <Can action="updateCentreInfrastructure">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateCentreInfrastructure">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/centre-infrastructure/${record.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {record ? (
        <>
          <div className="grid g2 mb14">
            <div className="card">
              <div className="card-h"><h3>Capacity</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    [
                      'Training centre',
                      <>
                        {record.centreName} ({record.centreCode})
                        {record.centreIsActive ? null : <span className="muted"> (inactive)</span>}
                      </>,
                    ],
                    ['Maximum seating capacity', fmt(record.maxSeatingCapacity)],
                    ['Number of floors', num(record.numberOfFloors)],
                    ['Training rooms', num(record.trainingRooms)],
                    ['Computer systems', num(record.computerSystems)],
                    ['Status', <MasterStatusBadge isActive={record.isActive} />],
                    ['Created', fmtDateTime(record.createdAt)],
                    ['Last updated', fmtDateTime(record.updatedAt)],
                  ]}
                />
                <div className="f gp8 wrap mt10">
                  <Can action="viewTrainingCentres">
                    <button type="button" className="btn sm" onClick={() => go(`/cms/training-centres/${record.centreId}`)}>View training centre</button>
                  </Can>
                  <Can action="viewCentreLocations">
                    <button type="button" className="btn sm" onClick={() => go(`/cms/centre-locations?centreId=${record.centreId}`)}>
                      Location information of this centre
                    </button>
                  </Can>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Connectivity &amp; amenities</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Internet type', dash(record.internetType)],
                    ['Internet speed', dash(record.internetSpeed)],
                    ['Lift', yesNo(record.hasLift)],
                    ['Air conditioning', yesNo(record.hasAc)],
                    ['Washroom', yesNo(record.hasWashroom)],
                    ['Drinking water', yesNo(record.hasDrinkingWater)],
                    ['Power backup (UPS / generator / inverter, capacity)', dash(record.powerBackup)],
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>
                Facilities <span className="sub">{tally('YES')} of {FACILITY_CODES.length} facilities available</span>
              </h3>
            </div>
            <div className="card-b">
              <div className="hint mb14">
                {tally('NO')} not available · {tally('TBC')} to be confirmed · {notRecorded} not recorded
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '34%' }}>Facility</th>
                      <th style={{ width: 190 }}>Availability</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(({ code, entry }) => (
                      <tr key={code} className="norow">
                        <td>{FACILITY_LABELS[code]}</td>
                        <td>
                          {entry ? (
                            <Badge tone={AVAILABILITY_TONE[entry.availability]}>{FACILITY_AVAILABILITY_LABELS[entry.availability]}</Badge>
                          ) : (
                            <span className="muted">Not recorded</span>
                          )}
                        </td>
                        <td className="fs12">{entry?.remarks ?? <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

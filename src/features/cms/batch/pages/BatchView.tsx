import { useParams } from 'react-router-dom';
import { KvList, PageHead, dateFmt, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import BatchStatusPill from '../components/BatchStatusPill';
import { batchService } from '../services/batchService';
import { DELIVERY_MODE_LABELS } from '../types/batch.types';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/*
 * What the assignments of a batch block. Seats (active assignments) block cancelling and set the capacity
 * floor; any assignment, inactive ones included, blocks deleting and fixes the centre and code.
 */
function assignmentHint(assignedCount: number, assignmentCount: number): string {
  if (assignedCount > 0) {
    return 'A batch with students cannot be deleted or cancelled, and its centre and code are fixed. Deactivate it instead if it should no longer be offered.';
  }
  if (assignmentCount > 0) {
    return (
      `No student holds a seat, but ${plural(assignmentCount, 'inactive assignment still references', 'inactive assignments still reference')} ` +
      'this batch, so it cannot be deleted and its centre and code are fixed. Delete those assignments in Assign Batch first, or deactivate the batch instead.'
    );
  }
  return 'No student is assigned to this batch yet.';
}

/* View Batch — read-only detail page with the centre and the seats taken. */
export default function BatchView() {
  usePageTitle('Batch');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => batchService.get(id), [id]);
  const { busy, run } = useAction();

  const batch = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Batch Master', link: '/cms/batches' }, { l: batch ? batch.name : 'Batch' }]}
        title={batch ? batch.name : 'Batch'}
        badge={batch ? <span className="tag">{batch.code}</span> : undefined}
        sub={batch ? `${batch.centreName} (${batch.centreCode})${batch.centreIsActive ? '' : ' — centre inactive'}` : undefined}
        back={<BackButton to="/cms/batches" />}
        actions={
          <div className="f ac gp8 wrap">
            {batch ? (
              <>
                <Can action="updateCmsBatch">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => batchService.setStatus(batch.id, !batch.isActive),
                        batch.isActive ? 'Batch deactivated' : 'Batch activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {batch.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateCmsBatch">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/batches/${batch.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {batch ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Batch details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Batch name', batch.name],
                  ['Batch code', <span className="mono">{batch.code}</span>],
                  ['Training centre', `${batch.centreName} (${batch.centreCode})${batch.centreIsActive ? '' : ' (inactive)'}`],
                  ['Technology track', batch.trackName ?? '—'],
                  ['Delivery mode', DELIVERY_MODE_LABELS[batch.deliveryMode] ?? batch.deliveryMode],
                  ['Batch status', <BatchStatusPill status={batch.batchStatus} />],
                  ['Status', <MasterStatusBadge isActive={batch.isActive} />],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Schedule &amp; capacity</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Start date', dateFmt(batch.startDate)],
                  ['End date', batch.endDate ? dateFmt(batch.endDate) : '—'],
                  ['Capacity', `${batch.capacity} seats`],
                  ['Created', fmtDateTime(batch.createdAt)],
                  ['Last updated', fmtDateTime(batch.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Students</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Students assigned', `${batch.assignedCount} / ${batch.capacity}`],
                  ['Seats left', String(batch.seatsLeft)],
                  ...(batch.assignmentCount > batch.assignedCount
                    ? [['Inactive assignments', String(batch.assignmentCount - batch.assignedCount)] as [string, string]]
                    : []),
                ]}
              />
              <div className="hint mt10">{assignmentHint(batch.assignedCount, batch.assignmentCount)}</div>
              <div className="f gp8 wrap mt10">
                <Can action="viewBatchAssignments">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/batch-assignments?batchId=${batch.id}`)}>
                    Open students of this batch
                  </button>
                </Can>
                <Can action="viewTrainingCentres">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/training-centres/${batch.centreId}`)}>View centre</button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

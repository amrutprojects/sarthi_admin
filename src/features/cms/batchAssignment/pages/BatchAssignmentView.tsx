import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BatchStatusPill from '../../batch/components/BatchStatusPill';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { batchAssignmentService } from '../services/batchAssignmentService';
import { REASON_LABELS } from '../types/batchAssignment.types';

/* View an assignment — read-only detail: the student, the batch and centre, and why. */
export default function BatchAssignmentView() {
  usePageTitle('Batch Assignment');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => batchAssignmentService.get(id), [id]);
  const { busy, run } = useAction();

  const a = detail.data;
  const differs = !!a?.studentPreferredCentreCode && a.studentPreferredCentreCode.toUpperCase() !== a.centreCode.toUpperCase();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Assign Batch', link: '/cms/batch-assignments' }, { l: a ? a.studentName : 'Assignment' }]}
        title={a ? a.studentName : 'Batch Assignment'}
        badge={a ? <span className="tag">{a.studentCode}</span> : undefined}
        sub={a ? `Batch ${a.batchName} (${a.batchCode}) at ${a.centreName}` : undefined}
        back={<BackButton to="/cms/batch-assignments" />}
        actions={
          <div className="f ac gp8 wrap">
            {a ? (
              <>
                <Can action="updateBatchAssignment">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => batchAssignmentService.setStatus(a.id, !a.isActive),
                        a.isActive ? 'Assignment deactivated' : 'Assignment activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {a.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateBatchAssignment">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/batch-assignments/${a.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {a ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Student</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Student name', a.studentName],
                  ['Student code', <span className="mono">{a.studentCode}</span>],
                  ['Preferred centre', a.studentPreferredCentreCode ? <span className="mono">{a.studentPreferredCentreCode}</span> : '—'],
                  ['Reason', a.reasonCode ? REASON_LABELS[a.reasonCode] ?? a.reasonCode : '—'],
                  ['Remarks', a.remarks ?? '—'],
                ]}
              />
              {differs ? (
                <div className="hint mt10">The batch's centre ({a.centreCode}) is not the student's preferred centre, so a reason is required.</div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Batch</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Batch', `${a.batchName} (${a.batchCode})${a.batchIsActive ? '' : ' (inactive)'}`],
                  ['Batch status', <BatchStatusPill status={a.batchStatus} />],
                  ['Training centre', `${a.centreName} (${a.centreCode})`],
                  ['Assigned on', fmtDateTime(a.assignedAt)],
                  ['Status', <MasterStatusBadge isActive={a.isActive} />],
                  ['Created', fmtDateTime(a.createdAt)],
                  ['Last updated', fmtDateTime(a.updatedAt)],
                ]}
              />
              <div className="hint mt10">
                {a.isActive ? 'This assignment holds a seat in the batch.' : 'Inactive: this assignment does not hold a seat.'}
              </div>
              <div className="f gp8 wrap mt10">
                <button type="button" className="btn sm" onClick={() => go(`/cms/batch-assignments?batchId=${a.batchId}`)}>
                  Other students of this batch
                </button>
                <Can action="viewCmsBatches">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/batches/${a.batchId}`)}>View batch</button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

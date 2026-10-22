import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import { BATCH_STATUS_LABELS } from '../../batch/types/batch.types';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { batchAssignmentService } from '../services/batchAssignmentService';
import BatchAssignmentForm from './BatchAssignmentForm';

/*
 * Edit an assignment — a dedicated page. The student is fixed; moving to another batch re-runs the batch,
 * seat and reason checks on the server. Status (holds a seat or not) has its own endpoint.
 */
export default function BatchAssignmentEdit() {
  usePageTitle('Edit Batch Assignment');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => batchAssignmentService.get(id), [id]);
  const { busy, run } = useAction();

  const a = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Assign Batch', link: '/cms/batch-assignments' },
          ...(a ? [{ l: a.studentName, link: `/cms/batch-assignments/${a.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={a ? `Edit assignment of ${a.studentName}` : 'Edit Batch Assignment'}
        sub="Choosing another batch moves the student; the new batch must be Open and have a free seat."
        back={<BackButton to={a ? `/cms/batch-assignments/${a.id}` : '/cms/batch-assignments'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {a ? (
        <>
          {/* The saved batch stays selectable (savedOption); this explains why it is not in the Open list. */}
          {!a.batchIsActive || a.batchStatus === 'CANCELLED' ? (
            <div className="mb14">
              <Callout tone="warn" title={a.batchIsActive ? `Batch ${a.batchCode} is cancelled` : `Batch ${a.batchCode} is inactive`}>
                {a.batchName} is {a.batchIsActive ? BATCH_STATUS_LABELS[a.batchStatus].toLowerCase() : 'deactivated'}. The reason and remarks can
                still be edited, but consider moving the student to another, Open batch.
              </Callout>
            </div>
          ) : null}

          <BatchAssignmentForm
            editing
            initial={{
              student: { id: a.studentId, code: a.studentCode, name: a.studentName, centreCode: a.studentPreferredCentreCode, assignedBatchCode: a.batchCode },
              batchId: a.batchId,
              reasonCode: a.reasonCode ?? '',
              remarks: a.remarks ?? '',
              isActive: a.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this assignment?"
            backTo={`/cms/batch-assignments/${a.id}`}
            currentBatch={savedOption(a.batchId, a.batchName, a.batchCode, a.batchIsActive)}
            currentBatchCentreCode={a.centreCode}
            onSave={async (values) => {
              await batchAssignmentService.update(a.id, { batchId: values.batchId, reasonCode: values.reasonCode, remarks: values.remarks });
              toastOk(values.batchId === a.batchId ? 'Assignment updated' : 'Student moved to the new batch');
              navigate(`/cms/batch-assignments/${a.id}`);
            }}
            statusSlot={
              <MasterField
                id="ba-status-current"
                label="Status"
                hint="Deactivating frees the seat. Activating takes a seat again and is refused when the batch is full."
              >
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={a.isActive} />
                  <Can action="updateBatchAssignment">
                    <button
                      type="button"
                      className="btn xs"
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
                </div>
              </MasterField>
            }
          />
        </>
      ) : null}
    </div>
  );
}

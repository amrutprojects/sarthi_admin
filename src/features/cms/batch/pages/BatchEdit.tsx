import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { batchService } from '../services/batchService';
import BatchForm from './BatchForm';

/*
 * Edit Batch — a dedicated page. Status (active / inactive) is not part of the form: it has its own
 * endpoint. While any assignment exists (inactive ones included) the centre and code are locked; while
 * students hold seats the capacity has a floor.
 */
export default function BatchEdit() {
  usePageTitle('Edit Batch');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => batchService.get(id), [id]);
  const { busy, run } = useAction();

  const batch = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Batch Master', link: '/cms/batches' },
          ...(batch ? [{ l: batch.name, link: `/cms/batches/${batch.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={batch ? `Edit ${batch.name}` : 'Edit Batch'}
        sub="Changing the centre re-checks the name against the batches of the new centre."
        back={<BackButton to={batch ? `/cms/batches/${batch.id}` : '/cms/batches'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {batch ? (
        <>
          {!batch.centreIsActive ? (
            <div className="mb14">
              <Callout tone="warn" title="The training centre of this batch is inactive">
                {batch.centreName} has been deactivated, so no student can be assigned to this batch.{' '}
                {batch.assignmentCount > 0
                  ? `Reactivate ${batch.centreName} in the Training Centre Master (the centre cannot change while assignments exist).`
                  : `Choose an active centre before saving, or reactivate ${batch.centreName} in the Training Centre Master.`}
              </Callout>
            </div>
          ) : null}

          <BatchForm
            initial={{
              centreId: batch.centreId,
              name: batch.name,
              code: batch.code,
              trackName: batch.trackName ?? '',
              deliveryMode: batch.deliveryMode,
              startDate: batch.startDate,
              endDate: batch.endDate ?? '',
              capacity: String(batch.capacity),
              batchStatus: batch.batchStatus,
              isActive: batch.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this batch?"
            backTo={`/cms/batches/${batch.id}`}
            currentCentre={savedOption(batch.centreId, batch.centreName, batch.centreCode, batch.centreIsActive)}
            assignedCount={batch.assignedCount}
            assignmentCount={batch.assignmentCount}
            savedStatus={batch.batchStatus}
            onSave={async (values) => {
              const locked = batch.assignmentCount > 0;
              await batchService.update(batch.id, {
                /* Centre and code are fixed while any assignment exists (even inactive); they are not sent at all then. */
                ...(locked ? {} : { centreId: values.centreId, code: values.code }),
                name: values.name,
                trackName: values.trackName,
                capacity: values.capacity,
                startDate: values.startDate,
                endDate: values.endDate,
                deliveryMode: values.deliveryMode,
                batchStatus: values.batchStatus,
              });
              toastOk('Batch updated');
              navigate(`/cms/batches/${batch.id}`);
            }}
            statusSlot={
              <MasterField id="bt-status-current" label="Status" hint="Deactivating keeps the batch and its students but stops offering it in any form.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={batch.isActive} />
                  <Can action="updateCmsBatch">
                    <button
                      type="button"
                      className="btn xs"
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
                </div>
              </MasterField>
            }
          />
        </>
      ) : null}
    </div>
  );
}

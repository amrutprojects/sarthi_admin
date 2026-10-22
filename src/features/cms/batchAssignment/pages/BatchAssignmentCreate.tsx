import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { batchAssignmentService } from '../services/batchAssignmentService';
import { emptyBatchAssignmentForm } from '../validation/batchAssignment.validation';
import BatchAssignmentForm from './BatchAssignmentForm';

/*
 * Assign Batch — add page. ?batchId= (from a batch-filtered listing) preselects that batch, but only when it
 * is actually open for assignment: a preselected value the dropdown cannot show would be submitted unseen.
 */
export default function BatchAssignmentCreate() {
  usePageTitle('Assign Batch');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantedBatchId = params.get('batchId') ?? '';
  const assignable = useApiData(
    () => (wantedBatchId ? batchAssignmentService.assignableBatches() : Promise.resolve([])),
    [wantedBatchId],
  );

  const ready = !wantedBatchId || !assignable.loading;
  const batchId = assignable.data?.some((b) => b.id === wantedBatchId) ? wantedBatchId : '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Assign Batch', link: '/cms/batch-assignments' }, { l: 'Assign student' }]}
        title="Assign student to a batch"
        sub="Each student holds at most one batch. The batch must be Open and have a free seat."
        back={<BackButton to="/cms/batch-assignments" />}
      />
      {ready ? (
        <BatchAssignmentForm
          initial={emptyBatchAssignmentForm(batchId)}
          submitLabel="Assign student"
          backTo="/cms/batch-assignments"
          onSave={async (values) => {
            const created = await batchAssignmentService.create(values);
            toastOk(`${created.studentName} assigned to batch ${created.batchCode}`);
            navigate(`/cms/batch-assignments/${created.id}`);
          }}
        />
      ) : (
        <div className="card"><div className="card-b"><div className="skel" style={{ height: 14 }} /></div></div>
      )}
    </div>
  );
}

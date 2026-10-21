import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { batchService } from '../services/batchService';
import { emptyBatchForm } from '../validation/batch.validation';
import BatchForm from './BatchForm';

/*
 * Add Batch — a dedicated page. ?centreId= preselects the centre when opened from a centre filter; an
 * inactive or unknown centre is cleared by the select (it is not in the active list), never submitted unseen.
 */
export default function BatchCreate() {
  usePageTitle('Add Batch');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Batch Master', link: '/cms/batches' }, { l: 'Add Batch' }]}
        title="Add Batch"
        sub="A batch runs at one training centre. Leave the code blank and it is generated from the centre code."
        back={<BackButton to="/cms/batches" />}
      />
      <BatchForm
        initial={emptyBatchForm(params.get('centreId') ?? '')}
        submitLabel="Create batch"
        backTo="/cms/batches"
        onSave={async (values) => {
          const created = await batchService.create(values);
          toastOk(`Batch ${created.code} created`);
          navigate(`/cms/batches/${created.id}`);
        }}
      />
    </div>
  );
}

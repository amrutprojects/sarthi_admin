import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../../cms/components/BackButton';
import { LoadState, toastOk, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { lmsEntityService } from '../services/entityService';
import { emptyLmsEntityForm } from '../validation/entity.validation';
import LmsEntityForm from './LmsEntityForm';

const LIST = '/lms/entities';

/* Add Entity — a dedicated page, reached from the Add Entity button on the listing. */
export default function LmsEntityCreate() {
  usePageTitle('Add Entity');
  const navigate = useNavigate();
  const options = useApiData(() => lmsEntityService.formOptions(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Entity Master', link: LIST }, { l: 'Add Entity' }]}
        title="Add Entity"
        sub="Creates an LMS entity: the learning environment within which courses, batches, trainers and learners operate."
        back={<BackButton to={LIST} />}
      />

      <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} />

      {options.data ? (
        <LmsEntityForm
          initial={emptyLmsEntityForm(options.data.defaultTimeZone)}
          formOptions={options.data}
          submitLabel="Create entity"
          backTo={LIST}
          onSave={async (values) => {
            const created = await lmsEntityService.create(values);
            toastOk('Entity created');
            navigate(`${LIST}/${created.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

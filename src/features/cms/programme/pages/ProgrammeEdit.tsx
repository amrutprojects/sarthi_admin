import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { programmeService } from '../services/programmeService';
import ProgrammeForm from './ProgrammeForm';

/* Edit the Programme page — a dedicated page, never a modal. */
export default function ProgrammeEdit() {
  usePageTitle('Edit Programme Page');
  const navigate = useNavigate();
  const detail = useApiData(() => programmeService.get(), []);
  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Programme Page', link: '/cms/programme' }, { l: 'Edit' }]}
        title="Edit Programme Page"
        sub="Every text field is stored in Marathi and English — the public site defaults to Marathi."
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {page ? (
        <ProgrammeForm
          initial={page}
          backTo="/cms/programme"
          onSave={async (values) => {
            await programmeService.update(values);
            toastOk('Programme page updated');
            navigate('/cms/programme');
          }}
        />
      ) : null}
    </div>
  );
}

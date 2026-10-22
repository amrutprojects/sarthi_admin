import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { documentService } from '../services/documentService';
import { emptyDocumentForm } from '../validation/document.validation';
import DocumentForm from './DocumentForm';

/*
 * Add Document — a dedicated page. ?centreId= preselects the training centre when opened from a centre filter;
 * an inactive or unknown centre is cleared by the select (it is not in the active list), never submitted unseen.
 */
export default function DocumentCreate() {
  usePageTitle('Add Document');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Document Master', link: '/cms/documents' }, { l: 'Add Document' }]}
        title="Add Document"
        sub="Uploads a document privately. It starts as Pending until an approver verifies it."
        back={<BackButton to="/cms/documents" />}
      />
      <DocumentForm
        initial={emptyDocumentForm(params.get('centreId') ?? '')}
        submitLabel="Upload document"
        backTo="/cms/documents"
        onSave={async (values) => {
          if (!values.file) return;
          const created = await documentService.create({
            title: values.title,
            category: values.category,
            description: values.description,
            districtId: values.districtId,
            centreId: values.centreId,
            isActive: values.isActive,
            file: values.file,
          });
          toastOk('Document uploaded');
          navigate(`/cms/documents/${created.id}`);
        }}
      />
    </div>
  );
}

import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { documentService } from '../services/documentService';
import DocumentForm from './DocumentForm';

/*
 * Edit Document — a dedicated page. The metadata and, optionally, a replacement file are saved together;
 * a replacement file puts the verification back to Pending. Status has its own endpoint.
 */
export default function DocumentEdit() {
  usePageTitle('Edit Document');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => documentService.get(id), [id]);
  const { busy, run } = useAction();

  const doc = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Document Master', link: '/cms/documents' },
          ...(doc ? [{ l: doc.title, link: `/cms/documents/${doc.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={doc ? `Edit ${doc.title}` : 'Edit Document'}
        sub="Correct the details or links, or replace the file. A new file must be verified again."
        back={<BackButton to={doc ? `/cms/documents/${doc.id}` : '/cms/documents'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {doc ? (
        <>
          {doc.districtId && doc.districtIsActive === false ? (
            <div className="mb14">
              <Callout tone="warn" title="The linked district is inactive">
                {doc.districtName} has been deactivated. The link is kept if you leave it as it is; to change it, choose an active
                district, or reactivate {doc.districtName} in the District Master.
              </Callout>
            </div>
          ) : null}
          {doc.centreId && doc.centreIsActive === false ? (
            <div className="mb14">
              <Callout tone="warn" title="The linked training centre is inactive">
                {doc.centreName} has been deactivated. The link is kept if you leave it as it is; to change it, choose an active
                centre, or reactivate {doc.centreName} in the Training Centre Master.
              </Callout>
            </div>
          ) : null}

          <DocumentForm
            initial={{
              title: doc.title,
              category: doc.category,
              description: doc.description ?? '',
              stateId: doc.stateId ?? '',
              districtId: doc.districtId ?? '',
              centreId: doc.centreId ?? '',
              file: null,
              isActive: doc.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this document?"
            backTo={`/cms/documents/${doc.id}`}
            currentFileName={doc.fileName}
            currentState={savedOption(doc.stateId, doc.stateName, doc.stateCode, doc.stateIsActive ?? true)}
            currentDistrict={savedOption(doc.districtId, doc.districtName, doc.districtCode, doc.districtIsActive ?? true)}
            currentCentre={savedOption(doc.centreId, doc.centreName, doc.centreCode, doc.centreIsActive ?? true)}
            onSave={async (values) => {
              await documentService.update(doc.id, {
                title: values.title,
                category: values.category,
                description: values.description,
                districtId: values.districtId,
                centreId: values.centreId,
                file: values.file ?? undefined,
              });
              toastOk(values.file ? 'Document updated; the new file is pending verification' : 'Document updated');
              navigate(`/cms/documents/${doc.id}`);
            }}
            statusSlot={
              <MasterField id="doc-status-current" label="Status" hint="Deactivating keeps the record and its file; an inactive document cannot be verified.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={doc.isActive} />
                  <Can action="updateCmsDocument">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => documentService.setStatus(doc.id, !doc.isActive),
                          doc.isActive ? 'Document deactivated' : 'Document activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {doc.isActive ? 'Deactivate' : 'Activate'}
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

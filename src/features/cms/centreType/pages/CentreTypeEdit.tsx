import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreTypeService } from '../services/centreTypeService';
import CentreTypeForm from './CentreTypeForm';

/* Edit Training Centre Type — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function CentreTypeEdit() {
  usePageTitle('Edit Training Centre Type');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => centreTypeService.get(id), [id]);
  const { busy, run } = useAction();

  const centreType = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Training Centre Type Master', link: '/cms/centre-types' },
          ...(centreType ? [{ l: centreType.name, link: `/cms/centre-types/${centreType.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={centreType ? `Edit ${centreType.name}` : 'Edit Training Centre Type'}
        sub="Correct the name, code or description of the centre type. Centres of this type keep it."
        back={<BackButton to={centreType ? `/cms/centre-types/${centreType.id}` : '/cms/centre-types'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centreType ? (
        <CentreTypeForm
          initial={{ name: centreType.name, code: centreType.code, description: centreType.description ?? '', isActive: centreType.isActive }}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this training centre type?"
          backTo={`/cms/centre-types/${centreType.id}`}
          onSave={async (values) => {
            await centreTypeService.update(centreType.id, { name: values.name, code: values.code, description: values.description });
            toastOk('Training centre type updated');
            navigate(`/cms/centre-types/${centreType.id}`);
          }}
          statusSlot={
            <MasterField
              id="ct-status-current"
              label="Status"
              hint="Deactivating keeps the record, and the centres already of this type, but stops offering it in the Training Centre form."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={centreType.isActive} />
                <Can action="updateCentreType">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => centreTypeService.setStatus(centreType.id, !centreType.isActive),
                        centreType.isActive ? 'Training centre type deactivated' : 'Training centre type activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {centreType.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}
    </div>
  );
}

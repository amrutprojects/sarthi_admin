import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { stateService } from '../services/stateService';
import StateForm from './StateForm';

/* Edit State — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function StateEdit() {
  usePageTitle('Edit State');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => stateService.get(id), [id]);
  const { busy, run } = useAction();

  const state = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'State Master', link: '/cms/states' },
          ...(state ? [{ l: state.name, link: `/cms/states/${state.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={state ? `Edit ${state.name}` : 'Edit State'}
        sub="Renaming a state or correcting its code does not affect the districts attached to it."
        back={<BackButton to={state ? `/cms/states/${state.id}` : '/cms/states'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {state ? (
        <StateForm
          initial={{ name: state.name, code: state.code, isActive: state.isActive }}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this state?"
          backTo={`/cms/states/${state.id}`}
          onSave={async (values) => {
            await stateService.update(state.id, { name: values.name, code: values.code });
            toastOk('State updated');
            navigate(`/cms/states/${state.id}`);
          }}
          statusSlot={
            <MasterField
              id="st-status-current"
              label="Status"
              hint="Deactivating keeps the record and its districts but stops offering the state in any form."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={state.isActive} />
                <Can action="updateState">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => stateService.setStatus(state.id, !state.isActive),
                        state.isActive ? 'State deactivated' : 'State activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {state.isActive ? 'Deactivate' : 'Activate'}
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

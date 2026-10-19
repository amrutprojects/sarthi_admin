import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../auth/Can';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { talukaService } from '../services/talukaService';
import TalukaForm from './TalukaForm';

/*
 * Edit Taluka — a dedicated page.
 *
 * The cascade starts on the saved state and district. Changing the state clears the district, exactly
 * as on the create page, so a taluka can never end up pointing at a district of a different state.
 */
export default function TalukaEdit() {
  usePageTitle('Edit Taluka');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => talukaService.get(id), [id]);
  const { busy, run } = useAction();

  const taluka = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Taluka Master', link: '/cms/talukas' },
          ...(taluka ? [{ l: taluka.name, link: `/cms/talukas/${taluka.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={taluka ? `Edit ${taluka.name}` : 'Edit Taluka'}
        sub="Changing the state clears the district, and the name is re-checked against the new district."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {taluka ? (
        <>
          {!taluka.districtIsActive ? (
            <div className="mb14">
              <Callout tone="warn" title="The district of this taluka is inactive">
                {taluka.districtName} has been deactivated. Choose an active district before saving, or reactivate{' '}
                {taluka.districtName} in the District Master.
              </Callout>
            </div>
          ) : null}

          <TalukaForm
            initial={{
              stateId: taluka.stateId,
              districtId: taluka.districtId,
              name: taluka.name,
              code: taluka.code ?? '',
              isActive: taluka.isActive,
            }}
            submitLabel="Save changes"

            confirmMessage="Are you sure you want to save the changes to this taluka?"
            backTo={`/cms/talukas/${taluka.id}`}
            currentState={{ id: taluka.stateId, name: taluka.stateName, code: taluka.stateCode }}
            currentDistrict={{
              id: taluka.districtId,
              name: taluka.districtName + (taluka.districtIsActive ? '' : ' (inactive)'),
              code: taluka.districtCode,
            }}
            onSave={async (values) => {
              await talukaService.update(taluka.id, {
                stateId: values.stateId,
                districtId: values.districtId,
                name: values.name,
                code: values.code,
              });
              toastOk('Taluka updated');
              navigate(`/cms/talukas/${taluka.id}`);
            }}
            statusSlot={
              <MasterField id="tk-status-current" label="Status" hint="Deactivating keeps the record but stops offering the taluka in any form.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={taluka.isActive} />
                  <Can action="updateTaluka">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => talukaService.setStatus(taluka.id, !taluka.isActive),
                          taluka.isActive ? 'Taluka deactivated' : 'Taluka activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {taluka.isActive ? 'Deactivate' : 'Activate'}
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

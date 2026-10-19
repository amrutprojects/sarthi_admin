import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../auth/Can';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { districtService } from '../services/districtService';
import DistrictForm from './DistrictForm';

/* Edit District — a dedicated page. Moving the district to another state is allowed and re-validated. */
export default function DistrictEdit() {
  usePageTitle('Edit District');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => districtService.get(id), [id]);
  const { busy, run } = useAction();

  const district = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'District Master', link: '/cms/districts' },
          ...(district ? [{ l: district.name, link: `/cms/districts/${district.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={district ? `Edit ${district.name}` : 'Edit District'}
        sub="Changing the state re-checks the name and code against the districts of the new state."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {district ? (
        <>
          {!district.stateIsActive ? (
            <div className="mb14">
              <Callout tone="warn" title="The state of this district is inactive">
                {district.stateName} has been deactivated. Choose an active state before saving, or reactivate {district.stateName}{' '}
                in the State Master.
              </Callout>
            </div>
          ) : null}

          <DistrictForm
            initial={{ stateId: district.stateId, name: district.name, code: district.code, isActive: district.isActive }}
            submitLabel="Save changes"

            confirmMessage="Are you sure you want to save the changes to this district?"
            backTo={`/cms/districts/${district.id}`}
            currentState={{ id: district.stateId, name: district.stateName + (district.stateIsActive ? '' : ' (inactive)'), code: district.stateCode }}
            onSave={async (values) => {
              await districtService.update(district.id, { stateId: values.stateId, name: values.name, code: values.code });
              toastOk('District updated');
              navigate(`/cms/districts/${district.id}`);
            }}
            statusSlot={
              <MasterField
                id="dt-status-current"
                label="Status"
                hint="Deactivating keeps the record and its talukas but stops offering the district in any form."
              >
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={district.isActive} />
                  <Can action="updateDistrict">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => districtService.setStatus(district.id, !district.isActive),
                          district.isActive ? 'District deactivated' : 'District activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {district.isActive ? 'Deactivate' : 'Activate'}
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

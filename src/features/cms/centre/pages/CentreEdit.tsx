import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreService } from '../services/centreService';
import { sameTechnologySet } from '../validation/centre.validation';
import CentreForm from './CentreForm';

/*
 * Edit Center — a dedicated page.
 *
 * The cascade starts on the saved state, district and taluka, each kept selectable even when it has
 * since been deactivated. The allocated technologies start ticked; technologyCodes is sent only when the
 * allocation actually changed, since sending it replaces the whole set on the server.
 */
export default function CentreEdit() {
  usePageTitle('Edit Center');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => centreService.get(id), [id]);
  const { busy, run } = useAction();

  const centre = detail.data;
  /* Parents deactivated after the centre was saved: the centre keeps them, but they cannot be chosen again. */
  const inactiveParents = centre
    ? [
        !centre.stateIsActive ? `state ${centre.stateName}` : null,
        !centre.districtIsActive ? `district ${centre.districtName}` : null,
        centre.talukaId && centre.talukaIsActive === false ? `taluka ${centre.talukaName}` : null,
      ].filter((x): x is string => x !== null)
    : [];
  const staleTechnologies = centre ? centre.technologies.filter((t) => !t.usable) : [];
  const savedTechnologyCodes = centre ? centre.technologies.map((t) => t.code) : [];

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Center Master', link: '/cms/centres' },
          ...(centre ? [{ l: centre.name, link: `/cms/centres/${centre.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={centre ? `Edit ${centre.name}` : 'Edit Center'}
        sub="Changing the district re-checks the name against the centers of the new district."
        back={<BackButton to={centre ? `/cms/centres/${centre.id}` : '/cms/centres'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centre ? (
        <>
          {inactiveParents.length ? (
            <div className="mb14">
              <Callout tone="warn" title="A location of this center is inactive">
                The center&apos;s {inactiveParents.join(' and ')} {inactiveParents.length === 1 ? 'has' : 'have'} been deactivated. The
                center keeps {inactiveParents.length === 1 ? 'it' : 'them'} while you edit its other details, but only active records
                can be chosen when you change the location. Reactivate {inactiveParents.length === 1 ? 'it' : 'them'} in the matching
                master if the center should stay there.
              </Callout>
            </div>
          ) : null}
          {staleTechnologies.length ? (
            <div className="mb14">
              <Callout tone="warn" title="An allocated technology is no longer offered">
                {staleTechnologies.map((t) => t.name).join(', ')} {staleTechnologies.length === 1 ? 'is' : 'are'} no longer active.
                Students cannot choose {staleTechnologies.length === 1 ? 'it' : 'them'} at this center. Untick{' '}
                {staleTechnologies.length === 1 ? 'it' : 'them'} under Allocated Technologies to remove the allocation.
              </Callout>
            </div>
          ) : null}

          <CentreForm
            initial={{
              stateId: centre.stateId,
              districtId: centre.districtId,
              talukaId: centre.talukaId ?? '',
              name: centre.name,
              code: centre.code,
              address: centre.address ?? '',
              pinCode: centre.pinCode ?? '',
              contactPerson: centre.contactPerson ?? '',
              contactNumber: centre.contactNumber ?? '',
              email: centre.email ?? '',
              technologyCodes: savedTechnologyCodes,
              isActive: centre.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this center?"
            backTo={`/cms/centres/${centre.id}`}
            currentState={savedOption(centre.stateId, centre.stateName, centre.stateCode, centre.stateIsActive)}
            currentDistrict={savedOption(centre.districtId, centre.districtName, centre.districtCode, centre.districtIsActive)}
            currentTaluka={savedOption(centre.talukaId, centre.talukaName, centre.talukaCode, centre.talukaIsActive !== false)}
            currentTechnologies={centre.technologies}
            onSave={async (values) => {
              await centreService.update(centre.id, {
                stateId: values.stateId,
                districtId: values.districtId,
                talukaId: values.talukaId,
                name: values.name,
                code: values.code,
                address: values.address,
                pinCode: values.pinCode,
                contactPerson: values.contactPerson,
                contactNumber: values.contactNumber,
                email: values.email,
                ...(sameTechnologySet(values.technologyCodes, savedTechnologyCodes)
                  ? {}
                  : { technologyCodes: values.technologyCodes }),
              });
              toastOk('Center updated');
              navigate(`/cms/centres/${centre.id}`);
            }}
            statusSlot={
              <MasterField id="ce-status-current" label="Status" hint="Deactivating keeps the record but stops offering the center in any form.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={centre.isActive} />
                  <Can action="updateCentre">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => centreService.setStatus(centre.id, !centre.isActive),
                          centre.isActive ? 'Center deactivated' : 'Center activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {centre.isActive ? 'Deactivate' : 'Activate'}
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

import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { savedOption } from '../../options';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { collegeService } from '../services/collegeService';
import CollegeForm from './CollegeForm';

/*
 * Edit College — a dedicated page.
 *
 * The cascade starts on the saved state, district and taluka, each kept selectable even when it has
 * since been deactivated. Changing the state clears the district and the taluka, so a college can never
 * end up pointing at a district of another state, or a taluka of another district.
 */
export default function CollegeEdit() {
  usePageTitle('Edit College');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => collegeService.get(id), [id]);
  const { busy, run } = useAction();

  const college = detail.data;
  /* Parents deactivated after the college was saved: the college keeps them, but they cannot be chosen again. */
  const inactiveParents = college
    ? [
        !college.stateIsActive ? `state ${college.stateName}` : null,
        !college.districtIsActive ? `district ${college.districtName}` : null,
        college.talukaId && college.talukaIsActive === false ? `taluka ${college.talukaName}` : null,
      ].filter((x): x is string => x !== null)
    : [];

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'College Master', link: '/cms/colleges' },
          ...(college ? [{ l: college.name, link: `/cms/colleges/${college.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={college ? `Edit ${college.name}` : 'Edit College'}
        sub="Changing the district re-checks the name against the colleges of the new district."
        back={<BackButton to={college ? `/cms/colleges/${college.id}` : '/cms/colleges'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {college ? (
        <>
          {inactiveParents.length ? (
            <div className="mb14">
              <Callout tone="warn" title="A location of this college is inactive">
                The college&apos;s {inactiveParents.join(' and ')} {inactiveParents.length === 1 ? 'has' : 'have'} been deactivated. The
                college keeps {inactiveParents.length === 1 ? 'it' : 'them'} while you edit its other details, but only active records
                can be chosen when you change the location. Reactivate {inactiveParents.length === 1 ? 'it' : 'them'} in the matching
                master if the college should stay there.
              </Callout>
            </div>
          ) : null}

          <CollegeForm
            initial={{
              stateId: college.stateId,
              districtId: college.districtId,
              talukaId: college.talukaId ?? '',
              name: college.name,
              code: college.code,
              address: college.address ?? '',
              pinCode: college.pinCode ?? '',
              contactNumber: college.contactNumber ?? '',
              email: college.email ?? '',
              isActive: college.isActive,
            }}
            submitLabel="Save changes"
            confirmMessage="Are you sure you want to save the changes to this college?"
            backTo={`/cms/colleges/${college.id}`}
            currentState={savedOption(college.stateId, college.stateName, college.stateCode, college.stateIsActive)}
            currentDistrict={savedOption(college.districtId, college.districtName, college.districtCode, college.districtIsActive)}
            currentTaluka={savedOption(college.talukaId, college.talukaName, college.talukaCode, college.talukaIsActive !== false)}
            onSave={async (values) => {
              await collegeService.update(college.id, {
                stateId: values.stateId,
                districtId: values.districtId,
                talukaId: values.talukaId,
                name: values.name,
                code: values.code,
                address: values.address,
                pinCode: values.pinCode,
                contactNumber: values.contactNumber,
                email: values.email,
              });
              toastOk('College updated');
              navigate(`/cms/colleges/${college.id}`);
            }}
            statusSlot={
              <MasterField id="cl-status-current" label="Status" hint="Deactivating keeps the record but stops offering the college in any form.">
                <div className="f ac gp8" style={{ minHeight: 36 }}>
                  <MasterStatusBadge isActive={college.isActive} />
                  <Can action="updateCollege">
                    <button
                      type="button"
                      className="btn xs"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => collegeService.setStatus(college.id, !college.isActive),
                          college.isActive ? 'College deactivated' : 'College activated',
                          () => detail.reload(),
                        )
                      }
                    >
                      {college.isActive ? 'Deactivate' : 'Activate'}
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

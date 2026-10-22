import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { collegeService } from '../services/collegeService';

/* "Pune (PUN)", plus " (inactive)" when the parent has been deactivated since. */
const parentLabel = (name: string, code: string | null, isActive: boolean) =>
  `${name}${code ? ` (${code})` : ''}${isActive ? '' : ' (inactive)'}`;

/* View College — read-only detail page, with the district, state and taluka resolved to names. */
export default function CollegeView() {
  usePageTitle('College');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => collegeService.get(id), [id]);
  const { busy, run } = useAction();

  const college = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'College Master', link: '/cms/colleges' }, { l: college ? college.name : 'College' }]}
        title={college ? college.name : 'College'}
        badge={college ? <span className="tag">{college.code}</span> : undefined}
        sub={college ? `${college.districtName}, ${college.stateName}` : undefined}
        back={<BackButton to="/cms/colleges" />}
        actions={
          <div className="f ac gp8 wrap">
            {college ? (
              <>
                <Can action="updateCollege">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateCollege">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/colleges/${college.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {college ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>College details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['College name', college.name],
                  ['College code', <span className="mono">{college.code}</span>],
                  ['Status', <MasterStatusBadge isActive={college.isActive} />],
                  ['Created', fmtDateTime(college.createdAt)],
                  ['Last updated', fmtDateTime(college.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Location</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['State', parentLabel(college.stateName, college.stateCode, college.stateIsActive)],
                  ['District', parentLabel(college.districtName, college.districtCode, college.districtIsActive)],
                  [
                    'Taluka',
                    college.talukaName ? parentLabel(college.talukaName, college.talukaCode, college.talukaIsActive !== false) : '—',
                  ],
                  ['Address', college.address ?? '—'],
                  ['PIN code', college.pinCode ? <span className="mono">{college.pinCode}</span> : '—'],
                ]}
              />
              <div className="f gp8 wrap mt10">
                <Can action="viewDistricts">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/districts/${college.districtId}`)}>View district</button>
                </Can>
                <Can action="viewColleges">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => go(`/cms/colleges?stateId=${college.stateId}&districtId=${college.districtId}`)}
                  >
                    Other colleges in this district
                  </button>
                </Can>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Contact</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Contact number', college.contactNumber ? <span className="mono">{college.contactNumber}</span> : '—'],
                  ['Email', college.email ?? '—'],
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

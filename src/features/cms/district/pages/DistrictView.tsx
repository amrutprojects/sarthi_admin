import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { districtService } from '../services/districtService';

/* View District — read-only detail page, including the associated state name. */
export default function DistrictView() {
  usePageTitle('District');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => districtService.get(id), [id]);
  const { busy, run } = useAction();

  const district = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'District Master', link: '/cms/districts' },
          { l: district ? district.name : 'District' },
        ]}
        title={district ? district.name : 'District'}
        badge={district ? <span className="tag">{district.code}</span> : undefined}
        sub={district ? `${district.stateName} (${district.stateCode})` : undefined}
        actions={
          <div className="f ac gp8 wrap">
            <button type="button" className="btn" onClick={() => go('/cms/districts')}>Back to list</button>
            {district ? (
              <>
                <Can action="updateDistrict">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateDistrict">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/districts/${district.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {district ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>District details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['District name', district.name],
                  ['District code', <span className="mono">{district.code}</span>],
                  ['State', `${district.stateName} (${district.stateCode})`],
                  ['Status', <MasterStatusBadge isActive={district.isActive} />],
                  ['Created', fmtDateTime(district.createdAt)],
                  ['Last updated', fmtDateTime(district.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Talukas</h3></div>
            <div className="card-b">
              <KvList pairs={[['Talukas attached', String(district.talukaCount ?? 0)]]} />
              <div className="hint mt10">
                {district.talukaCount
                  ? 'A district with talukas cannot be deleted. Deactivate it instead if it should no longer be offered.'
                  : 'No talukas reference this district yet.'}
              </div>
              <div className="f gp8 wrap mt10">
                <Can action="viewTalukas">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/talukas?stateId=${district.stateId}&districtId=${district.id}`)}>
                    Open talukas of this district
                  </button>
                </Can>
                <Can action="viewStates">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/states/${district.stateId}`)}>View state</button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

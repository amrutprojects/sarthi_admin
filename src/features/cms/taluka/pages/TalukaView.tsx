import { useParams } from 'react-router-dom';
import { Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../auth/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { talukaService } from '../services/talukaService';

/* View Taluka — read-only detail page, including the district and the state it sits under. */
export default function TalukaView() {
  usePageTitle('Taluka');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => talukaService.get(id), [id]);
  const { busy, run } = useAction();

  const taluka = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Taluka Master', link: '/cms/talukas' }, { l: taluka ? taluka.name : 'Taluka' }]}
        title={taluka ? taluka.name : 'Taluka'}
        badge={taluka?.code ? <span className="tag">{taluka.code}</span> : undefined}
        sub={taluka ? `${taluka.districtName}, ${taluka.stateName}` : undefined}
        actions={
          <div className="f ac gp8 wrap">
            <button type="button" className="btn" onClick={() => go('/cms/talukas')}>Back to list</button>
            {taluka ? (
              <>
                <Can action="updateTaluka">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateTaluka">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/talukas/${taluka.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {taluka ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Taluka details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Taluka name', taluka.name],
                  ['Taluka code', taluka.code ? <span className="mono">{taluka.code}</span> : <Dash />],
                  ['Status', <MasterStatusBadge isActive={taluka.isActive} />],
                  ['Created', fmtDateTime(taluka.createdAt)],
                  ['Last updated', fmtDateTime(taluka.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Location</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['District', `${taluka.districtName} (${taluka.districtCode})`],
                  ['State', `${taluka.stateName} (${taluka.stateCode})`],
                ]}
              />
              <div className="hint mt10">The state is derived from the district, so the two can never disagree.</div>
              <div className="f gp8 wrap mt10">
                <Can action="viewDistricts">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/districts/${taluka.districtId}`)}>View district</button>
                </Can>
                <Can action="viewStates">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/states/${taluka.stateId}`)}>View state</button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

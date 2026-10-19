import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { stateService } from '../services/stateService';

/* View State — read-only detail page, reached from the View action on the listing. */
export default function StateView() {
  usePageTitle('State');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => stateService.get(id), [id]);
  const { busy, run } = useAction();

  const state = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'State Master', link: '/cms/states' }, { l: state ? state.name : 'State' }]}
        title={state ? state.name : 'State'}
        badge={state ? <span className="tag">{state.code}</span> : undefined}
        actions={
          <div className="f ac gp8 wrap">
            <button type="button" className="btn" onClick={() => go('/cms/states')}>Back to list</button>
            {state ? (
              <>
                <Can action="updateState">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateState">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/states/${state.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {state ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>State details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['State name', state.name],
                  ['State code', <span className="mono">{state.code}</span>],
                  ['Status', <MasterStatusBadge isActive={state.isActive} />],
                  ['Created', fmtDateTime(state.createdAt)],
                  ['Last updated', fmtDateTime(state.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Districts</h3></div>
            <div className="card-b">
              <KvList pairs={[['Districts attached', String(state.districtCount ?? 0)]]} />
              <div className="hint mt10">
                {state.districtCount
                  ? 'A state with districts cannot be deleted. Deactivate it instead if it should no longer be offered.'
                  : 'No districts reference this state yet.'}
              </div>
              <div className="mt10">
                <Can action="viewDistricts">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/districts?stateId=${state.id}`)}>
                    Open districts of this state
                  </button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

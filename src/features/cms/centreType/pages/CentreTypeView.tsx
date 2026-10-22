import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreTypeService } from '../services/centreTypeService';

/* View Training Centre Type — read-only detail page, with the number of centres classified under it. */
export default function CentreTypeView() {
  usePageTitle('Training Centre Type');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => centreTypeService.get(id), [id]);
  const { busy, run } = useAction();

  const centreType = detail.data;
  const centres = centreType?.centreCount ?? 0;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Training Centre Type Master', link: '/cms/centre-types' },
          { l: centreType ? centreType.name : 'Training Centre Type' },
        ]}
        title={centreType ? centreType.name : 'Training Centre Type'}
        badge={centreType ? <span className="tag">{centreType.code}</span> : undefined}
        back={<BackButton to="/cms/centre-types" />}
        actions={
          <div className="f ac gp8 wrap">
            {centreType ? (
              <>
                <Can action="updateCentreType">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateCentreType">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/centre-types/${centreType.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centreType ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Centre type details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Centre type name', centreType.name],
                  ['Centre type code', <span className="mono">{centreType.code}</span>],
                  ['Description', centreType.description ?? '—'],
                  ['Status', <MasterStatusBadge isActive={centreType.isActive} />],
                  ['Created', fmtDateTime(centreType.createdAt)],
                  ['Last updated', fmtDateTime(centreType.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Training centres</h3></div>
            <div className="card-b">
              <KvList pairs={[['Centres of this type', String(centres)]]} />
              <div className="hint mt10">
                {centres
                  ? 'A centre type that training centres still use cannot be deleted. Deactivate it instead if it should no longer be offered.'
                  : 'No training centre uses this type yet.'}
              </div>
              <div className="f gp8 wrap mt10">
                <Can action="viewTrainingCentres">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/training-centres?centreTypeId=${centreType.id}`)}>
                    Open training centres of this type
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

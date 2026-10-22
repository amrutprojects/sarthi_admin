import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';

/* A parent name, flagged when the parent has since been deactivated; '—' when none is recorded. */
const parentLabel = (name: string | null, code: string | null, isActive: boolean | null): ReactNode =>
  name ? (
    <>
      {code ? `${name} (${code})` : name}
      {isActive === false ? <span className="muted"> (inactive)</span> : null}
    </>
  ) : '—';

const orDash = (v: string | null) => v ?? '—';

const added = (yes: boolean) => (yes ? <Badge tone="green">Added</Badge> : <Badge tone="grey">Not added</Badge>);

/* View Training Centre — read-only profile (sections A–B) plus what references the centre. */
export default function TrainingCentreView() {
  usePageTitle('Training Centre');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => trainingCentreService.get(id), [id]);
  const { busy, run } = useAction();

  const centre = detail.data;
  const related = centre?.related;
  const blocking = related ? related.hasLocation || related.hasInfrastructure || related.batchCount > 0 || related.documentCount > 0 : false;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Training Centre Master', link: '/cms/training-centres' },
          { l: centre ? centre.name : 'Training Centre' },
        ]}
        title={centre ? centre.name : 'Training Centre'}
        badge={centre ? <span className="tag">{centre.code}</span> : undefined}
        sub={centre ? [centre.talukaName, centre.districtName, centre.stateName].filter(Boolean).join(', ') : undefined}
        back={<BackButton to="/cms/training-centres" />}
        actions={
          <div className="f ac gp8 wrap">
            {centre ? (
              <>
                <Can action="updateTrainingCentre">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => trainingCentreService.setStatus(centre.id, !centre.isActive),
                        centre.isActive ? 'Training centre deactivated' : 'Training centre activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {centre.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateTrainingCentre">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/training-centres/${centre.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centre ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>A · Basic information</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Centre name', centre.name],
                  ['Centre code', <span className="mono">{centre.code}</span>],
                  ['Centre type', parentLabel(centre.centreTypeName, null, centre.centreTypeIsActive)],
                  ['State', parentLabel(centre.stateName, centre.stateCode, centre.stateIsActive)],
                  ['District', parentLabel(centre.districtName, centre.districtCode, centre.districtIsActive)],
                  ['Taluka', parentLabel(centre.talukaName, null, centre.talukaIsActive)],
                  ['Contact number', centre.contactNumber ? <span className="mono">{centre.contactNumber}</span> : '—'],
                  ['Email', orDash(centre.email)],
                  ['Status', <MasterStatusBadge isActive={centre.isActive} />],
                  ['Created', fmtDateTime(centre.createdAt)],
                  ['Last updated', fmtDateTime(centre.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div>
            <div className="card mb14">
              <div className="card-h"><h3>B · Centre management</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['POC name', orDash(centre.pocName)],
                    ['POC mobile', centre.pocMobile ? <span className="mono">{centre.pocMobile}</span> : '—'],
                    ['Centre head', orDash(centre.centreHead)],
                    ['Alternative contact', orDash(centre.alternativeContact)],
                    ['Coordinator 1', orDash(centre.coordinator1)],
                    ['Coordinator 2', orDash(centre.coordinator2)],
                  ]}
                />
              </div>
            </div>

            {related ? (
              <div className="card">
                <div className="card-h"><h3>Related records</h3></div>
                <div className="card-b">
                  <KvList
                    pairs={[
                      ['Location information', added(related.hasLocation)],
                      ['Capacity & infrastructure', added(related.hasInfrastructure)],
                      ['Batches', String(related.batchCount)],
                      ['Documents', String(related.documentCount)],
                    ]}
                  />
                  <div className="hint mt10">
                    {blocking
                      ? 'A centre with location, infrastructure, batch or document records cannot be deleted. Deactivate it instead if it should no longer be offered.'
                      : 'Nothing references this centre yet.'}
                    {related.batchCount > 0 ? ' The centre code is locked because batches use it.' : ''}
                  </div>
                  <div className="f gp8 wrap mt10">
                    <Can action="viewCentreLocations">
                      <button type="button" className="btn sm" onClick={() => go(`/cms/centre-locations?centreId=${centre.id}`)}>Location information</button>
                    </Can>
                    <Can action="viewCentreInfrastructure">
                      <button type="button" className="btn sm" onClick={() => go(`/cms/centre-infrastructure?centreId=${centre.id}`)}>
                        Capacity &amp; infrastructure
                      </button>
                    </Can>
                    <Can action="viewCmsBatches">
                      <button type="button" className="btn sm" onClick={() => go(`/cms/batches?centreId=${centre.id}`)}>Batches</button>
                    </Can>
                    <Can action="viewCmsDocuments">
                      <button type="button" className="btn sm" onClick={() => go(`/cms/documents?centreId=${centre.id}`)}>Documents</button>
                    </Can>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

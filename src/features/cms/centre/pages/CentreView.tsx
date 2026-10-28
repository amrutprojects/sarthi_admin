import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { centreService } from '../services/centreService';

/* "Pune (PUN)", plus " (inactive)" when the parent has been deactivated since. */
const parentLabel = (name: string, code: string | null, isActive: boolean) =>
  `${name}${code ? ` (${code})` : ''}${isActive ? '' : ' (inactive)'}`;

/* View Center — read-only detail page, with the location resolved to names and the allocated technologies listed. */
export default function CentreView() {
  usePageTitle('Center');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => centreService.get(id), [id]);
  const { busy, run } = useAction();

  const centre = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Center Master', link: '/cms/centres' }, { l: centre ? centre.name : 'Center' }]}
        title={centre ? centre.name : 'Center'}
        badge={centre ? <span className="tag">{centre.code}</span> : undefined}
        sub={centre ? `${centre.districtName}, ${centre.stateName}` : undefined}
        back={<BackButton to="/cms/centres" />}
        actions={
          <div className="f ac gp8 wrap">
            {centre ? (
              <>
                <Can action="updateCentre">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateCentre">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/centres/${centre.id}/edit`)}>Edit</button>
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
            <div className="card-h"><h3>Center details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Center name', centre.name],
                  ['Center code', <span className="mono">{centre.code}</span>],
                  ['Status', <MasterStatusBadge isActive={centre.isActive} />],
                  ['Created', fmtDateTime(centre.createdAt)],
                  ['Last updated', fmtDateTime(centre.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Location</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['State', parentLabel(centre.stateName, centre.stateCode, centre.stateIsActive)],
                  ['District', parentLabel(centre.districtName, centre.districtCode, centre.districtIsActive)],
                  [
                    'Taluka',
                    centre.talukaName ? parentLabel(centre.talukaName, centre.talukaCode, centre.talukaIsActive !== false) : '—',
                  ],
                  ['Address', centre.address ?? '—'],
                  ['PIN code', centre.pinCode ? <span className="mono">{centre.pinCode}</span> : '—'],
                ]}
              />
              <div className="f gp8 wrap mt10">
                <Can action="viewDistricts">
                  <button type="button" className="btn sm" onClick={() => go(`/cms/districts/${centre.districtId}`)}>View district</button>
                </Can>
                <Can action="viewCentres">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => go(`/cms/centres?stateId=${centre.stateId}&districtId=${centre.districtId}`)}
                  >
                    Other centers in this district
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
                  ['Contact person', centre.contactPerson ?? '—'],
                  ['Contact number', centre.contactNumber ? <span className="mono">{centre.contactNumber}</span> : '—'],
                  ['Email', centre.email ?? '—'],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Allocated Technologies</h3>
              <span className="tag">{centre.technologies.length}</span>
            </div>
            <div className="card-b">
              {centre.technologies.length ? (
                /* Same .kv rows as KvList, keyed by track code, ordered T01 to T12. */
                centre.technologies.map((t) => (
                  <div className="kv" key={t.code}>
                    <span>{t.name}</span>
                    <b>
                      <span className="mono fs12">{t.code}</span>
                      {t.usable ? null : <span className="muted"> (inactive)</span>}
                    </b>
                  </div>
                ))
              ) : (
                <div className="hint">No technologies are allocated to this center yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { lmsEntityService } from '../services/entityService';
import type { ApiLmsEntity } from '../types/entity.types';

const LIST = '/lms/entities';

/* "English (en)", or the bare code while the list is loading or when it is no longer listed. */
const languageLabel = (code: string, languages: { code: string; label: string }[] | undefined) => {
  const found = languages?.find((l) => l.code === code);
  return found ? `${found.label} (${found.code})` : code;
};

/* Readiness notes for the enabled centres / tracks (F-LMS-03-04 / -05: ≥ 1 of each before a batch is created). */
function SelectionWarnings({ entity }: { entity: ApiLmsEntity }) {
  const notes: string[] = [];
  if (!entity.enabledCentres.length) notes.push('Select at least one centre: no centre is enabled for this entity, so no batch can be created for it yet.');
  if (!entity.enabledTracks.length) notes.push('Select at least one track: no technology track is enabled for this entity, so no batch can be created for it yet.');
  const inactiveCentres = entity.enabledCentres.filter((c) => !c.isActive).length;
  const inactiveTracks = entity.enabledTracks.filter((t) => !t.isActive).length;
  if (inactiveCentres) notes.push(`${inactiveCentres} enabled centre${inactiveCentres === 1 ? ' is' : 's are'} inactive in the Admin Panel. Remove ${inactiveCentres === 1 ? 'it' : 'them'} from the selection if no longer used.`);
  if (inactiveTracks) notes.push(`${inactiveTracks} enabled track${inactiveTracks === 1 ? ' is' : 's are'} inactive in the Admin Panel.`);
  if (!notes.length) return null;
  return (
    <div className="callout c-warn mb14" role="status">
      <div>
        {notes.map((n) => (
          <div key={n}>{n}</div>
        ))}
      </div>
    </div>
  );
}

/* View Entity — read-only detail page, reached from the View action on the listing. */
export default function LmsEntityView() {
  usePageTitle('Entity');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => lmsEntityService.get(id), [id]);
  const options = useApiData(() => lmsEntityService.formOptions(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const entity = detail.data;
  const references = entity?.related?.references ?? [];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Entity Master', link: LIST }, { l: entity ? entity.name : 'Entity' }]}
        title={entity ? entity.name : 'Entity'}
        badge={entity ? <span className="tag">{entity.code}</span> : undefined}
        back={<BackButton to={LIST} />}
        actions={
          entity ? (
            <div className="f ac gp8 wrap">
              <Can action="updateLmsEntity">
                <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(true)}>
                  {entity.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              <Can action="deleteLmsEntity">
                <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>Delete</button>
              </Can>
              <Can action="updateLmsEntity">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${entity.id}/edit`)}>Edit</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !entity} error={detail.error} onRetry={() => void detail.reload()} />

      {entity ? (
        <>
          <SelectionWarnings entity={entity} />

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Entity details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Entity name', entity.name],
                    [
                      'Entity code',
                      <span>
                        <span className="mono">{entity.code}</span>
                        {entity.related?.codeLocked ? <span className="muted fs12"> · locked (courses use this entity)</span> : null}
                      </span>,
                    ],
                    ['Description', entity.description ?? '—'],
                    ['Default language', languageLabel(entity.defaultLanguage, options.data?.languages)],
                    ['Time zone', entity.timeZone],
                    ['Status', <MasterStatusBadge isActive={entity.isActive} />],
                    ['Created', fmtDateTime(entity.createdAt)],
                    ['Last updated', fmtDateTime(entity.updatedAt)],
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Usage</h3></div>
              <div className="card-b">
                {references.length ? (
                  <>
                    <KvList pairs={references.map((r) => [r.label, r.locksCode ? 'Freezes the entity code' : 'Blocks deletion'])} />
                    <p className="muted fs12" style={{ marginTop: 8 }}>
                      This entity cannot be deleted while LMS records use it. Deactivate it instead.
                    </p>
                  </>
                ) : (
                  <p className="muted fs12" style={{ margin: 0 }}>No LMS record uses this entity yet.</p>
                )}
                <div className="callout c-info" style={{ marginTop: 10 }}>
                  <div>
                    <b>Not available yet. </b>
                    Course, batch and learner counts (UI-310), the mapping to programme records (UI-311) and entity contacts are not shown:
                    LMS batches, learners and the Admin Panel programme mapping do not exist in this system yet, and the specification defines
                    no entity contact fields (To Be Confirmed).
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid g2">
            <div className="card">
              <div className="card-h">
                <h3>Enabled centres <span className="sub">{entity.enabledCentres.length}</span></h3>
              </div>
              {entity.enabledCentres.length ? (
                <div className="tbl-wrap">
                  <table className="tbl" aria-label="Enabled centres">
                    <thead>
                      <tr><th style={{ width: 76 }}>Sr. No.</th><th>Centre</th><th>Code</th><th>District</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {entity.enabledCentres.map((c, i) => (
                        <tr key={c.id} className="norow">
                          <td className="muted fs12">{i + 1}</td>
                          <td>{c.name}</td>
                          <td className="mono fs12">{c.code}</td>
                          <td className="fs12">{c.districtName ?? '—'}</td>
                          <td><MasterStatusBadge isActive={c.isActive} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-b muted fs12">No centre is enabled yet.</div>
              )}
            </div>

            <div className="card">
              <div className="card-h">
                <h3>Enabled tracks <span className="sub">{entity.enabledTracks.length}</span></h3>
              </div>
              {entity.enabledTracks.length ? (
                <div className="tbl-wrap">
                  <table className="tbl" aria-label="Enabled tracks">
                    <thead>
                      <tr><th style={{ width: 76 }}>Sr. No.</th><th>Code</th><th>Track</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {entity.enabledTracks.map((t, i) => (
                        <tr key={t.id} className="norow">
                          <td className="muted fs12">{i + 1}</td>
                          <td className="mono fs12">{t.code}</td>
                          <td>{t.name}</td>
                          <td><MasterStatusBadge isActive={t.isActive} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-b muted fs12">No track is enabled yet.</div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {confirming && entity ? (
        <ConfirmModal
          title={entity.isActive ? 'Deactivate entity' : 'Activate entity'}
          busy={busy}
          confirmLabel={entity.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${entity.isActive ? 'deactivate' : 'activate'} the entity ${entity.name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => lmsEntityService.setStatus(entity.id, !entity.isActive), entity.isActive ? 'Entity deactivated' : 'Entity activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
      {deleting && entity ? (
        <ConfirmModal
          title="Delete entity"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'lms-entity', id: entity.id }}
          message={`Delete the entity ${entity.name}? It is archived (soft-deleted) and kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(() => lmsEntityService.remove(entity.id), 'Entity deleted', () => {
              setDeleting(false);
              navigate(LIST);
            })
          }
        />
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ImpactStatPreview from '../components/ImpactStatPreview';
import { IMPACT_CRUMBS, IMPACT_TAB_PATH, impactEditPath, statLabel } from '../constants';
import { impactService } from '../services/impactService';

/*
 * View Statistic — read-only detail page of one SARTHI's Impact card, reached from the View action (or a click on
 * the row) in the SARTHI's Impact tab of Home Page Management. Loads the saved record by its id.
 */
export default function ImpactStatView() {
  usePageTitle('Statistic — SARTHI Impact Management');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => impactService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const s = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...IMPACT_CRUMBS, { l: 'View' }]}
        title={s ? s.label.en : 'Statistic'}
        badge={s ? <span className="tag">Order {s.displayOrder}</span> : undefined}
        back={<BackButton to={IMPACT_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {s ? (
              <>
                <Can action="deleteImpactStat">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateImpactStat">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => impactService.setStatus(s.id, !s.isActive),
                        s.isActive ? 'Statistic deactivated' : 'Statistic activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {s.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateImpactStat">
                  <button type="button" className="btn primary" onClick={() => go(impactEditPath(s.id))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {s ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h">
              <h3>Statistic details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Figure', s.value],
                  ['Label (Marathi)', <span lang="mr">{s.label.mr}</span>],
                  ['Label (English)', <span lang="en">{s.label.en}</span>],
                  ['Display order', String(s.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={s.isActive} />],
                  ['On the website', s.isActive ? "Shown in the SARTHI's Impact section of the home page" : 'Hidden from the home page'],
                  ['Created', fmtDateTime(s.createdAt)],
                  ['Last updated', fmtDateTime(s.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>
                Preview <span className="sub">the card as the home page draws it</span>
              </h3>
            </div>
            <div className="card-b">
              <ImpactStatPreview value={s.value} label={s.label} />
            </div>
          </div>
        </div>
      ) : null}

      {s && deleting ? (
        <ConfirmModal
          title="Delete statistic"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${statLabel(s)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => impactService.remove(s.id),
              'Statistic deleted',
              () => {
                setDeleting(false);
                navigate(IMPACT_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

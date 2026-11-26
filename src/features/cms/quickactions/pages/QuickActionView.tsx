import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import QuickActionsPreview from '../components/QuickActionsPreview';
import { QUICK_ACTIONS_CRUMBS, QUICK_ACTIONS_TAB_PATH, quickActionEditPath, quickActionIconLabel, quickActionName } from '../constants';
import { quickActionsService } from '../services/quickActionsService';

/* Where a click on the tile leads, said in words: a page of this website or another site. */
function Destination({ link }: { link: string }) {
  return (
    <div>
      <span className="mono">{link}</span>
      <div className="muted fs12">{link.startsWith('/') ? 'A page of the public website' : 'Another website, opened in a new tab'}</div>
    </div>
  );
}

/*
 * Quick action details — read-only detail page of one tile, reached from the View action (or a click on the row)
 * on the Quick Actions tab of Home Page Management. Loads the saved record by its id.
 */
export default function QuickActionView() {
  usePageTitle('Quick Action — Quick Actions');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => quickActionsService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;
  const hasSubtitle = !!item && !!(item.subtitle.mr || item.subtitle.en);

  return (
    <div className="page">
      <PageHead
        crumbs={[...QUICK_ACTIONS_CRUMBS, { l: 'View' }]}
        title={item ? item.title.en : 'Quick action details'}
        badge={item ? <span className="tag">Order {item.displayOrder}</span> : undefined}
        back={<BackButton to={QUICK_ACTIONS_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                <Can action="deleteQuickAction">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateQuickAction">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => quickActionsService.setStatus(item.id, !item.isActive),
                        item.isActive ? 'Quick action hidden from the website' : 'Quick action shown on the website',
                        () => detail.reload(),
                      )
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateQuickAction">
                  <button type="button" className="btn primary" onClick={() => go(quickActionEditPath(item.id))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {item ? (
        <div className="cms-sections">
          <div className="card mb14">
            <div className="card-h">
              <h3>
                Quick action preview <span className="sub">as the strip under the banner of the home page draws the tile</span>
              </h3>
            </div>
            <div className="card-b">
              <QuickActionsPreview tiles={[item]} />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Quick action details</h3>
            </div>
            <FieldTable
              rows={[
                ['Title', <Bi value={item.title} />],
                [
                  'Subtitle',
                  hasSubtitle ? <Bi value={item.subtitle} /> : <span className="muted">None — the tile shows the title alone</span>,
                ],
                [
                  'Icon',
                  <span className="f ac gp8">
                    <Icon name={item.icon} />
                    {quickActionIconLabel(item.icon)}
                  </span>,
                ],
                ['Destination', <Destination link={item.link} />],
                ['Display order', String(item.displayOrder)],
                ['Status', <MasterStatusBadge isActive={item.isActive} />],
                ['On the website', item.isActive ? 'Shown as a tile in the strip under the banner' : 'Hidden from the website'],
                ['Created', fmtDateTime(item.createdAt)],
                ['Last updated', fmtDateTime(item.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title="Delete quick action"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'quick-action', id: item.id }}
          message={`Delete ${quickActionName(item)}? The tile is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => quickActionsService.remove(item.id),
              'Quick action deleted',
              () => {
                setDeleting(false);
                navigate(QUICK_ACTIONS_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

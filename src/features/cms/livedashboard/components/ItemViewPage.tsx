import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { LIVE_DASHBOARD_CRUMBS, LIVE_DASHBOARD_TAB_PATH, itemName } from '../constants';
import type { Bilingual } from '../types/livedashboard.types';

interface Item {
  id: string;
  label: Bilingual;
  value: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/*
 * The read-only View page of a KPI card or a side figure, reached from the eye button (or a click on the row) in the
 * Live Dashboard tab. Loads the saved record by its id, with Delete, Activate / Deactivate and Edit in the head.
 */
export default function ItemViewPage<T extends Item>({
  noun,
  dependencyKind,
  load,
  setStatus,
  remove,
  editPath,
  details,
  aside,
}: {
  /* 'KPI card' or 'figure', as the title, buttons and messages name it. */
  noun: string;
  /* Its kind for the delete check (GET /dependencies/:kind/:id): 'live-dashboard-card' or 'live-dashboard-stat'. */
  dependencyKind: string;
  load: (id: string) => Promise<T>;
  setStatus: (id: string, isActive: boolean) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
  editPath: (id: string) => string;
  /* The kind's own rows, after the label and before order and status. */
  details: (item: T) => [string, ReactNode][];
  aside?: (item: T) => ReactNode;
}) {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  usePageTitle(`${Noun} — Live Dashboard`);
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => load(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);
  const item = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'View' }]}
        title={item ? item.label.en : Noun}
        badge={item ? <span className="tag">Order {item.displayOrder}</span> : undefined}
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
        actions={
          item ? (
            <div className="f ac gp8 wrap">
              <Can action="deleteLiveDashboardItem">
                <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                  Delete
                </button>
              </Can>
              <Can action="updateLiveDashboard">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => setStatus(item.id, !item.isActive),
                      `${Noun} ${item.isActive ? 'deactivated' : 'activated'}`,
                      () => detail.reload(),
                    )
                  }
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              <Can action="updateLiveDashboard">
                <button type="button" className="btn primary" onClick={() => go(editPath(item.id))}>
                  Edit
                </button>
              </Can>
            </div>
          ) : null
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {item ? (
        <div className={aside ? 'grid g2' : undefined}>
          <div className="card">
            <div className="card-h">
              <h3>{Noun} details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Label (Marathi)', <span lang="mr">{item.label.mr}</span>],
                  ['Label (English)', <span lang="en">{item.label.en}</span>],
                  ['Value', item.value],
                  ...details(item),
                  ['Display order', String(item.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={item.isActive} />],
                  ['On the website', item.isActive ? 'Shown in the Live Dashboard section of the home page' : 'Hidden from the home page'],
                  ['Created', fmtDateTime(item.createdAt)],
                  ['Last updated', fmtDateTime(item.updatedAt)],
                ]}
              />
            </div>
          </div>
          {aside ? aside(item) : null}
        </div>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title={`Delete ${noun}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: dependencyKind, id: item.id }}
          message={`Delete ${itemName(item)}? It is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => remove(item.id),
              `${Noun} deleted`,
              () => {
                setDeleting(false);
                navigate(LIVE_DASHBOARD_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

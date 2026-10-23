import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { ABOUT_CRUMBS, ABOUT_TAB_PATH, KINDS, aboutEditPath, itemLabel } from '../constants';
import { aboutService } from '../services/aboutService';
import type { AboutKind } from '../types/about.types';

/*
 * View Information Row / View About Card — the read-only detail page of one record, reached from the View action
 * (or a click on the row) in the About AMRUT tab of Home Page Management. Loads the saved record by its id.
 * Required cards (Mission, Vision, Values) offer no Activate / Deactivate or Delete: the server refuses both.
 */
export default function ItemView({ kind }: { kind: AboutKind }) {
  const k = KINDS[kind];
  usePageTitle(`${k.noun} — About AMRUT Management`);
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => aboutService.getItem(kind, id), [kind, id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ABOUT_CRUMBS, { l: 'View' }]}
        title={item ? item.first.en : k.noun}
        sub={item ? <span lang="mr">{item.first.mr}</span> : undefined}
        badge={item ? <span className="tag">Order {item.displayOrder}</span> : undefined}
        back={<BackButton to={ABOUT_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                {!item.isRequired ? (
                  <Can action="deleteAboutItem">
                    <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                      Delete
                    </button>
                  </Can>
                ) : null}
                {!item.isRequired ? (
                  <Can action="updateAbout">
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => aboutService.setItemStatus(kind, item.id, !item.isActive),
                          item.isActive ? `${k.noun} deactivated` : `${k.noun} activated`,
                          () => detail.reload(),
                        )
                      }
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </Can>
                ) : null}
                <Can action="updateAbout">
                  <button type="button" className="btn primary" onClick={() => go(aboutEditPath(kind, item.id))}>
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
          <div className="card">
            <div className="card-h">
              <h3>
                {k.noun} details <span className="sub">as the About AMRUT section shows them, Marathi first</span>
              </h3>
            </div>
            <FieldTable
              rows={[
                [k.first.label, <Bi value={item.first} />],
                [k.second.label, <Bi value={item.second} />],
                ['Display order', String(item.displayOrder)],
                ['Status', <MasterStatusBadge isActive={item.isActive} />],
                [
                  'On the website',
                  item.isActive ? 'Shown in the About AMRUT section of the home page and the About page' : 'Hidden from the website',
                ],
                ...(kind === 'cards'
                  ? ([
                      [
                        'Required card',
                        item.isRequired
                          ? 'Yes — one of Mission, Vision and Values: always shown, can be edited and re-ordered but not deactivated or deleted'
                          : 'No',
                      ],
                    ] as [string, string][])
                  : []),
                ['Created', fmtDateTime(item.createdAt)],
                ['Last updated', fmtDateTime(item.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title={`Delete ${k.nounLower}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${itemLabel(item)}? It is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => aboutService.removeItem(kind, item.id),
              `${k.noun} deleted`,
              () => {
                setDeleting(false);
                navigate(ABOUT_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import TopBarPreview from '../components/TopBarPreview';
import { FALLBACK_GOVERNMENT_NAME, TOPBAR_CRUMBS, TOPBAR_TAB_PATH, topBarLinkEditPath, topBarLinkName } from '../constants';
import { topBarService } from '../services/topBarService';

/* Where a click on the button leads, said in words: a page of this website or another site. */
function Destination({ link }: { link: string }) {
  return (
    <div>
      <span className="mono">{link}</span>
      <div className="muted fs12">{link.startsWith('/') ? 'A page of the public website' : 'Another website'}</div>
    </div>
  );
}

/*
 * View Link — read-only detail page of one top bar link, reached from the View action (or a click on the row)
 * on the Top Bar tab of Home Page Management. Loads the saved record by its id.
 */
export default function TopBarLinkView() {
  usePageTitle('Link — Top Bar');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => topBarService.get(id), [id]);
  /* Only for the government name and language switch the strip draws around the button. */
  const settings = useApiData(() => topBarService.getSettings(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;
  const strip = settings.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...TOPBAR_CRUMBS, { l: 'View' }]}
        title={item ? item.label.en : 'Link'}
        badge={item ? <span className="tag">Order {item.displayOrder}</span> : undefined}
        back={<BackButton to={TOPBAR_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                <Can action="deleteTopBarLink">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateTopBar">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => topBarService.setStatus(item.id, !item.isActive),
                        item.isActive ? 'Link deactivated' : 'Link activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateTopBar">
                  <button type="button" className="btn primary" onClick={() => go(topBarLinkEditPath(item.id))}>
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
                Top bar preview <span className="sub">as the strip at the top of the website draws the button</span>
              </h3>
            </div>
            <div className="card-b">
              <TopBarPreview
                governmentName={strip ? strip.governmentName : FALLBACK_GOVERNMENT_NAME}
                showLanguageToggle={strip?.showLanguageToggle ?? true}
                buttons={[{ label: item.label, link: item.link }]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Link details</h3>
            </div>
            <FieldTable
              rows={[
                ['Label', <Bi value={item.label} />],
                ['Link', <Destination link={item.link} />],
                ['Display order', String(item.displayOrder)],
                ['Status', <MasterStatusBadge isActive={item.isActive} />],
                ['On the website', item.isActive ? 'Shown as a button in the top bar' : 'Hidden from the website'],
                ['Created', fmtDateTime(item.createdAt)],
                ['Last updated', fmtDateTime(item.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title="Delete link"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${topBarLinkName(item)}? The button is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => topBarService.remove(item.id),
              'Link deleted',
              () => {
                setDeleting(false);
                navigate(TOPBAR_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

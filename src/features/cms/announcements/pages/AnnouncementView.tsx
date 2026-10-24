import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dash, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import AnnouncementPreview from '../components/AnnouncementPreview';
import { ANNOUNCEMENTS_CRUMBS, ANNOUNCEMENTS_TAB_PATH, FALLBACK_TICKER_LABEL, announcementEditPath, announcementLabel } from '../constants';
import { announcementsService } from '../services/announcementsService';
import type { Bilingual } from '../types/announcements.types';

/* A Marathi / English pair, or a dash when there is none. */
const Text = ({ value }: { value: Bilingual | null }) => (value && (value.mr || value.en) ? <Bi value={value} /> : <Dash />);

/* Where a click on the item leads, said in words: a page of this website, another site, or nowhere. */
function Destination({ link }: { link: string | null }) {
  if (!link) return <span className="muted">No link — the item is plain text in the ticker</span>;
  return (
    <div>
      <span className="mono">{link}</span>
      <div className="muted fs12">{link.startsWith('/') ? 'A page of the public website' : 'Another site, opened in a new tab'}</div>
    </div>
  );
}

/*
 * View Announcement — read-only detail page of one announcement, reached from the View action (or a click on the
 * row) on the Announcements tab of Home Page Management. Loads the saved record by its id.
 */
export default function AnnouncementView() {
  usePageTitle('Announcement — Announcements');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => announcementsService.get(id), [id]);
  /* Only for the label the ticker prints before the items. */
  const section = useApiData(() => announcementsService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ANNOUNCEMENTS_CRUMBS, { l: 'View' }]}
        title={item ? item.title.en : 'Announcement'}
        badge={item ? <span className="tag">Order {item.displayOrder}</span> : undefined}
        back={<BackButton to={ANNOUNCEMENTS_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                <Can action="deleteAnnouncement">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateAnnouncement">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => announcementsService.setStatus(item.id, !item.isActive),
                        item.isActive ? 'Announcement deactivated' : 'Announcement activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateAnnouncement">
                  <button type="button" className="btn primary" onClick={() => go(announcementEditPath(item.id))}>
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
                Ticker preview <span className="sub">as the strip at the top of the website prints it</span>
              </h3>
            </div>
            <div className="card-b">
              <AnnouncementPreview
                label={section.data?.label ?? FALLBACK_TICKER_LABEL}
                title={item.title}
                detail={item.detail ?? { mr: '', en: '' }}
                link={item.link ?? ''}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Announcement details</h3>
            </div>
            <FieldTable
              rows={[
                ['Title', <Text value={item.title} />],
                ['Detail', <Text value={item.detail} />],
                ['Link', <Destination link={item.link} />],
                ['Display order', String(item.displayOrder)],
                ['Status', <MasterStatusBadge isActive={item.isActive} />],
                ['On the website', item.isActive ? 'Scrolls past in the announcements ticker' : 'Hidden from the website'],
                ['Created', fmtDateTime(item.createdAt)],
                ['Last updated', fmtDateTime(item.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title="Delete announcement"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${announcementLabel(item)}? The announcement is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => announcementsService.remove(item.id),
              'Announcement deleted',
              () => {
                setDeleting(false);
                navigate(ANNOUNCEMENTS_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

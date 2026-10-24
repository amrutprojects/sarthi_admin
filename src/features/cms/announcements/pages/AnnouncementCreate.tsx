import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import { toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import AnnouncementForm from '../components/AnnouncementForm';
import { ANNOUNCEMENTS_CRUMBS, ANNOUNCEMENTS_TAB_PATH } from '../constants';
import { announcementsService } from '../services/announcementsService';
import { announcementPayload, emptyAnnouncementForm } from '../validation/announcements.validation';

/* Add announcement — a dedicated page, reached from the button on the listing. */
export default function AnnouncementCreate() {
  usePageTitle('Add Announcement — Announcements');
  const navigate = useNavigate();
  const can = useCan();
  const section = useApiData(() => announcementsService.getSection(), []);
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server
   * instead of adding the announcement twice. After a definitive refusal (a 4xx) the next attempt is a
   * new submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...ANNOUNCEMENTS_CRUMBS, { l: 'Add announcement' }]}
        title="Add Announcement"
        sub="Adds an item to the ticker that scrolls across the top of the public website. Text is entered in Marathi and English — the site defaults to Marathi."
        back={<BackButton to={ANNOUNCEMENTS_TAB_PATH} />}
      />
      {can('createAnnouncement') ? (
        <AnnouncementForm
          initial={emptyAnnouncementForm()}
          submitLabel="Save announcement"
          backTo={ANNOUNCEMENTS_TAB_PATH}
          isCreate
          tickerLabel={section.data?.label ?? null}
          onSave={async (values) => {
            try {
              await announcementsService.create(announcementPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Announcement added');
            navigate(ANNOUNCEMENTS_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add announcements">
          Adding an announcement needs the &ldquo;Add Announcements&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

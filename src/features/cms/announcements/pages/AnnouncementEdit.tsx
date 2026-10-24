import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import AnnouncementForm from '../components/AnnouncementForm';
import { ANNOUNCEMENTS_CRUMBS, ANNOUNCEMENTS_TAB_PATH } from '../constants';
import { announcementsService } from '../services/announcementsService';
import { announcementChanges, announcementToForm } from '../validation/announcements.validation';

/*
 * Edit Announcement — a dedicated page that loads the announcement's saved record by its id, so the form
 * always starts from what is stored. Only the fields changed here are sent, with the version the page was
 * opened at; a save over someone else's newer edit is refused rather than overwriting it.
 */
export default function AnnouncementEdit() {
  usePageTitle('Edit Announcement — Announcements');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => announcementsService.get(id), [id]);
  const section = useApiData(() => announcementsService.getSection(), []);
  const a = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ANNOUNCEMENTS_CRUMBS, { l: 'Edit' }]}
        title={a ? `Edit ${a.title.en}` : 'Edit Announcement'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={ANNOUNCEMENTS_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {a && !can('updateAnnouncement') ? (
        <Callout tone="warn" title="You can view this section but not edit announcements">
          Editing an announcement needs the &ldquo;Update Announcements&rdquo; permission.
        </Callout>
      ) : null}
      {a && can('updateAnnouncement') ? (
        <AnnouncementForm
          key={a.updatedAt}
          initial={announcementToForm(a)}
          submitLabel="Save changes"
          backTo={ANNOUNCEMENTS_TAB_PATH}
          isCreate={false}
          tickerLabel={section.data?.label ?? null}
          onSave={async (values) => {
            await announcementsService.update(a.id, announcementChanges(a, values));
            toastOk('Announcement updated');
            navigate(ANNOUNCEMENTS_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

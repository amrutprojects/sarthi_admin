import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import TopBarLinkForm from '../components/TopBarLinkForm';
import { TOPBAR_CRUMBS, TOPBAR_TAB_PATH } from '../constants';
import { topBarService } from '../services/topBarService';
import { topBarLinkChanges, topBarLinkToForm } from '../validation/topbar.validation';

/*
 * Edit Link — a dedicated page that loads the link's saved record by its id, so the form always starts from
 * what is stored. Only the fields changed here are sent, with the version the page was opened at; a save over
 * someone else's newer edit is refused rather than overwriting it.
 */
export default function TopBarLinkEdit() {
  usePageTitle('Edit Link — Top Bar');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => topBarService.get(id), [id]);
  const settings = useApiData(() => topBarService.getSettings(), []);
  const l = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...TOPBAR_CRUMBS, { l: 'Edit' }]}
        title={l ? `Edit ${l.label.en}` : 'Edit Link'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={TOPBAR_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {l && !can('updateTopBar') ? (
        <Callout tone="warn" title="You can view this section but not edit links">
          Editing a link needs the &ldquo;Update Top Bar&rdquo; permission.
        </Callout>
      ) : null}
      {l && can('updateTopBar') ? (
        <TopBarLinkForm
          key={l.updatedAt}
          initial={topBarLinkToForm(l)}
          submitLabel="Save changes"
          backTo={TOPBAR_TAB_PATH}
          isCreate={false}
          settings={settings.data ?? null}
          onSave={async (values) => {
            await topBarService.update(l.id, topBarLinkChanges(l, values));
            toastOk('Link updated');
            navigate(TOPBAR_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

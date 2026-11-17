import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import QuickActionForm from '../components/QuickActionForm';
import { QUICK_ACTIONS_CRUMBS, QUICK_ACTIONS_TAB_PATH } from '../constants';
import { quickActionsService } from '../services/quickActionsService';
import { quickActionChanges, quickActionToForm } from '../validation/quickactions.validation';

/*
 * Edit quick action — a dedicated page that loads the tile's saved record by its id, so the form always starts
 * from what is stored. Only the fields changed here are sent, with the version the page was opened at; a save over
 * someone else's newer edit is refused rather than overwriting it.
 */
export default function QuickActionEdit() {
  usePageTitle('Edit Quick Action — Quick Actions');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => quickActionsService.get(id), [id]);
  const a = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...QUICK_ACTIONS_CRUMBS, { l: 'Edit' }]}
        title={a ? `Edit ${a.title.en}` : 'Edit quick action'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={QUICK_ACTIONS_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {a && !can('updateQuickAction') ? (
        <Callout tone="warn" title="You can view this section but not edit quick actions">
          Editing a quick action needs the &ldquo;Update Quick Actions&rdquo; permission.
        </Callout>
      ) : null}
      {a && can('updateQuickAction') ? (
        <QuickActionForm
          key={a.updatedAt}
          initial={quickActionToForm(a)}
          submitLabel="Save changes"
          backTo={QUICK_ACTIONS_TAB_PATH}
          isCreate={false}
          onSave={async (values) => {
            await quickActionsService.update(a.id, quickActionChanges(a, values));
            toastOk('Quick action updated');
            navigate(QUICK_ACTIONS_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

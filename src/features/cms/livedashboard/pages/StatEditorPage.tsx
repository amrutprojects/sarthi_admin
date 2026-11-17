import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import BackButton from '../../components/BackButton';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import StatForm from '../components/StatForm';
import { LIVE_DASHBOARD_CRUMBS, LIVE_DASHBOARD_TAB_PATH } from '../constants';
import { liveDashboardStatsService } from '../services/liveDashboardService';
import { emptyStatForm, statChanges, statPayload, statToForm } from '../validation/livedashboard.validation';

/*
 * Add side figure (/cms/live-dashboard/stats/create) and Edit side figure (/cms/live-dashboard/stats/:id/edit): one
 * line of the list beside the training modes donut. Edit sends only what changed, with the version it was opened at.
 */
export default function StatEditorPage() {
  const { id } = useParams();
  return id ? <EditStat id={id} /> : <AddStat />;
}

function AddStat() {
  usePageTitle('Add Figure — Live Dashboard');
  const navigate = useNavigate();
  const can = useCan();
  /* One key per submission, renewed after a definitive refusal (see CardEditorPage). */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'Add figure' }]}
        title="Add Figure"
        sub="Adds a line to the list beside the training modes donut. The label is entered in Marathi and English."
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
      />
      {can('createLiveDashboardItem') ? (
        <StatForm
          initial={emptyStatForm()}
          submitLabel="Save figure"
          backTo={LIVE_DASHBOARD_TAB_PATH}
          isCreate
          onSave={async (values) => {
            try {
              await liveDashboardStatsService.create(statPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('Figure added');
            navigate(LIVE_DASHBOARD_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add figures">
          Adding a figure needs the &ldquo;Add Live Dashboard&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

function EditStat({ id }: { id: string }) {
  usePageTitle('Edit Figure — Live Dashboard');
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => liveDashboardStatsService.get(id), [id]);
  const s = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'Edit figure' }]}
        title={s ? `Edit ${s.label.en}` : 'Edit Figure'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {s && !can('updateLiveDashboard') ? (
        <Callout tone="warn" title="You can view this section but not edit figures">
          Editing a figure needs the &ldquo;Update Live Dashboard&rdquo; permission.
        </Callout>
      ) : null}
      {s && can('updateLiveDashboard') ? (
        <StatForm
          key={s.updatedAt}
          initial={statToForm(s)}
          submitLabel="Save changes"
          backTo={LIVE_DASHBOARD_TAB_PATH}
          isCreate={false}
          onSave={async (values) => {
            await liveDashboardStatsService.update(s.id, statChanges(s, values));
            toastOk('Figure updated');
            navigate(LIVE_DASHBOARD_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

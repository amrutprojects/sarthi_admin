import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import BackButton from '../../components/BackButton';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import CardForm from '../components/CardForm';
import { LIVE_DASHBOARD_CRUMBS, LIVE_DASHBOARD_TAB_PATH } from '../constants';
import { liveDashboardCardsService } from '../services/liveDashboardService';
import { cardChanges, cardPayload, cardToForm, emptyCardForm } from '../validation/livedashboard.validation';

/*
 * Add KPI card (/cms/live-dashboard/cards/create) and Edit KPI card (/cms/live-dashboard/cards/:id/edit). Edit loads
 * the card's saved record by its id, so the form always starts from what is stored, and sends only the fields changed
 * here with the version the page was opened at: a save over someone else's newer edit is refused, not an overwrite.
 */
export default function CardEditorPage() {
  const { id } = useParams();
  return id ? <EditCard id={id} /> : <AddCard />;
}

function AddCard() {
  usePageTitle('Add KPI Card — Live Dashboard');
  const navigate = useNavigate();
  const can = useCan();
  /*
   * One key per submission: a retry of it (double click, lost response) is replayed by the server instead of adding
   * the card twice. After a definitive refusal (a 4xx) the next attempt is a new submission and gets a new key.
   */
  const key = useRef(newIdempotencyKey());

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'Add KPI card' }]}
        title="Add KPI Card"
        sub="Adds a card to the rows of figures at the top of the Live Dashboard section. Texts are entered in Marathi and English — the site defaults to Marathi."
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
      />
      {can('createLiveDashboardItem') ? (
        <CardForm
          initial={emptyCardForm()}
          submitLabel="Save card"
          backTo={LIVE_DASHBOARD_TAB_PATH}
          isCreate
          onSave={async (values) => {
            try {
              await liveDashboardCardsService.create(cardPayload(values), key.current);
            } catch (err) {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
              throw err;
            }
            toastOk('KPI card added');
            navigate(LIVE_DASHBOARD_TAB_PATH);
          }}
        />
      ) : (
        <Callout tone="warn" title="You can view this section but not add cards">
          Adding a card needs the &ldquo;Add Live Dashboard&rdquo; permission.
        </Callout>
      )}
    </div>
  );
}

function EditCard({ id }: { id: string }) {
  usePageTitle('Edit KPI Card — Live Dashboard');
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => liveDashboardCardsService.get(id), [id]);
  const c = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'Edit KPI card' }]}
        title={c ? `Edit ${c.label.en}` : 'Edit KPI Card'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {c && !can('updateLiveDashboard') ? (
        <Callout tone="warn" title="You can view this section but not edit cards">
          Editing a card needs the &ldquo;Update Live Dashboard&rdquo; permission.
        </Callout>
      ) : null}
      {c && can('updateLiveDashboard') ? (
        <CardForm
          key={c.updatedAt}
          initial={cardToForm(c)}
          submitLabel="Save changes"
          backTo={LIVE_DASHBOARD_TAB_PATH}
          isCreate={false}
          onSave={async (values) => {
            await liveDashboardCardsService.update(c.id, cardChanges(c, values));
            toastOk('KPI card updated');
            navigate(LIVE_DASHBOARD_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

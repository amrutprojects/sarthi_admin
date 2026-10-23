import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ImpactStatForm from '../components/ImpactStatForm';
import { IMPACT_CRUMBS, IMPACT_TAB_PATH } from '../constants';
import { impactService } from '../services/impactService';
import { statChanges, statToForm } from '../validation/impact.validation';

/*
 * Edit Statistic — a dedicated page that loads the card's saved record by its id, so the form always
 * starts from what is stored. Only the fields changed here are sent, with the version the page was
 * opened at; a save over someone else's newer edit is refused rather than overwriting it.
 */
export default function ImpactStatEdit() {
  usePageTitle('Edit Statistic — AMRUT Impact Management');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => impactService.get(id), [id]);
  const s = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...IMPACT_CRUMBS, { l: 'Edit' }]}
        title={s ? `Edit ${s.label.en}` : 'Edit Statistic'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={IMPACT_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {s && !can('updateImpactStat') ? (
        <Callout tone="warn" title="You can view this section but not edit statistics">
          Editing a statistic needs the &ldquo;Update AMRUT Impact Management&rdquo; permission.
        </Callout>
      ) : null}
      {s && can('updateImpactStat') ? (
        <ImpactStatForm
          key={s.updatedAt}
          initial={statToForm(s)}
          submitLabel="Save changes"
          backTo={IMPACT_TAB_PATH}
          isCreate={false}
          onSave={async (values) => {
            await impactService.update(s.id, statChanges(s, values));
            toastOk('Statistic updated');
            navigate(IMPACT_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

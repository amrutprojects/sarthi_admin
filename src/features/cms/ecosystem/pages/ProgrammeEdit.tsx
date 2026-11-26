import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ProgrammeForm from '../components/ProgrammeForm';
import { ECOSYSTEM_CRUMBS, ECOSYSTEM_TAB_PATH } from '../constants';
import { ecosystemService } from '../services/ecosystemService';
import { programmeChanges, programmeToForm } from '../validation/ecosystem.validation';

/*
 * Edit Programme — a dedicated page that loads the card's saved record by its id, so the form always
 * starts from what is stored. Only the fields changed here are sent, with the version the page was
 * opened at; a save over someone else's newer edit is refused rather than overwriting it.
 */
export default function ProgrammeEdit() {
  usePageTitle('Edit Programme — The SARTHI Ecosystem');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => ecosystemService.get(id), [id]);
  const section = useApiData(() => ecosystemService.getSection(), []);
  const p = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ECOSYSTEM_CRUMBS, { l: 'Edit' }]}
        title={p ? `Edit ${p.name.mr} / ${p.name.en}` : 'Edit Programme'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={ECOSYSTEM_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {p && !can('updateEcosystemProgramme') ? (
        <Callout tone="warn" title="You can view this section but not edit programmes">
          Editing a programme needs the &ldquo;Update The SARTHI Ecosystem&rdquo; permission.
        </Callout>
      ) : null}
      {p && can('updateEcosystemProgramme') ? (
        <ProgrammeForm
          key={p.updatedAt}
          initial={programmeToForm(p)}
          submitLabel="Save changes"
          backTo={ECOSYSTEM_TAB_PATH}
          isCreate={false}
          defaultLabel={section.data?.linkLabel ?? null}
          onSave={async (values) => {
            await ecosystemService.update(p.id, programmeChanges(p, values));
            toastOk('Programme updated');
            navigate(ECOSYSTEM_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

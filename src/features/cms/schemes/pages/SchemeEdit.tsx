import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import SchemeForm from '../components/SchemeForm';
import { SCHEMES_CRUMBS, SCHEMES_TAB_PATH } from '../constants';
import { schemesService } from '../services/schemesService';
import { schemeChanges, schemeToForm } from '../validation/schemes.validation';

/*
 * Edit Scheme — a dedicated page that loads the scheme's saved record by its id, so the form always
 * starts from what is stored. Only the fields changed here are sent, with the version the page was
 * opened at; a save over someone else's newer edit is refused rather than overwriting it.
 */
export default function SchemeEdit() {
  usePageTitle('Edit Scheme — AMRUT Schemes Management');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => schemesService.get(id), [id]);
  const section = useApiData(() => schemesService.getSection(), []);
  const s = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...SCHEMES_CRUMBS, { l: 'Edit' }]}
        title={s ? `Edit ${s.title.en}` : 'Edit Scheme'}
        sub="Changes appear on the public website once saved."
        back={<BackButton to={SCHEMES_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {s && !can('updateScheme') ? (
        <Callout tone="warn" title="You can view this section but not edit schemes">
          Editing a scheme needs the &ldquo;Update AMRUT Schemes Management&rdquo; permission.
        </Callout>
      ) : null}
      {s && can('updateScheme') ? (
        <SchemeForm
          key={s.updatedAt}
          initial={schemeToForm(s)}
          submitLabel="Save changes"
          backTo={SCHEMES_TAB_PATH}
          isCreate={false}
          defaultLabel={section.data?.buttonLabel ?? null}
          onSave={async (values) => {
            await schemesService.update(s.id, schemeChanges(s, values));
            toastOk('Scheme updated');
            navigate(SCHEMES_TAB_PATH);
          }}
        />
      ) : null}
    </div>
  );
}

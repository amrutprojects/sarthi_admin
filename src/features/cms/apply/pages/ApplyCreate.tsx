import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { applyService } from '../services/applyService';
import { KIND_TAB, applyListPath } from '../types/apply.types';
import { parseKind } from '../validation/apply.validation';
import ApplyForm from './ApplyForm';

/*
 * Add Application Step / Add Information Row — a dedicated page, reached from the two Add buttons on the
 * listing. ?kind= picks the type the form opens with; switching it in the form updates the URL, so the
 * title, and a reload, follow what is being added.
 */
export default function ApplyCreate() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind = parseKind(params.get('kind'));
  const title = kind === 'STEP' ? 'Add Application Step' : 'Add Information Row';
  usePageTitle(title);
  /* Back and Cancel return to the listing tab of the type being added. */
  const listPath = applyListPath(KIND_TAB[kind]);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Apply Page Management', link: listPath }, { l: title }]}
        title={title}
        sub={
          kind === 'STEP'
            ? 'Adds a step to the numbered application steps on the public Apply page, in Marathi and English.'
            : 'Adds a row to the "For Your Information" card on the public Apply page, in Marathi and English.'
        }
        back={<BackButton to={listPath} />}
      />
      <ApplyForm
        initialKind={kind}
        onKindChange={(next) => setParams({ kind: next }, { replace: true })}
        submitLabel={kind === 'STEP' ? 'Create step' : 'Create row'}
        backTo={listPath}
        onSave={async (values) => {
          const created = await applyService.create(values);
          toastOk(created.kind === 'STEP' ? 'Application step created' : 'Information row created');
          navigate(`/cms/apply/${created.id}`);
        }}
      />
    </div>
  );
}

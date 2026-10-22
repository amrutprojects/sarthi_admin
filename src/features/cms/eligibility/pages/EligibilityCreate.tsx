import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { eligibilityService } from '../services/eligibilityService';
import { parseKind } from '../validation/eligibility.validation';
import EligibilityForm from './EligibilityForm';

/*
 * Add Eligibility Criterion / Add Required Document — a dedicated page, reached from the two Add buttons
 * on the listing. ?kind= picks the type the form opens with; switching it in the form updates the URL,
 * so the title, and a reload, follow what is being added.
 */
export default function EligibilityCreate() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind = parseKind(params.get('kind'));
  const title = kind === 'CRITERION' ? 'Add Eligibility Criterion' : 'Add Required Document';
  usePageTitle(title);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Eligibility Page Management', link: '/cms/eligibility' }, { l: title }]}
        title={title}
        sub={
          kind === 'CRITERION'
            ? 'Adds a row to the eligibility criteria card on the public Eligibility page, in Marathi and English.'
            : 'Adds a line to the required documents checklist on the public Eligibility page, in Marathi and English.'
        }
        back={<BackButton to="/cms/eligibility" />}
      />
      <EligibilityForm
        initialKind={kind}
        onKindChange={(next) => setParams({ kind: next }, { replace: true })}
        submitLabel={kind === 'CRITERION' ? 'Create criterion' : 'Create document'}
        backTo="/cms/eligibility"
        onSave={async (values) => {
          const created = await eligibilityService.create(values);
          toastOk(created.kind === 'CRITERION' ? 'Eligibility criterion created' : 'Required document created');
          navigate(`/cms/eligibility/${created.id}`);
        }}
      />
    </div>
  );
}

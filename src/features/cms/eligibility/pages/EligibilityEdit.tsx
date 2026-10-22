import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { eligibilityService } from '../services/eligibilityService';
import { KIND_LABEL } from '../types/eligibility.types';
import { toEligibilityItemFormValues } from '../validation/eligibility.validation';
import EligibilityForm from './EligibilityForm';

/* Edit criterion / document — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function EligibilityEdit() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => eligibilityService.get(id), [id]);
  const { busy, run } = useAction();

  const item = detail.data;
  const kindLabel = item ? KIND_LABEL[item.kind] : 'Item';
  const title = !item ? 'Edit Eligibility Item' : item.kind === 'CRITERION' ? 'Edit Eligibility Criterion' : 'Edit Required Document';
  usePageTitle(title);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Eligibility Page Management', link: '/cms/eligibility' },
          ...(item ? [{ l: item.label.en, link: `/cms/eligibility/${item.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={title}
        sub="Changes appear on the public Eligibility page as soon as they are saved."
        back={<BackButton to={item ? `/cms/eligibility/${item.id}` : '/cms/eligibility'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {item ? (
        <EligibilityForm
          initial={toEligibilityItemFormValues(item)}
          submitLabel="Save changes"
          confirmMessage={`Are you sure you want to save the changes to this ${kindLabel.toLowerCase()}?`}
          backTo={`/cms/eligibility/${item.id}`}
          onSave={async (values) => {
            await eligibilityService.update(item.id, {
              label: values.label,
              /* Only a criterion has a value; the server refuses one on a document. */
              ...(item.kind === 'CRITERION' ? { value: values.value } : {}),
              displayOrder: values.displayOrder,
            });
            toastOk(`${kindLabel} updated`);
            navigate(`/cms/eligibility/${item.id}`);
          }}
          statusSlot={
            <MasterField
              id="elig-status-current"
              label="Status"
              hint="An inactive item is kept here but not shown on the public Eligibility page."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={item.isActive} />
                <Can action="updateEligibility">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => eligibilityService.setStatus(item.id, !item.isActive),
                        item.isActive ? `${kindLabel} deactivated` : `${kindLabel} activated`,
                        () => detail.reload(),
                      )
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}
    </div>
  );
}

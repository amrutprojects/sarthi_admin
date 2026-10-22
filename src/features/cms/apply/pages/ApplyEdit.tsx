import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { applyService } from '../services/applyService';
import { ITEM_NAME, KIND_TAB, applyListPath } from '../types/apply.types';
import { toApplyItemFormValues } from '../validation/apply.validation';
import ApplyForm from './ApplyForm';

/* Edit step / at-a-glance row — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function ApplyEdit() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => applyService.get(id), [id]);
  const { busy, run } = useAction();

  const item = detail.data;
  const itemName = item ? ITEM_NAME[item.kind] : 'Item';
  const title = !item ? 'Edit Apply Page Item' : item.kind === 'STEP' ? 'Edit Application Step' : 'Edit At-a-glance Row';
  usePageTitle(title);
  /* The listing tab this item is on. */
  const listPath = item ? applyListPath(KIND_TAB[item.kind]) : '/cms/apply';

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Apply Page Management', link: listPath },
          ...(item ? [{ l: item.label.en, link: `/cms/apply/${item.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={title}
        sub="Changes appear on the public Apply page as soon as they are saved."
        back={<BackButton to={item ? `/cms/apply/${item.id}` : listPath} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {item ? (
        <ApplyForm
          initial={toApplyItemFormValues(item)}
          submitLabel="Save changes"
          confirmMessage={`Are you sure you want to save the changes to this ${itemName.toLowerCase()}?`}
          backTo={`/cms/apply/${item.id}`}
          onSave={async (values) => {
            await applyService.update(item.id, {
              label: values.label,
              value: values.value,
              displayOrder: values.displayOrder,
            });
            toastOk(`${itemName} updated`);
            navigate(`/cms/apply/${item.id}`);
          }}
          statusSlot={
            <MasterField
              id="apply-status-current"
              label="Status"
              hint="An inactive item is kept here but not shown on the public Apply page."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={item.isActive} />
                <Can action="updateApplyPage">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => applyService.setStatus(item.id, !item.isActive),
                        item.isActive ? `${itemName} deactivated` : `${itemName} activated`,
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

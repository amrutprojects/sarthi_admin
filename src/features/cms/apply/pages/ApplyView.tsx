import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { applyService } from '../services/applyService';
import { ITEM_NAME, KIND_TAB, applyListPath, type ApiApplyItem, type Bilingual } from '../types/apply.types';
import { labelName, valueName } from '../validation/apply.validation';

/* One language's label and value (a step's title and description), as the public Apply page shows them. */
function ItemCard({ title, lang, item }: { title: string; lang: keyof Bilingual; item: ApiApplyItem }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b" lang={lang}>
        <div className="hint">{labelName(item.kind)}</div>
        <b style={{ display: 'block', marginBottom: 12 }}>{item.label[lang]}</b>
        <div className="hint">{valueName(item.kind)}</div>
        <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{item.value[lang]}</p>
      </div>
    </div>
  );
}

/* View step / information row — read-only detail page, reached from the View action on the listing. */
export default function ApplyView() {
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => applyService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;
  const itemName = item ? ITEM_NAME[item.kind] : 'Item';
  /* Where the item appears on the public page, for the details and the confirmations. */
  const listName = item?.kind === 'FACT' ? '"For Your Information" card' : 'application steps';
  usePageTitle(item ? item.label.en : 'Apply page item');
  /* The listing tab this item is on: Back, the breadcrumb and a delete all return there. */
  const listPath = item ? applyListPath(KIND_TAB[item.kind]) : '/cms/apply';

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Apply Page Management', link: listPath },
          { l: item ? item.label.en : 'Apply page item' },
        ]}
        title={item ? item.label.en : 'Apply page item'}
        badge={
          item ? (
            <span className="tag">
              {itemName} · Order {item.displayOrder}
            </span>
          ) : undefined
        }
        back={<BackButton to={listPath} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                <Can action="deleteApplyItem">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateApplyPage">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateApplyPage">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/apply/${item.id}/edit`)}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {item ? (
        <>
          <div className="grid g2">
            <ItemCard title="Marathi" lang="mr" item={item} />
            <ItemCard title="English" lang="en" item={item} />
          </div>

          <div className="card mt14">
            <div className="card-h">
              <h3>{itemName} details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Type', item.kind === 'STEP' ? 'Application step' : 'Information row'],
                  ['Display order', String(item.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={item.isActive} />],
                  ['On the website', item.isActive ? `Shown in the ${listName}` : `Hidden from the ${listName}`],
                  ['Created', fmtDateTime(item.createdAt)],
                  ['Last updated', fmtDateTime(item.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}

      {item && deleting ? (
        <ConfirmModal
          title={`Delete ${itemName.toLowerCase()}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${item.label.en}"? It is removed from the ${listName} on the public Apply page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => applyService.remove(item.id),
              `${itemName} deleted`,
              () => {
                setDeleting(false);
                navigate(listPath);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

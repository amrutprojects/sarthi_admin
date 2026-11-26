import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { eligibilityService } from '../services/eligibilityService';
import { KIND_LABEL, KIND_TAB, eligibilityListPath, type ApiEligibilityItem, type Bilingual } from '../types/eligibility.types';
import { labelName } from '../validation/eligibility.validation';

/* One language's label (and, for a criterion, value), as the public Eligibility page shows it. */
function ItemCard({ title, lang, item }: { title: string; lang: keyof Bilingual; item: ApiEligibilityItem }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b" lang={lang}>
        <div className="hint">{labelName(item.kind)}</div>
        <b style={{ display: 'block', marginBottom: item.value ? 12 : 0 }}>{item.label[lang]}</b>
        {item.value ? (
          <>
            <div className="hint">Value</div>
            <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{item.value[lang]}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* View criterion / document — read-only detail page, reached from the View action on the listing. */
export default function EligibilityView() {
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => eligibilityService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const item = detail.data;
  const kindLabel = item ? KIND_LABEL[item.kind] : 'Item';
  /* Where the item appears on the public page, for the details and the confirmations. */
  const listName = item?.kind === 'DOCUMENT' ? 'required documents checklist' : 'eligibility criteria card';
  /* The listing tab this item is on, for Back and after a delete. */
  const listPath = item ? eligibilityListPath(KIND_TAB[item.kind]) : '/cms/eligibility';
  usePageTitle(item ? item.label.en : 'Eligibility item');

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Eligibility Page Management', link: listPath },
          { l: item ? item.label.en : 'Eligibility item' },
        ]}
        title={item ? item.label.en : 'Eligibility item'}
        badge={
          item ? (
            <span className="tag">
              {kindLabel} · Order {item.displayOrder}
            </span>
          ) : undefined
        }
        back={<BackButton to={listPath} />}
        actions={
          <div className="f ac gp8 wrap">
            {item ? (
              <>
                <Can action="deleteEligibility">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateEligibility">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateEligibility">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/eligibility/${item.id}/edit`)}>
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
              <h3>{kindLabel} details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Type', item.kind === 'CRITERION' ? 'Eligibility criterion' : 'Required document'],
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
          title={`Delete ${kindLabel.toLowerCase()}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'eligibility-item', id: item.id }}
          message={`Delete "${item.label.en}"? It is removed from the ${listName} on the public Eligibility page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => eligibilityService.remove(item.id),
              `${kindLabel} deleted`,
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

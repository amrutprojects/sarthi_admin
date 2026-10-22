import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { faqService } from '../services/faqService';
import type { Bilingual } from '../types/faq.types';

/* One language's question and answer, as the public FAQ page shows them. */
function QaCard({ title, lang, question, answer }: { title: string; lang: keyof Bilingual; question: Bilingual; answer: Bilingual }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b" lang={lang}>
        <div className="hint">Question</div>
        <b style={{ display: 'block', marginBottom: 12 }}>{question[lang]}</b>
        <div className="hint">Answer</div>
        <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{answer[lang]}</p>
      </div>
    </div>
  );
}

/* View FAQ — read-only detail page, reached from the View action on the listing. */
export default function FaqView() {
  usePageTitle('FAQ');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => faqService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const faq = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'FAQ Management', link: '/cms/faqs' }, { l: faq ? faq.question.en : 'FAQ' }]}
        title={faq ? faq.question.en : 'FAQ'}
        badge={faq ? <span className="tag">Order {faq.displayOrder}</span> : undefined}
        back={<BackButton to="/cms/faqs" />}
        actions={
          <div className="f ac gp8 wrap">
            {faq ? (
              <>
                <Can action="deleteFaq">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateFaq">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => faqService.setStatus(faq.id, !faq.isActive),
                        faq.isActive ? 'FAQ deactivated' : 'FAQ activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {faq.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateFaq">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/faqs/${faq.id}/edit`)}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {faq ? (
        <>
          <div className="grid g2">
            <QaCard title="Marathi" lang="mr" question={faq.question} answer={faq.answer} />
            <QaCard title="English" lang="en" question={faq.question} answer={faq.answer} />
          </div>

          <div className="card mt14">
            <div className="card-h">
              <h3>FAQ details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Display order', String(faq.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={faq.isActive} />],
                  ['On the website', faq.isActive ? 'Shown on the public FAQ page' : 'Hidden from the public FAQ page'],
                  ['Created', fmtDateTime(faq.createdAt)],
                  ['Last updated', fmtDateTime(faq.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}

      {faq && deleting ? (
        <ConfirmModal
          title="Delete FAQ"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${faq.question.en}"? It is removed from the public FAQ page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => faqService.remove(faq.id),
              'FAQ deleted',
              () => {
                setDeleting(false);
                navigate('/cms/faqs');
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

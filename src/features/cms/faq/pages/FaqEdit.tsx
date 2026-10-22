import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { faqService } from '../services/faqService';
import { toFaqFormValues } from '../validation/faq.validation';
import FaqForm from './FaqForm';

/* Edit FAQ — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function FaqEdit() {
  usePageTitle('Edit FAQ');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => faqService.get(id), [id]);
  const { busy, run } = useAction();

  const faq = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'FAQ Management', link: '/cms/faqs' },
          ...(faq ? [{ l: faq.question.en, link: `/cms/faqs/${faq.id}` }] : []),
          { l: 'Edit' },
        ]}
        title="Edit FAQ"
        sub="Changes appear on the public FAQ page as soon as they are saved."
        back={<BackButton to={faq ? `/cms/faqs/${faq.id}` : '/cms/faqs'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {faq ? (
        <FaqForm
          initial={toFaqFormValues(faq)}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this FAQ?"
          backTo={`/cms/faqs/${faq.id}`}
          onSave={async (values) => {
            await faqService.update(faq.id, { question: values.question, answer: values.answer, displayOrder: values.displayOrder });
            toastOk('FAQ updated');
            navigate(`/cms/faqs/${faq.id}`);
          }}
          statusSlot={
            <MasterField
              id="faq-status-current"
              label="Status"
              hint="An inactive question is kept here but not shown on the public FAQ page."
            >
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={faq.isActive} />
                <Can action="updateFaq">
                  <button
                    type="button"
                    className="btn xs"
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
              </div>
            </MasterField>
          }
        />
      ) : null}
    </div>
  );
}

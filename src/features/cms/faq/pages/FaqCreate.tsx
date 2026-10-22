import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { faqService } from '../services/faqService';
import FaqForm from './FaqForm';

/* Add FAQ — a dedicated page, reached from the Add FAQ button on the listing. */
export default function FaqCreate() {
  usePageTitle('Add FAQ');
  const navigate = useNavigate();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'FAQ Management', link: '/cms/faqs' }, { l: 'Add FAQ' }]}
        title="Add FAQ"
        sub="Adds a question and its answer to the public FAQ page, in Marathi and English."
        back={<BackButton to="/cms/faqs" />}
      />
      <FaqForm
        submitLabel="Create FAQ"
        backTo="/cms/faqs"
        onSave={async (values) => {
          const created = await faqService.create(values);
          toastOk('FAQ created');
          navigate(`/cms/faqs/${created.id}`);
        }}
      />
    </div>
  );
}

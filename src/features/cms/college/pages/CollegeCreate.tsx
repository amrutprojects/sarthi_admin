import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { collegeService } from '../services/collegeService';
import { emptyCollegeForm } from '../validation/college.validation';
import CollegeForm from './CollegeForm';

/* Add College — a dedicated page. ?stateId= / ?districtId= preselect the cascade when opened from a filtered listing. */
export default function CollegeCreate() {
  usePageTitle('Add College');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'College Master', link: '/cms/colleges' }, { l: 'Add College' }]}
        title="Add College"
        sub="A college is located in one district; the taluka is optional and must belong to that district."
        back={<BackButton to="/cms/colleges" />}
      />
      <CollegeForm
        initial={emptyCollegeForm(params.get('stateId') ?? '', params.get('districtId') ?? '')}
        submitLabel="Create college"
        backTo="/cms/colleges"
        onSave={async (values) => {
          const created = await collegeService.create(values);
          toastOk('College created');
          navigate(`/cms/colleges/${created.id}`);
        }}
      />
    </div>
  );
}

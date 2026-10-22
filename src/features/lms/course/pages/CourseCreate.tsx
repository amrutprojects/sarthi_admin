import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../../cms/components/BackButton';
import { toastOk } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { courseService } from '../services/courseService';
import { emptyCourseForm, toCreateInput } from '../validation/course.validation';
import CourseForm from './CourseForm';

const LIST = '/lms/courses';

/* Add Course — a dedicated page, reached from the Add Course button on the listing (?entityId= pre-selects the entity). */
export default function CourseCreate() {
  usePageTitle('Add Course');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entityId = params.get('entityId') ?? '';
  const initial = useMemo(() => emptyCourseForm(entityId), [entityId]);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Course Master', link: LIST }, { l: 'Add Course' }]}
        title="Add Course"
        sub="Creates a course of an LMS entity as a draft. Its four programme modules are added in the Module Master."
        back={<BackButton to={LIST} />}
      />

      <CourseForm
        initial={initial}
        submitLabel="Create course"
        backTo={LIST}
        onSave={async (values) => {
          const created = await courseService.create(toCreateInput(values));
          toastOk('Course created');
          navigate(`${LIST}/${created.id}`);
        }}
      />
    </div>
  );
}

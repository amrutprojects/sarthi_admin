import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import { toastOk } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { courseModuleService } from '../services/courseModuleService';
import { MODULE_NUMBERS } from '../types/courseModule.types';
import { emptyCourseModuleForm, toCreateInput } from '../validation/courseModule.validation';
import CourseModuleForm from './CourseModuleForm';

const LIST = '/lms/modules';

/*
 * Add Module — a dedicated page, reached from Add Module on the listing. Accepts ?courseId= and ?moduleNumber=
 * so a course can link straight to "add its module 3".
 */
export default function CourseModuleCreate() {
  usePageTitle('Add Module');
  const navigate = useNavigate();
  const can = useCan();
  const [params] = useSearchParams();
  const courseId = params.get('courseId') ?? '';
  const rawNumber = params.get('moduleNumber') ?? '';
  const moduleNumber = (MODULE_NUMBERS as readonly number[]).includes(Number(rawNumber)) ? rawNumber : '';
  const initial = useMemo(() => emptyCourseModuleForm({ courseId, moduleNumber }), [courseId, moduleNumber]);
  const backTo = courseId ? `${LIST}?courseId=${encodeURIComponent(courseId)}` : LIST;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Module Master', link: LIST }, { l: 'Add Module' }]}
        title="Add Module"
        sub="Creates one of the four programme modules of a course, as a draft. Hours and the syllabus reference may stay empty until release."
        back={<BackButton to={backTo} />}
      />

      {can('createLmsCourseModule') ? (
        <CourseModuleForm
          key={`${courseId}:${moduleNumber}`}
          mode="create"
          initial={initial}
          submitLabel="Create module"
          backTo={backTo}
          onSave={async (values) => {
            const created = await courseModuleService.create(toCreateInput(values));
            toastOk('Module created');
            navigate(`${LIST}/${created.id}`);
          }}
        />
      ) : (
        <div className="card">
          <EmptyState title="You cannot add modules" msg="Adding a module needs the Module Master create permission.">
            <button type="button" className="btn" onClick={() => navigate(backTo)}>Open the Module Master</button>
          </EmptyState>
        </div>
      )}
    </div>
  );
}

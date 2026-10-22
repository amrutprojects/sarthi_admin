import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { courseService } from '../services/courseService';
import { courseFormFrom, isCodeLocked, toUpdateInput } from '../validation/course.validation';
import CourseForm from './CourseForm';

const LIST = '/lms/courses';

/* Edit Course — a dedicated page. The Active / Inactive status is not part of the form: it has its own endpoint (toggle with confirmation). */
export default function CourseEdit() {
  usePageTitle('Edit Course');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => courseService.get(id), [id]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const course = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Course Master', link: LIST },
          ...(course ? [{ l: course.title, link: `${LIST}/${course.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={course ? `Edit ${course.title}` : 'Edit Course'}
        sub="Code, title, description and languages of the course. The entity, lifecycle status and content release are not edited here."
        back={<BackButton to={course ? `${LIST}/${course.id}` : LIST} />}
      />

      <LoadState loading={detail.loading && !course} error={detail.error} onRetry={() => void detail.reload()} />

      {course ? (
        <CourseForm
          initial={courseFormFrom(course)}
          course={course}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this course?"
          backTo={`${LIST}/${course.id}`}
          onSave={async (values) => {
            await courseService.update(course.id, toUpdateInput(values, isCodeLocked(course.status)));
            toastOk('Course updated');
            navigate(`${LIST}/${course.id}`);
          }}
          statusSlot={
            <MasterField id="lco-active-current" label="Status" hint="An inactive course is kept but no longer offered to the Module and Track Variant masters.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={course.isActive} />
                <Can action="updateLmsCourse">
                  <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                    {course.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}

      {confirming && course ? (
        <ConfirmModal
          title={course.isActive ? 'Deactivate course' : 'Activate course'}
          busy={busy}
          confirmLabel={course.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${course.isActive ? 'deactivate' : 'activate'} the course ${course.title} (${course.code})?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => courseService.setStatus(course.id, !course.isActive), course.isActive ? 'Course deactivated' : 'Course activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

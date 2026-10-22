import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, PageHead } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { moduleLabel } from '../components/format';
import { courseModuleService } from '../services/courseModuleService';
import { MODULE_STATUS_LABELS } from '../types/courseModule.types';
import { courseModuleFormFrom, toUpdateInput } from '../validation/courseModule.validation';
import CourseModuleForm from './CourseModuleForm';

const LIST = '/lms/modules';

/* Edit Module — a dedicated page. Course and number are fixed; status has its own endpoint (toggle with confirmation). */
export default function CourseModuleEdit() {
  usePageTitle('Edit Module');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const allowed = can('updateLmsCourseModule');
  const detail = useApiData(() => (allowed ? courseModuleService.get(id) : Promise.resolve(null)), [id, allowed]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const m = detail.data;
  const viewPath = `${LIST}/${id}`;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Module Master', link: LIST },
          ...(m ? [{ l: `${moduleLabel(m.moduleNumber)}: ${m.title}`, link: viewPath }] : []),
          { l: 'Edit' },
        ]}
        title={m ? `Edit ${moduleLabel(m.moduleNumber)}: ${m.title}` : 'Edit Module'}
        badge={m ? <span className="tag">{MODULE_STATUS_LABELS[m.status]}</span> : undefined}
        sub="Title, description, core hours, delivery pattern, OFT hours and the syllabus reference. A change of the core hours needs a reason."
        back={<BackButton to={viewPath} />}
      />

      {!allowed ? (
        <div className="card">
          <EmptyState title="You can view this module but not change it" msg="Editing a module needs the Module Master update permission.">
            <button type="button" className="btn" onClick={() => navigate(viewPath)}>Open the module</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <LoadState loading={detail.loading && !m} error={detail.error} onRetry={() => void detail.reload()} />

          {m && m.status !== 'DRAFT' ? (
            <div className="callout c-info mb14">
              <div>
                This module is {MODULE_STATUS_LABELS[m.status].toLowerCase()} (set through content releases). Changes are saved on the module record
                and audited with their before and after values.
              </div>
            </div>
          ) : null}

          {m ? (
            <CourseModuleForm
              /* A reload after a status change must not reset what the user typed. */
              key={m.id}
              mode="edit"
              initial={courseModuleFormFrom(m)}
              savedCoreHours={m.coreHours}
              fixedCourse={m.course}
              submitLabel="Save changes"
              confirmMessage="Are you sure you want to save the changes to this module? A delivery pair left out of the pattern is cleared."
              backTo={viewPath}
              onSave={async (values) => {
                await courseModuleService.update(m.id, toUpdateInput(values, m.coreHours));
                toastOk('Module updated');
                navigate(viewPath);
              }}
              statusSlot={
                <MasterField id="cm-status-current" label="Status" hint="An inactive module is kept but no longer offered to the other LMS masters.">
                  <div className="f ac gp8" style={{ minHeight: 36 }}>
                    <MasterStatusBadge isActive={m.isActive} />
                    <Can action="updateLmsCourseModule">
                      <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </Can>
                  </div>
                </MasterField>
              }
            />
          ) : null}
        </>
      )}

      {confirming && m ? (
        <ConfirmModal
          title={m.isActive ? 'Deactivate module' : 'Activate module'}
          busy={busy}
          confirmLabel={m.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${m.isActive ? 'deactivate' : 'activate'} ${moduleLabel(m.moduleNumber)}: ${m.title}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => courseModuleService.setStatus(m.id, !m.isActive), m.isActive ? 'Module deactivated' : 'Module activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

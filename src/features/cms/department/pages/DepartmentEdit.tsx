import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterField from '../../components/MasterField';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, toastOk, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { departmentService } from '../services/departmentService';
import DepartmentForm from './DepartmentForm';

/* Edit Department — a dedicated page. Status is not part of the form: it has its own endpoint. */
export default function DepartmentEdit() {
  usePageTitle('Edit Department');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => departmentService.get(id), [id]);
  const { busy, run } = useAction();

  const department = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'Department Master', link: '/cms/departments' },
          ...(department ? [{ l: department.name, link: `/cms/departments/${department.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={department ? `Edit ${department.name}` : 'Edit Department'}
        sub="Correct the name, code or description of the department."
        back={<BackButton to={department ? `/cms/departments/${department.id}` : '/cms/departments'} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {department ? (
        <DepartmentForm
          initial={{ name: department.name, code: department.code, description: department.description ?? '', isActive: department.isActive }}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this department?"
          backTo={`/cms/departments/${department.id}`}
          onSave={async (values) => {
            await departmentService.update(department.id, { name: values.name, code: values.code, description: values.description });
            toastOk('Department updated');
            navigate(`/cms/departments/${department.id}`);
          }}
          statusSlot={
            <MasterField id="dp-status-current" label="Status" hint="Deactivating keeps the record but stops offering the department in any form.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={department.isActive} />
                <Can action="updateDepartment">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => departmentService.setStatus(department.id, !department.isActive),
                        department.isActive ? 'Department deactivated' : 'Department activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {department.isActive ? 'Deactivate' : 'Activate'}
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

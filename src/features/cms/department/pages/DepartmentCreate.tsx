import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { toastOk } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { departmentService } from '../services/departmentService';
import DepartmentForm from './DepartmentForm';

/* Add Department — a dedicated page, reached from the Add Department button on the listing. */
export default function DepartmentCreate() {
  usePageTitle('Add Department');
  const navigate = useNavigate();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Department Master', link: '/cms/departments' }, { l: 'Add Department' }]}
        title="Add Department"
        sub="Creates a department that the other masters and forms can then use."
        back={<BackButton to="/cms/departments" />}
      />
      <DepartmentForm
        submitLabel="Create department"
        backTo="/cms/departments"
        onSave={async (values) => {
          const created = await departmentService.create(values);
          toastOk('Department created');
          navigate(`/cms/departments/${created.id}`);
        }}
      />
    </div>
  );
}

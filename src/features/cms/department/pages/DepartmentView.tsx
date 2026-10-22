import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { departmentService } from '../services/departmentService';

/* View Department — read-only detail page, reached from the View action on the listing. */
export default function DepartmentView() {
  usePageTitle('Department');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => departmentService.get(id), [id]);
  const { busy, run } = useAction();

  const department = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Department Master', link: '/cms/departments' }, { l: department ? department.name : 'Department' }]}
        title={department ? department.name : 'Department'}
        badge={department ? <span className="tag">{department.code}</span> : undefined}
        back={<BackButton to="/cms/departments" />}
        actions={
          <div className="f ac gp8 wrap">
            {department ? (
              <>
                <Can action="updateDepartment">
                  <button
                    type="button"
                    className="btn"
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
                <Can action="updateDepartment">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/departments/${department.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {department ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Department details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Department name', department.name],
                  ['Department code', <span className="mono">{department.code}</span>],
                  ['Description', department.description ?? '—'],
                  ['Status', <MasterStatusBadge isActive={department.isActive} />],
                  ['Created', fmtDateTime(department.createdAt)],
                  ['Last updated', fmtDateTime(department.updatedAt)],
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

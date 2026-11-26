import { useState } from 'react';
import { Badge, Callout, PageHead } from '../../../components/ui';
import { useCan } from '../../auth';
import OfficerDistrictsDrawer from '../components/OfficerDistrictsDrawer';
import { ForWhom, LoadProblem, Loading } from '../components/common';
import { useOfficers } from '../hooks/useIppApprovals';
import { plural } from '../labels';
import type { Officer } from '../types/ippApprovals.types';
import { useTitle } from '../utils';

/*
 * Which districts each Divisional Officer decides for. The officers are the users whose role holds
 * ipp-approvals.division-officer (the API says who); their accounts and roles are managed under Users & Roles.
 */
export default function OfficersPage() {
  useTitle('Officer districts');
  const can = useCan();
  const mayEdit = can('updateIppOfficers');
  const q = useOfficers();
  const [editing, setEditing] = useState<Officer | null>(null);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'IPP Approvals' }, { l: 'Officer Districts' }]}
        title="Officer Districts"
        sub="Each Divisional Officer sees and decides the IPP applications of their districts. A district may have several officers."
      />
      {q.isError ? (
        <LoadProblem error={q.error} what="the officers" onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <div className="card">
          <div className="card-b">
            <Loading what="officers" />
          </div>
        </div>
      ) : (
        <>
          {q.data.withoutOfficer.length ? (
            <div className="mb14" role="alert">
              <Callout tone="warn" title="Districts with waiting applications and no officer">
                <ul className="tw-mb-0 tw-mt-1 tw-pl-5" aria-label="Districts without an officer">
                  {q.data.withoutOfficer.map((d) => (
                    <li key={d.id}>
                      {d.name}: {plural(d.waiting, 'application')} waiting
                    </li>
                  ))}
                </ul>
              </Callout>
            </div>
          ) : null}
          <div className="card">
            <div className="tbl-wrap">
              <table className="tbl" aria-busy={q.isFetching}>
                <thead>
                  <tr>
                    <th scope="col">Divisional Officer</th>
                    <th scope="col">Status</th>
                    <th scope="col">Districts</th>
                    {mayEdit ? <th scope="col">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {q.data.officers.length === 0 ? (
                    <tr className="norow">
                      <td colSpan={mayEdit ? 4 : 3} className="tw-py-6 tw-text-center tw-text-ink-muted">
                        No Divisional Officers yet. Give a user the Divisional Officer role under Users &amp; Roles.
                      </td>
                    </tr>
                  ) : (
                    q.data.officers.map((o) => (
                      <tr key={o.id} className="norow">
                        <td>
                          <b>{o.name}</b>
                          <div className="muted fs12">{o.email}</div>
                        </td>
                        <td>
                          <Badge tone={o.isActive ? 'green' : 'grey'}>{o.isActive ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td>
                          {o.districts.length ? (
                            <span className="tw-flex tw-min-w-[160px] tw-flex-wrap tw-gap-1">
                              {o.districts.map((d) => (
                                <span key={d.id} className="tag">
                                  {d.name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <Badge tone="amber">No district</Badge>
                          )}
                        </td>
                        {mayEdit ? (
                          <td>
                            <button type="button" className="btn xs tw-relative" onClick={() => setEditing(o)}>
                              Edit
                              <ForWhom>{`the districts of ${o.name}`}</ForWhom>
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {editing && q.data ? (
        <OfficerDistrictsDrawer
          officer={editing}
          officers={q.data.officers}
          withoutOfficer={q.data.withoutOfficer}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

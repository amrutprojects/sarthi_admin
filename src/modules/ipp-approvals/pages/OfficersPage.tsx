import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmModal, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, PageHead } from '../../../components/ui';
import { useAuth, useCan } from '../../auth';
import { UserDetailsDrawer, useSetUserStatus } from '../../users';
import OfficerDistrictsDrawer from '../components/OfficerDistrictsDrawer';
import { ForWhom, LoadProblem, Loading } from '../components/common';
import { ippKeys, useOfficers, useSetOfficerDistricts } from '../hooks/useIppApprovals';
import { plural } from '../labels';
import type { Officer } from '../types/ippApprovals.types';
import { useTitle } from '../utils';

type Dialog = { type: 'view' | 'edit' | 'status' | 'unmap'; officer: Officer };

const districtTags = (o: Officer) =>
  o.districts.length ? (
    <span className="tw-flex tw-min-w-[160px] tw-flex-wrap tw-gap-1">
      {o.districts.map((d) => (
        <span key={d.id} className="tag">
          {d.name}
        </span>
      ))}
    </span>
  ) : (
    <Badge tone="amber">No district</Badge>
  );

/*
 * Which districts each Divisional Officer decides for. The officers are the users whose role holds
 * ipp-approvals.division-officer (the API says who); their accounts and roles are managed under Users & Roles.
 * An officer's status is their user account's (PATCH /users/:id/status, users.update); removing the districts keeps the account.
 */
export default function OfficersPage() {
  useTitle('Divisional Officer Mapping');
  const can = useCan();
  const { user: me } = useAuth();
  const mayEdit = can('updateIppOfficers');
  const maySwitch = can('updateUser');
  const q = useOfficers();
  const qc = useQueryClient();
  const setStatus = useSetUserStatus();
  const unmap = useSetOfficerDistricts();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const switchStatus = (o: Officer) =>
    setStatus.mutate(
      { id: o.id, isActive: !o.isActive },
      {
        onSuccess: () => {
          toastOk(`${o.name} ${o.isActive ? 'deactivated' : 'activated'}`);
          close();
        },
        onError: toastError,
        /* The users hook refreshes the users' lists; this list (and the districts left without an officer) is read here. */
        onSettled: () => void qc.invalidateQueries({ queryKey: ippKeys.all }),
      },
    );

  const removeDistricts = (o: Officer) =>
    unmap.mutate(
      { userId: o.id, districtIds: [] },
      {
        onSuccess: () => {
          toastOk(`Districts of ${o.name} removed`);
          close();
        },
        onError: toastError,
      },
    );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'IPP Approvals' }, { l: 'Divisional Officer Mapping' }]}
        title="Divisional Officer Mapping"
        sub="Each Divisional Officer sees and decides the IPP applications of their districts. Each district can be assigned to one officer."
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
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.officers.length === 0 ? (
                    <tr className="norow">
                      <td colSpan={4} className="tw-py-6 tw-text-center tw-text-ink-muted">
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
                        <td>{districtTags(o)}</td>
                        <td>
                          <div className="tw-flex tw-flex-wrap tw-gap-1">
                            <button type="button" className="btn xs tw-relative" onClick={() => setDialog({ type: 'view', officer: o })}>
                              View
                              <ForWhom>{o.name}</ForWhom>
                            </button>
                            {mayEdit ? (
                              <button type="button" className="btn xs tw-relative" onClick={() => setDialog({ type: 'edit', officer: o })}>
                                Edit
                                <ForWhom>{`the districts of ${o.name}`}</ForWhom>
                              </button>
                            ) : null}
                            {/* As in Users: your own account is not switched off from here. */}
                            {maySwitch && o.id !== me?.id ? (
                              <button
                                type="button"
                                className="btn xs tw-relative"
                                onClick={() => setDialog({ type: 'status', officer: o })}
                              >
                                {o.isActive ? 'Deactivate' : 'Activate'}
                                <ForWhom>{o.name}</ForWhom>
                              </button>
                            ) : null}
                            {mayEdit && o.districts.length ? (
                              <button
                                type="button"
                                className="btn xs tw-relative tw-text-danger"
                                onClick={() => setDialog({ type: 'unmap', officer: o })}
                              >
                                Remove districts
                                <ForWhom>{`of ${o.name}`}</ForWhom>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {dialog?.type === 'view' ? (
        <UserDetailsDrawer
          user={dialog.officer}
          title={`Divisional Officer — ${dialog.officer.name}`}
          readAccount={can('viewUsers')}
          roles={['Divisional Officer']}
          extra={[['Districts', districtTags(dialog.officer)]]}
          onClose={close}
        />
      ) : null}
      {dialog?.type === 'edit' && q.data ? (
        <OfficerDistrictsDrawer
          officer={dialog.officer}
          officers={q.data.officers}
          withoutOfficer={q.data.withoutOfficer}
          onClose={close}
        />
      ) : null}
      {dialog?.type === 'status' ? (
        <ConfirmModal
          title={dialog.officer.isActive ? 'Deactivate officer' : 'Activate officer'}
          danger={dialog.officer.isActive}
          busy={setStatus.isPending}
          confirmLabel={dialog.officer.isActive ? 'Deactivate' : 'Activate'}
          message={
            dialog.officer.isActive
              ? `Deactivate ${dialog.officer.name} (${dialog.officer.email})? A deactivated officer cannot sign in or decide on forms. The districts stay mapped: where no other active officer has the district, its forms wait until this account is activated again or another officer is mapped.`
              : `Activate ${dialog.officer.name} (${dialog.officer.email})? The officer can sign in again and decide the forms of their districts.`
          }
          onClose={close}
          onConfirm={() => switchStatus(dialog.officer)}
        />
      ) : null}
      {dialog?.type === 'unmap' ? (
        <ConfirmModal
          title="Remove districts"
          danger
          busy={unmap.isPending}
          confirmLabel="Remove districts"
          message={`Remove every district (${dialog.officer.districts.map((d) => d.name).join(', ')}) from ${dialog.officer.name}? The user account stays; only the district mapping is removed. Forms waiting at the Divisional Officer stage for these districts will wait until another officer is mapped to them.`}
          onClose={close}
          onConfirm={() => removeDistricts(dialog.officer)}
        />
      ) : null}
    </div>
  );
}

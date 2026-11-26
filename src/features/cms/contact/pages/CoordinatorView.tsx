import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { contactListPath } from '../types/contact.types';

/* View coordinator — read-only detail page, reached from the View action on the Division / cluster coordinators tab. */
export default function CoordinatorView() {
  usePageTitle('Coordinator');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => contactService.getCoordinator(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const coordinator = detail.data;
  const listPath = contactListPath('coordinators');

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: listPath },
          { l: coordinator ? coordinator.name : 'Coordinator' },
        ]}
        title={coordinator ? coordinator.name : 'Coordinator'}
        badge={coordinator ? <span className="tag">Order {coordinator.displayOrder}</span> : undefined}
        back={<BackButton to={listPath} />}
        actions={
          <div className="f ac gp8 wrap">
            {coordinator ? (
              <>
                <Can action="updateContactPage">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateContactPage">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => contactService.setCoordinatorStatus(coordinator.id, !coordinator.isActive),
                        coordinator.isActive ? 'Coordinator deactivated' : 'Coordinator activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {coordinator.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateContactPage">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/contact/coordinators/${coordinator.id}/edit`)}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {coordinator ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h">
              <h3>Coordinator details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Name', coordinator.name],
                  ['Phone', coordinator.phone],
                  ['Email', coordinator.email ?? <Dash />],
                  ['Display order', String(coordinator.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={coordinator.isActive} />],
                  ['On the website', coordinator.isActive ? 'Shown on the public Contact page' : 'Hidden from the public Contact page'],
                  ['Created', fmtDateTime(coordinator.createdAt)],
                  ['Last updated', fmtDateTime(coordinator.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>
                Districts covered <span className="sub">in the order the website lists them</span>
              </h3>
            </div>
            {coordinator.districts.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '76px' }}>
                        Sr. No.
                      </th>
                      <th scope="col">District</th>
                      <th scope="col">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinator.districts.map((d, i) => (
                      <tr className="norow" key={d.id}>
                        <td>
                          <span className="t2">{i + 1}</span>
                        </td>
                        <td>
                          <b>{d.name}</b>
                        </td>
                        <td>
                          <span className="mono fs12">{d.code}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-b">
                <div className="hint">No districts assigned yet.</div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {coordinator && deleting ? (
        <ConfirmModal
          title="Delete coordinator"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'contact-coordinator', id: coordinator.id }}
          message={`Delete "${coordinator.name}"? The card is removed from the public Contact page and its districts become free for another coordinator. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => contactService.removeCoordinator(coordinator.id),
              'Coordinator deleted',
              () => {
                setDeleting(false);
                navigate(listPath);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

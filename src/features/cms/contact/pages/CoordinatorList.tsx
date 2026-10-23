import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Dash, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import type { ApiCoordinator } from '../types/contact.types';

/*
 * District / cluster coordinators tab: the coordinator cards of the public Contact page as a listing
 * with search, sorting and paging, all served by the backend, in website order by default. Each row
 * is viewed, edited, switched on or off and deleted on its own, as on FAQ Management.
 */
export default function CoordinatorList() {
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const page = useApiData(() => contactService.listCoordinators(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiCoordinator | null>(null);
  const [confirming, setConfirming] = useState<ApiCoordinator | null>(null);

  const columns: MasterColumn<ApiCoordinator>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'displayOrder', l: 'Order', w: '86px', render: (r) => <span className="mono fs12">{r.displayOrder}</span> },
    {
      k: 'name',
      l: 'Name',
      render: (r) => (
        <div>
          <b className="lnk">{r.name}</b>
          <div className="muted fs12">
            {r.phone}
            {r.email ? ` · ${r.email}` : ''}
          </div>
        </div>
      ),
    },
    {
      k: 'districts',
      l: 'Districts covered',
      sortable: false,
      /* In the saved order, as the website lists them; table cells do not wrap unless told to. */
      render: (r) =>
        r.districts.length ? <div style={{ whiteSpace: 'normal', minWidth: 160 }}>{r.districts.map((d) => d.name).join(', ')}</div> : <Dash />,
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/contact/coordinators/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateContactPage">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/contact/coordinators/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateContactPage">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="updateContactPage">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label="Delete"
              style={{ color: 'var(--red)' }}
              onClick={() => setDeleting(r)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '';

  return (
    <>
      <SectionNote>
        The coordinator cards on the public Contact page, in display order. Each district links to its own District Office page, and a
        district can be covered by one coordinator only.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            District / cluster coordinators <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8">
            {filtered ? <span className="tag">filtered</span> : null}
            <Can action="updateContactPage">
              <button type="button" className="btn sm primary" onClick={() => go('/cms/contact/coordinators/create')}>
                <Icon name="plus" />
                Add coordinator
              </button>
            </Can>
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={page.data?.items ?? []}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={query}
          onQuery={patch}
          onRetry={() => void page.reload()}
          searchLabel="name, phone or district"
          emptyMsg={
            filtered
              ? 'No coordinator matches the current search.'
              : 'No coordinators have been added yet, so the website shows its built-in list. Use Add coordinator to create the first one.'
          }
          rowLink={can('viewContactPage') ? (r) => `/cms/contact/coordinators/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate coordinator' : 'Activate coordinator'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate "${confirming.name}"? The card will no longer be shown on the public Contact page.`
              : `Activate "${confirming.name}"? The card will be shown on the public Contact page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => contactService.setCoordinatorStatus(row.id, !row.isActive),
              row.isActive ? 'Coordinator deactivated' : 'Coordinator activated',
              async () => {
                setConfirming(null);
                await page.reload();
              },
            );
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete coordinator"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${deleting.name}"? The card is removed from the public Contact page and its districts become free for another coordinator. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => contactService.removeCoordinator(deleting.id),
              'Coordinator deleted',
              async () => {
                setDeleting(null);
                await page.reload();
              },
            )
          }
        />
      ) : null}
    </>
  );
}

import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Dash, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import type { ApiDistrictOffice } from '../types/contact.types';

/*
 * District offices tab: the District Office Coordinator details shown on each district's page, as a listing with
 * search, sorting and paging, all served by the backend, A to Z by district by default. Each row is
 * viewed, edited, switched on or off and deleted on its own, as on FAQ Management.
 */
export default function DistrictOfficeList() {
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => masterQuery('district'), []);
  const { query, patch } = useMasterQuery(initial);
  const page = useApiData(() => contactService.listDistrictOffices(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiDistrictOffice | null>(null);
  const [confirming, setConfirming] = useState<ApiDistrictOffice | null>(null);

  const columns: MasterColumn<ApiDistrictOffice>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'district',
      l: 'District',
      render: (r) => (
        <div>
          <b className="lnk">{r.district.name}</b>
          <div className="muted mono fs12">{r.district.code}</div>
        </div>
      ),
    },
    { k: 'collectorName', l: 'District Coordinator', render: (r) => <FieldValue value={r.collectorName} /> },
    {
      k: 'contact',
      l: 'Phone / Email',
      sortable: false,
      render: (r) =>
        r.phone || r.email ? (
          <div>
            {r.phone ? <div>{r.phone}</div> : null}
            {r.email ? <div className="muted fs12">{r.email}</div> : null}
          </div>
        ) : (
          <Dash />
        ),
    },
    {
      k: 'officeHours',
      l: 'Office hours',
      sortable: false,
      render: (r) => (
        <div style={{ whiteSpace: 'normal', minWidth: 140 }}>
          <FieldValue value={r.officeHours} />
        </div>
      ),
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
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/contact/offices/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateContactPage">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/contact/offices/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateContactPage">
            <StatusToggle compact isActive={r.isActive} name={r.district.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
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
        Shown on each district&rsquo;s page, one entry per district. A blank field is left out of the website.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            District offices <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8">
            {filtered ? <span className="tag">filtered</span> : null}
            <Can action="updateContactPage">
              <button type="button" className="btn sm primary" onClick={() => go('/cms/contact/offices/create')}>
                <Icon name="plus" />
                Add district office
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
          searchLabel="district, coordinator, phone or email"
          emptyMsg={
            filtered
              ? 'No district office matches the current search.'
              : 'No district offices have been added yet, so each district page shows no District Office Coordinator details. Use Add district office to create the first one.'
          }
          rowLink={can('viewContactPage') ? (r) => `/cms/contact/offices/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate district office' : 'Activate district office'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate the ${confirming.district.name} district office? Its details will no longer be shown on the district's page.`
              : `Activate the ${confirming.district.name} district office? Its details will be shown on the district's page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => contactService.setDistrictOfficeStatus(row.id, !row.isActive),
              row.isActive ? 'District office deactivated' : 'District office activated',
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
          title="Delete district office"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'contact-district-office', id: deleting.id }}
          message={`Delete the ${deleting.district.name} district office? The district's page then shows no District Office Coordinator details. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => contactService.removeDistrictOffice(deleting.id),
              'District office deleted',
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

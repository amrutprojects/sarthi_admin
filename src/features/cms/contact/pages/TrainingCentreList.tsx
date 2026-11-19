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
import { useDistrictOptions } from '../services/districtOptions';
import { trainingCentreService } from '../services/trainingCentreService';
import { centrePath, type ApiTrainingCentre } from '../types/trainingCentre.types';

/*
 * Training centres tab: the "Approved training centres" card on each district's page, as a listing with
 * search, a district filter, sorting and paging, all served by the backend — by district, then each
 * district's own order, by default. A district can have any number of centres; each is viewed, edited,
 * switched on or off and deleted on its own.
 */
export default function TrainingCentreList() {
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => masterQuery('district'), []);
  const { query, patch } = useMasterQuery(initial);
  const [districtId, setDistrictId] = useState('');
  const districts = useDistrictOptions();
  const page = useApiData(() => trainingCentreService.list(query, districtId), [query, districtId]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiTrainingCentre | null>(null);
  const [confirming, setConfirming] = useState<ApiTrainingCentre | null>(null);

  const columns: MasterColumn<ApiTrainingCentre>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'district',
      l: 'District',
      render: (r) => (
        <div>
          <b>{r.district.name}</b>
          <div className="muted mono fs12">{r.district.code}</div>
        </div>
      ),
    },
    {
      k: 'name',
      l: 'Centre',
      render: (r) => (
        <div style={{ whiteSpace: 'normal', minWidth: 180 }}>
          <b className="lnk">{r.name.en}</b>
          <div className="muted fs12" lang="mr">
            {r.name.mr}
          </div>
        </div>
      ),
    },
    {
      k: 'managerName',
      l: 'Centre manager',
      sortable: false,
      render: (r) => (r.managerName ? <span>{r.managerName.en}</span> : <FieldValue value={null} />),
    },
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
    { k: 'displayOrder', l: 'Order', w: '80px', render: (r) => <span className="mono">{r.displayOrder}</span> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(centrePath(r.id))}>
            <Icon name="eye" />
          </button>
          <Can action="updateContactPage">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(centrePath(r.id, true))}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateContactPage">
            <StatusToggle compact isActive={r.isActive} name={r.name.en} canChange disabled={busy} onToggle={() => setConfirming(r)} />
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

  const filtered = query.search !== '' || districtId !== '';

  return (
    <>
      <SectionNote>
        Listed in the Approved training centres card of each district&rsquo;s page, in display order. A district can have any number of
        centres; a blank field is left out of the website.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Training centres <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {filtered ? <span className="tag">filtered</span> : null}
            <select
              className="inp"
              aria-label="Filter by district"
              style={{ width: 'auto', minWidth: 180 }}
              value={districtId}
              disabled={districts.loading}
              onChange={(e) => {
                setDistrictId(e.target.value);
                patch({ page: 1 });
              }}
            >
              <option value="">All districts</option>
              {(districts.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Can action="updateContactPage">
              <button type="button" className="btn sm primary" onClick={() => go('/cms/contact/centres/create')}>
                <Icon name="plus" />
                Add training centre
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
          searchLabel="district, centre, manager, phone or email"
          emptyMsg={
            filtered
              ? 'No training centre matches the current search.'
              : 'No training centres have been added yet, so no district page shows a training centres card. Use Add training centre to create the first one.'
          }
          rowLink={can('viewContactPage') ? (r) => centrePath(r.id) : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate training centre' : 'Activate training centre'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${confirming.name.en}? It will no longer be listed on the ${confirming.district.name} page.`
              : `Activate ${confirming.name.en}? It will be listed on the ${confirming.district.name} page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => trainingCentreService.setStatus(row.id, !row.isActive),
              row.isActive ? 'Training centre deactivated' : 'Training centre activated',
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
          title="Delete training centre"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${deleting.name.en}? It is no longer listed on the ${deleting.district.name} page. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => trainingCentreService.remove(deleting.id),
              'Training centre deleted',
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

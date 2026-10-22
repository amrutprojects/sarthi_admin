import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import StatusToggle from '../../../cms/components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../../cms/components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import { lmsOptions } from '../../options';
import { lmsEntityService, type LmsEntityQuery } from '../services/entityService';
import type { ApiLmsEntity } from '../types/entity.types';

const LIST = '/lms/entities';

/* "3 (1 inactive)": how many centres / tracks are enabled, and how many of them the Admin Panel has since deactivated. */
function SelectionCount({ rows, noun }: { rows: { isActive: boolean }[]; noun: string }) {
  if (!rows.length) return <span className="muted fs12" title={`No ${noun} enabled yet`}>None</span>;
  const inactive = rows.filter((r) => !r.isActive).length;
  return (
    <span className="fs12">
      {rows.length}
      {inactive ? <span className="muted"> ({inactive} inactive)</span> : null}
    </span>
  );
}

/*
 * Entity Master listing (UI-310): search name / code, filter by status, enabled centre and enabled track,
 * sorting and paging — all served by the backend. The UI-310 course / batch / learner columns are not shown:
 * LMS batches and learners do not exist yet and the counting rule is To Be Confirmed.
 */
export default function LmsEntityList() {
  usePageTitle('Entity Master');
  const go = useGo();
  const can = useCan();
  const initial = useMemo<LmsEntityQuery>(() => ({ ...masterQuery('name'), centreId: '', trackId: '', deleted: false }), []);
  const { query: q, patch, reset } = useMasterQuery<LmsEntityQuery>(initial);
  const page = useApiData(() => lmsEntityService.list(q), [q]);
  const centres = useApiData(() => lmsOptions.centres(), []);
  const tracks = useApiData(() => lmsOptions.tracks(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiLmsEntity | null>(null);
  const [confirming, setConfirming] = useState<ApiLmsEntity | null>(null);
  /* A row of the "Show deleted" list whose Restore asks for confirmation. */
  const [restoring, setRestoring] = useState<ApiLmsEntity | null>(null);

  /* Totals for the KPI row, counted by the backend: they ignore the current page, search and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const [total, active] = await Promise.all([lmsEntityService.count(), lmsEntityService.count({ isActive: 'true' })]);
      return { total, active, inactive: total - active };
    },
    [statsKey],
  );

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiLmsEntity>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Entity Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'Entity Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    { k: 'centres', l: 'Centres', sortable: false, render: (r) => <SelectionCount rows={r.enabledCentres} noun="centre" /> },
    { k: 'tracks', l: 'Tracks', sortable: false, render: (r) => <SelectionCount rows={r.enabledTracks} noun="track" /> },
    { k: 'defaults', l: 'Language · Time zone', sortable: false, render: (r) => <span className="fs12"><span className="mono">{r.defaultLanguage}</span> · {r.timeZone}</span> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <MasterStatusBadge isActive={r.isActive} />) },
    { k: 'createdAt', l: 'Created', render: (r) => <span className="fs12">{fmtDateTime(r.createdAt)}</span> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.name}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateLmsEntity">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateLmsEntity">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteLmsEntity">
            <button type="button" className="btn xs" title="Delete" aria-label={`Delete ${r.name}`} style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];
  /* A deleted entity cannot be opened or edited (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiLmsEntity> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsEntity">
        <button type="button" className="btn xs" aria-label={`Restore ${r.name}`} disabled={busy} onClick={() => setRestoring(r)}>Restore</button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.centreId !== '' || q.trackId !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Entity Master' }]}
        title="Entity Master"
        sub="LMS entities: the learning environments within which courses, batches, trainers and learners operate."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsEntity">
              <button type="button" className="btn primary" onClick={() => go(`${LIST}/create`)}>
                <Icon name="plus" />Add Entity
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Total entities', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered to the other LMS masters' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept, but not offered to the other LMS masters' },
        ]}
      />

      <FilterBar
        id="lms-entities"
        fields={[
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
          {
            k: 'centreId',
            l: 'Enabled Centre',
            options: geoFilterOptions({ options: centres.data ?? [], loading: centres.loading, allLabel: 'All centres', selected: q.centreId }),
          },
          {
            k: 'trackId',
            l: 'Enabled Track',
            options: geoFilterOptions({ options: tracks.data ?? [], loading: tracks.loading, allLabel: 'All tracks', selected: q.trackId }),
          },
        ]}
        value={{ status: q.status, centreId: q.centreId, trackId: q.trackId }}
        onChange={(key, value) => patch({ [key]: value } as Partial<LmsEntityQuery>)}
        onReset={reset}
        extra={
          /* The deleted entities, to restore one: for those who may delete (and so restore) entities. */
          <Can action="deleteLmsEntity">
            <span className="f ac gp8 fs12">
              <button
                type="button"
                role="switch"
                aria-checked={q.deleted}
                aria-label="Show deleted"
                className={'switch sm' + (q.deleted ? ' on' : '')}
                onClick={() => patch({ deleted: !q.deleted })}
              />
              Show deleted
            </span>
          </Can>
        }
      />

      <div className="card">
        <div className="card-h">
          <h3>{showingDeleted ? 'Deleted entities' : 'Entities'} <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={shownColumns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={q}
          onQuery={patch}
          onRetry={reload}
          searchLabel="name or code"
          emptyMsg={
            showingDeleted
              ? filtered ? 'No deleted entity matches the current search and filters.' : 'No entity has been deleted.'
              : filtered ? 'No entity matches the current search and filters.' : 'No entities have been added yet. Use Add Entity to create the first one.'
          }
          rowLink={can('viewLmsEntities') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate entity' : 'Activate entity'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the entity ${confirming.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => lmsEntityService.setStatus(row.id, !row.isActive), row.isActive ? 'Entity deactivated' : 'Entity activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete entity"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the entity ${deleting.name}? It is archived (soft-deleted) and kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => lmsEntityService.remove(deleting.id), 'Entity deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
      {restoring ? (
        <ConfirmModal
          title="Restore entity"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the entity ${restoring.name} (${restoring.code})? It comes back inactive, with its enabled centres and tracks. It cannot be restored while another entity uses its name or code.`}
          onClose={() => setRestoring(null)}
          onConfirm={() => {
            const row = restoring;
            /* A 409 (name or code taken meanwhile) is toasted with the server's message; the dialog stays open. */
            run(() => lmsEntityService.restore(row.id), 'Entity restored (inactive)', async () => {
              setRestoring(null);
              await reload();
            });
          }}
        />
      ) : null}
    </div>
  );
}

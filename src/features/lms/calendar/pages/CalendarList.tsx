import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import StatusToggle from '../../../cms/components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../../cms/components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import { lmsOptions } from '../../options';
import CalendarTabs from '../components/CalendarTabs';
import { calendarService, type LmsCalendarQuery } from '../services/calendarService';
import { CALENDAR_TYPES, CALENDAR_TYPE_LABELS, type ApiLmsCalendar, type CalendarRef } from '../types/calendar.types';
import { fmtDate, workingDaysLabel } from '../validation/calendarDates';

const LIST = '/lms/calendars';

const TYPE_OPTIONS: Option[] = [{ v: '', l: 'All types' }, ...CALENDAR_TYPES.map((t) => ({ v: t, l: CALENDAR_TYPE_LABELS[t] }))];

/* Calendars whose period touches the year: three years back to three ahead (the server accepts 2000–2100). */
const yearOptions = (): Option[] => {
  const now = new Date().getFullYear();
  return [{ v: '', l: 'All years' }, ...Array.from({ length: 7 }, (_, i) => String(now + 3 - i)).map((y) => ({ v: y, l: y }))];
};

/* An entity or centre deactivated (or deleted) since is shown muted with a note. */
function RefName({ r, none }: { r: CalendarRef | null; none: string }) {
  if (!r) return <span className="muted fs12">{none}</span>;
  return (
    <span className="fs12" style={r.isActive ? undefined : { color: 'var(--muted)' }}>
      {r.name}
      {r.isActive ? null : <span className="muted"> (inactive)</span>}
    </span>
  );
}

/*
 * Academic Calendar listing (L-05 / UI-313): search by name; filter by entity, centre, type, year and status;
 * sorting and paging — all served by the backend. The learning configuration is the second tab.
 */
export default function CalendarList() {
  usePageTitle('Academic Calendar');
  const go = useGo();
  const can = useCan();
  const [params] = useSearchParams();
  const urlEntityId = params.get('entityId') ?? '';
  const initial = useMemo<LmsCalendarQuery>(
    () => ({ ...masterQuery('validFrom'), sortOrder: 'desc', entityId: urlEntityId, centreId: '', type: '', year: '', deleted: false }),
    [urlEntityId],
  );
  const { query: q, patch, reset } = useMasterQuery<LmsCalendarQuery>(initial);
  const page = useApiData(() => calendarService.list(q), [q]);
  const entities = useApiData(() => lmsOptions.entities(), []);
  /* Every active centre, or only those enabled for the entity the list is filtered by. */
  const centres = useApiData(() => lmsOptions.centres(q.entityId || undefined), [q.entityId]);
  const years = useMemo(yearOptions, []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiLmsCalendar | null>(null);
  const [confirming, setConfirming] = useState<ApiLmsCalendar | null>(null);
  /* The last calendar archived here, offered for restore until another one is archived or it is restored. */
  const [archived, setArchived] = useState<ApiLmsCalendar | null>(null);
  const [restoring, setRestoring] = useState(false);
  /* A row of the "Show deleted" list whose Restore asks for confirmation. */
  const [restoringRow, setRestoringRow] = useState<ApiLmsCalendar | null>(null);

  /* KPI totals, counted by the backend. They follow the entity filter (the scope) but not search, status or the other filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { entityId: q.entityId };
      const [total, active, centre] = await Promise.all([
        calendarService.count(scope),
        calendarService.count({ ...scope, isActive: 'true' }),
        calendarService.count({ ...scope, type: 'CENTRE' }),
      ]);
      return { total, active, inactive: total - active, centre };
    },
    [statsKey, q.entityId],
  );

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiLmsCalendar>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Calendar Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'entity', l: 'Entity', sortable: false, render: (r) => <RefName r={r.entity} none="—" /> },
    {
      k: 'centre',
      l: 'Applies To',
      sortable: false,
      render: (r) =>
        r.centreId ? (
          <span>
            <RefName r={r.centre} none="Unknown centre" />
            <div className="muted fs12">{CALENDAR_TYPE_LABELS.CENTRE}</div>
          </span>
        ) : (
          <span className="fs12">All centres<div className="muted fs12">{CALENDAR_TYPE_LABELS.ENTITY}</div></span>
        ),
    },
    { k: 'validFrom', l: 'Valid From', render: (r) => <span className="fs12">{fmtDate(r.validFrom)}</span> },
    { k: 'validTo', l: 'Valid To', render: (r) => <span className="fs12">{fmtDate(r.validTo)}</span> },
    { k: 'workingDays', l: 'Working Days', sortable: false, render: (r) => <span className="fs12">{workingDaysLabel(r.workingDays)}</span> },
    { k: 'holidays', l: 'Holidays', sortable: false, align: 'right', render: (r) => <span className="fs12">{r.holidayCount}</span> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <MasterStatusBadge isActive={r.isActive} />) },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.name}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateLmsCalendar">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateLmsCalendar">
            <StatusToggle compact isActive={r.isActive} name={r.name} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteLmsCalendar">
            <button type="button" className="btn xs" title="Delete" aria-label={`Delete ${r.name}`} style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];
  /* A deleted calendar cannot be opened or edited (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiLmsCalendar> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsCalendar">
        <button type="button" className="btn xs" aria-label={`Restore ${r.name}`} disabled={busy} onClick={() => setRestoringRow(r)}>Restore</button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.entityId !== '' || q.centreId !== '' || q.type !== '' || q.year !== '';
  const selectedEntity = entities.data?.find((e) => e.id === q.entityId);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Academic Calendar' }]}
        title="Academic Calendar"
        sub="Calendars of each LMS entity: the period, working days and holidays sessions are planned against, with centre exception calendars."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsCalendar">
              <button type="button" className="btn primary" onClick={() => go(q.entityId ? `${LIST}/create?entityId=${encodeURIComponent(q.entityId)}` : `${LIST}/create`)}>
                <Icon name="plus" />Add Calendar
              </button>
            </Can>
          </div>
        }
      />

      <CalendarTabs active="calendars" entityId={q.entityId || undefined} />

      <MasterKpis
        items={[
          { label: selectedEntity ? `Calendars of ${selectedEntity.name}` : 'Total calendars', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Offered to the other LMS screens' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept, but not offered to the other LMS screens' },
          { label: 'Centre exceptions', value: stats.data?.centre, tone: 'v', title: 'Calendars that apply to one centre instead of the whole entity' },
        ]}
      />

      <FilterBar
        id="lms-calendars"
        fields={[
          {
            k: 'entityId',
            l: 'Entity',
            options: geoFilterOptions({ options: entities.data ?? [], loading: entities.loading, allLabel: 'All entities', selected: q.entityId }),
          },
          {
            k: 'centreId',
            l: 'Centre',
            options: geoFilterOptions({ options: centres.data ?? [], loading: centres.loading, allLabel: 'All centres', selected: q.centreId }),
          },
          { k: 'type', l: 'Type', options: TYPE_OPTIONS },
          { k: 'year', l: 'Year', options: years },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ entityId: q.entityId, centreId: q.centreId, type: q.type, year: q.year, status: q.status }}
        onChange={(key, value) =>
          /* A centre chosen for another entity would silently empty the list, so a new entity starts from "All centres". */
          patch((key === 'entityId' ? { entityId: value, centreId: '' } : { [key]: value }) as Partial<LmsCalendarQuery>)
        }
        onReset={reset}
        extra={
          /* The deleted calendars, to restore one: for those who may delete (and so restore) calendars. */
          <Can action="deleteLmsCalendar">
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

      {archived ? (
        <div className="callout c-ok mb14" role="status">
          <div>
            The calendar <b>{archived.name}</b> was archived. Its holidays are kept.{' '}
            <Can action="deleteLmsCalendar">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => setArchived(null)}>Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>{showingDeleted ? 'Deleted calendars' : 'Calendars'} <span className="sub">live from the backend</span></h3>
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
          searchLabel="calendar name"
          emptyMsg={
            showingDeleted
              ? filtered ? 'No deleted calendar matches the current search and filters.' : 'No calendar has been deleted.'
              : filtered ? 'No calendar matches the current search and filters.' : 'No calendars have been added yet. Use Add Calendar to create the first one.'
          }
          rowLink={can('viewLmsCalendars') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate calendar' : 'Activate calendar'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the calendar ${confirming.name}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => calendarService.setStatus(row.id, !row.isActive), row.isActive ? 'Calendar deactivated' : 'Calendar activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete calendar"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'lms-calendar', id: deleting.id }}
          message={`Delete the calendar ${deleting.name} (${fmtDate(deleting.validFrom)} to ${fmtDate(deleting.validTo)})? It is archived (soft-deleted) with its holidays and kept for audit history; it can be restored.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const row = deleting;
            run(() => calendarService.remove(row.id), 'Calendar deleted', async () => {
              setDeleting(null);
              setArchived(row);
              await reload();
            });
          }}
        />
      ) : null}
      {restoring && archived ? (
        <ConfirmModal
          title="Restore calendar"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the calendar ${archived.name}? It comes back inactive, with its holidays. It cannot be restored while its entity is deleted, its centre is no longer enabled, or another calendar now uses its name or period.`}
          onClose={() => setRestoring(false)}
          onConfirm={() => {
            const row = archived;
            run(() => calendarService.restore(row.id), 'Calendar restored (inactive)', async () => {
              setRestoring(false);
              setArchived(null);
              await reload();
            });
          }}
        />
      ) : null}
      {restoringRow ? (
        <ConfirmModal
          title="Restore calendar"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the calendar ${restoringRow.name} (${fmtDate(restoringRow.validFrom)} to ${fmtDate(restoringRow.validTo)})? It comes back inactive, with its holidays. It cannot be restored while its entity is deleted, its centre is no longer enabled, or another calendar now uses its name or period.`}
          onClose={() => setRestoringRow(null)}
          onConfirm={() => {
            const row = restoringRow;
            /* A 409 (name or period taken meanwhile) is toasted with the server's message; the dialog stays open. */
            run(() => calendarService.restore(row.id), 'Calendar restored (inactive)', async () => {
              setRestoringRow(null);
              if (archived?.id === row.id) setArchived(null);
              await reload();
            });
          }}
        />
      ) : null}
    </div>
  );
}

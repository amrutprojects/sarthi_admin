import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import CalendarYearView from '../components/CalendarYearView';
import WorkingDayChips from '../components/WorkingDayChips';
import { calendarService } from '../services/calendarService';
import { CALENDAR_TYPE_LABELS, type ApiLmsCalendar } from '../types/calendar.types';
import { fmtDate, fmtDay, isIsoDate, periodStats, weekdayOf } from '../validation/calendarDates';

const LIST = '/lms/calendars';

/* Notes about records the calendar points at that are no longer usable. */
function RefWarnings({ calendar }: { calendar: ApiLmsCalendar }) {
  const notes: string[] = [];
  if (!calendar.entity) notes.push('The entity of this calendar no longer exists.');
  else if (!calendar.entity.isActive) notes.push(`The entity ${calendar.entity.name} is inactive, so this calendar is not offered to the other LMS screens.`);
  if (calendar.centreId && !calendar.centre) notes.push('The centre of this exception calendar no longer exists in the Admin Panel.');
  else if (calendar.centre && !calendar.centre.isActive) notes.push(`The centre ${calendar.centre.name} is inactive in the Admin Panel.`);
  if (!notes.length) return null;
  return (
    <div className="callout c-warn mb14" role="status">
      <div>
        {notes.map((n) => (
          <div key={n}>{n}</div>
        ))}
      </div>
    </div>
  );
}

/* View Calendar — read-only detail page with the holiday list and a year view. */
export default function CalendarView() {
  usePageTitle('Academic Calendar');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => calendarService.get(id), [id]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  /* Archived from this page: the record is gone from the API (404), so the page keeps the last copy and offers Restore. */
  const [archived, setArchived] = useState(false);

  const calendar = detail.data;
  const holidays = calendar?.holidays ?? [];
  const stats = calendar ? periodStats(calendar.validFrom, calendar.validTo, calendar.workingDays, holidays.map((h) => h.date)) : null;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Academic Calendar', link: LIST }, { l: calendar ? calendar.name : 'Calendar' }]}
        title={calendar ? calendar.name : 'Calendar'}
        badge={calendar ? <span className="tag">{CALENDAR_TYPE_LABELS[calendar.type]}</span> : undefined}
        sub={calendar ? `${calendar.entity?.name ?? 'Unknown entity'} · ${fmtDate(calendar.validFrom)} to ${fmtDate(calendar.validTo)}` : undefined}
        back={<BackButton to={LIST} />}
        actions={
          calendar && !archived ? (
            <div className="f ac gp8 wrap">
              <Can action="viewLmsLearningConfig">
                <button type="button" className="btn" onClick={() => go(`/lms/learning-config?entityId=${encodeURIComponent(calendar.entityId)}`)}>
                  Learning configuration
                </button>
              </Can>
              <Can action="updateLmsCalendar">
                <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(true)}>
                  {calendar.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              <Can action="deleteLmsCalendar">
                <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>Delete</button>
              </Can>
              <Can action="updateLmsCalendar">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${calendar.id}/edit`)}>Edit</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !calendar} error={detail.error} onRetry={() => void detail.reload()} />

      {calendar && archived ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            <b>This calendar has been archived. </b>
            It is no longer listed or offered; its holidays are kept, so it can be restored (it comes back inactive).{' '}
            <Can action="deleteLmsCalendar">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => go(LIST)}>Back to the list</button>
          </div>
        </div>
      ) : null}

      {calendar ? (
        <>
          {archived ? null : <RefWarnings calendar={calendar} />}

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Calendar details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Calendar name', calendar.name],
                    [
                      'Entity',
                      calendar.entity ? (
                        <span>
                          {calendar.entity.name} <span className="mono fs12">({calendar.entity.code})</span>
                          {calendar.entity.isActive ? null : <span className="muted fs12"> · inactive</span>}
                        </span>
                      ) : '—',
                    ],
                    [
                      'Applies to',
                      calendar.centreId ? (
                        <span>
                          {calendar.centre ? calendar.centre.name : 'Unknown centre'}
                          {calendar.centre ? <span className="mono fs12"> ({calendar.centre.code})</span> : null}
                          {calendar.centre && !calendar.centre.isActive ? <span className="muted fs12"> · inactive</span> : null}
                        </span>
                      ) : 'All centres of the entity',
                    ],
                    ['Type', CALENDAR_TYPE_LABELS[calendar.type]],
                    ['Valid from', fmtDay(calendar.validFrom)],
                    ['Valid to', fmtDay(calendar.validTo)],
                    ['Working days', <WorkingDayChips days={calendar.workingDays} />],
                    ['Status', archived ? 'Archived' : <MasterStatusBadge isActive={calendar.isActive} />],
                    ['Created', fmtDateTime(calendar.createdAt)],
                    ['Last updated', fmtDateTime(calendar.updatedAt)],
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Period summary</h3></div>
              <div className="card-b">
                {stats ? (
                  <KvList
                    pairs={[
                      ['Days in the period', String(stats.days)],
                      ['Working days in the period', String(stats.workingDays)],
                      ['Holidays', `${holidays.length} (${stats.holidaysOnWorkingDays} on working days)`],
                      ['Teaching days', <b>{stats.teachingDays}</b>],
                    ]}
                  />
                ) : (
                  <p className="muted fs12" style={{ margin: 0 }}>The period could not be read.</p>
                )}
                <p className="muted fs12" style={{ marginTop: 8 }}>
                  Teaching days are the working days of the period less the holidays that fall on them.
                  {calendar.type === 'CENTRE'
                    ? ' This centre exception calendar applies to its centre instead of the entity-wide calendar for the same days.'
                    : ' A centre exception calendar of the same entity, where one exists, applies to its centre instead of this one.'}
                </p>
                <div className="callout c-info" style={{ marginTop: 10 }}>
                  <div>
                    <b>Not available yet. </b>
                    No session or batch uses a calendar yet (L-11 scheduling does not exist in this system), so a calendar can always be
                    changed or deleted.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Holidays <span className="sub">{holidays.length}</span></h3>
            </div>
            {holidays.length ? (
              <div className="tbl-wrap">
                <table className="tbl" aria-label="Holidays">
                  <thead>
                    <tr><th style={{ width: 76 }}>Sr. No.</th><th>Date</th><th>Holiday</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {holidays.map((h, i) => (
                      <tr key={h.id} className="norow">
                        <td className="muted fs12">{i + 1}</td>
                        <td className="fs12">{fmtDay(h.date)}</td>
                        <td>{h.name}</td>
                        <td className="muted fs12">
                          {isIsoDate(h.date) && !calendar.workingDays.includes(weekdayOf(h.date)) ? 'Falls on a non-working day' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-b muted fs12">No holidays are listed for this calendar.</div>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3>Year view</h3></div>
            <div className="card-b">
              <CalendarYearView validFrom={calendar.validFrom} validTo={calendar.validTo} workingDays={calendar.workingDays} holidays={holidays} />
            </div>
          </div>
        </>
      ) : null}

      {confirming && calendar ? (
        <ConfirmModal
          title={calendar.isActive ? 'Deactivate calendar' : 'Activate calendar'}
          busy={busy}
          confirmLabel={calendar.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${calendar.isActive ? 'deactivate' : 'activate'} the calendar ${calendar.name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => calendarService.setStatus(calendar.id, !calendar.isActive), calendar.isActive ? 'Calendar deactivated' : 'Calendar activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
      {deleting && calendar ? (
        <ConfirmModal
          title="Delete calendar"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the calendar ${calendar.name}? It is archived (soft-deleted) with its holidays and kept for audit history; it can be restored.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(() => calendarService.remove(calendar.id), 'Calendar deleted', () => {
              setDeleting(false);
              setArchived(true);
            })
          }
        />
      ) : null}
      {restoring && calendar ? (
        <ConfirmModal
          title="Restore calendar"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the calendar ${calendar.name}? It comes back inactive, with its holidays. It cannot be restored while its entity is deleted, its centre is no longer enabled, or another calendar now uses its name or period.`}
          onClose={() => setRestoring(false)}
          onConfirm={() =>
            run(() => calendarService.restore(calendar.id), 'Calendar restored (inactive)', async () => {
              setRestoring(false);
              setArchived(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}

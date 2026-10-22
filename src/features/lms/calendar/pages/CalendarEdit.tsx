import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import CalendarActionGate from '../components/CalendarActionGate';
import { calendarService } from '../services/calendarService';
import { calendarFormFrom } from '../validation/calendar.validation';
import CalendarForm from './CalendarForm';

const LIST = '/lms/calendars';

/* Edit Calendar — a dedicated page. Status is not part of the form: it has its own endpoint (toggle with confirmation). */
export default function CalendarEdit() {
  usePageTitle('Edit Calendar');
  return (
    <CalendarActionGate action="updateLmsCalendar" title="Edit Calendar">
      <CalendarEditPage />
    </CalendarActionGate>
  );
}

function CalendarEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => calendarService.get(id), [id]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const calendar = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Academic Calendar', link: LIST },
          ...(calendar ? [{ l: calendar.name, link: `${LIST}/${calendar.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={calendar ? `Edit ${calendar.name}` : 'Edit Calendar'}
        sub="Centre, name, period, working days and holidays. The entity is fixed once the calendar exists."
        back={<BackButton to={calendar ? `${LIST}/${calendar.id}` : LIST} />}
      />

      <LoadState loading={detail.loading && !calendar} error={detail.error} onRetry={() => void detail.reload()} />

      {calendar ? (
        <CalendarForm
          /* A reload after a status change must not reset what the user typed. */
          key={calendar.id}
          initial={calendarFormFrom(calendar)}
          fixedEntity={calendar.entity ?? { id: calendar.entityId, name: 'Unknown entity', code: '—', isActive: false }}
          savedCentre={calendar.centre}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this calendar? The holiday list is replaced by the one on this form."
          backTo={`${LIST}/${calendar.id}`}
          onSave={async (values) => {
            await calendarService.update(calendar.id, {
              centreId: values.centreId,
              name: values.name,
              validFrom: values.validFrom,
              validTo: values.validTo,
              workingDays: values.workingDays,
              holidays: values.holidays,
            });
            toastOk('Calendar updated');
            navigate(`${LIST}/${calendar.id}`);
          }}
          statusSlot={
            <MasterField id="lc-status-current" label="Status" hint="An inactive calendar is kept but no longer offered to the other LMS screens.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={calendar.isActive} />
                <Can action="updateLmsCalendar">
                  <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                    {calendar.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
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
    </div>
  );
}

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../../cms/components/BackButton';
import { toastOk } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import CalendarActionGate from '../components/CalendarActionGate';
import { calendarService } from '../services/calendarService';
import { emptyCalendarForm } from '../validation/calendar.validation';
import CalendarForm from './CalendarForm';

const LIST = '/lms/calendars';

/* Add Calendar — a dedicated page, reached from the Add Calendar button on the listing (?entityId= pre-selects the entity). */
export default function CalendarCreate() {
  usePageTitle('Add Calendar');
  return (
    <CalendarActionGate action="createLmsCalendar" title="Add Calendar">
      <CalendarCreatePage />
    </CalendarActionGate>
  );
}

function CalendarCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entityId = params.get('entityId') ?? '';
  const initial = useMemo(() => emptyCalendarForm(entityId), [entityId]);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Academic Calendar', link: LIST }, { l: 'Add Calendar' }]}
        title="Add Calendar"
        sub="An academic calendar of an entity: its period, working days and holidays. Choose a centre to make a centre exception calendar."
        back={<BackButton to={LIST} />}
      />

      <CalendarForm
        initial={initial}
        submitLabel="Create calendar"
        backTo={LIST}
        onSave={async (values) => {
          const created = await calendarService.create(values);
          toastOk('Calendar created');
          navigate(`${LIST}/${created.id}`);
        }}
      />
    </div>
  );
}

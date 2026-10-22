import type { ReactNode } from 'react';
import { EmptyState, LinkButton, PageHead } from '../../../../components/ui';
import { useCan, type Action } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';

const LIST = '/lms/calendars';

interface CalendarActionGateProps {
  /* lms-calendars.create for the Add page, lms-calendars.update for the Edit page. */
  action: Action;
  title: string;
  children: ReactNode;
}

/*
 * The route guard only checks the menu's view permission, so the Add and Edit pages could be opened by URL
 * without the right to save. This shows an access notice instead of a form the server would refuse (403).
 */
export default function CalendarActionGate({ action, title, children }: CalendarActionGateProps) {
  const can = useCan();
  if (can(action)) return <>{children}</>;
  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Academic Calendar', link: LIST }, { l: title }]}
        title={title}
        back={<BackButton to={LIST} />}
      />
      <div className="card">
        <EmptyState
          title="You don't have access to this action"
          msg={`Your role may view the academic calendars but not ${action.startsWith('create') ? 'add' : 'change'} them. Ask an administrator if you need it.`}
        >
          <LinkButton to={`#${LIST}`} className="btn primary">
            Back to Academic Calendar
          </LinkButton>
        </EmptyState>
      </div>
    </div>
  );
}

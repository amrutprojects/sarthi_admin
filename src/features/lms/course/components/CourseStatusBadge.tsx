import { Badge } from '../../../../components/ui';
import { COURSE_STATUS_LABELS, type CourseStatus } from '../types/course.types';

/* Tone per lifecycle status: a draft is work in progress, a published course is live, a retired one is closed. */
const TONE: Record<CourseStatus, string> = {
  DRAFT: 'grey',
  PUBLISHED: 'green',
  RETIRED: 'red',
};

/* Lifecycle pill (F-LMS-06-06): Draft, Published or Retired. The system sets it; nothing on screen edits it. */
export default function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <Badge tone={TONE[status] ?? 'grey'}>{COURSE_STATUS_LABELS[status] ?? status}</Badge>;
}

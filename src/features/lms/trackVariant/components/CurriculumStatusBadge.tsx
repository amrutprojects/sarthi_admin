import { Badge } from '../../../../components/ui';
import { CURRICULUM_STATUS_LABELS, type CurriculumStatus } from '../types/trackVariant.types';

const TONE: Record<CurriculumStatus, string> = { DRAFT: 'amber', PUBLISHED: 'green', RETIRED: 'grey' };

/* Draft / Published / Retired pill of a variant or an OFT card (L-07, F-LMS-29-12). */
export default function CurriculumStatusBadge({ status }: { status: CurriculumStatus }) {
  return <Badge tone={TONE[status]}>{CURRICULUM_STATUS_LABELS[status]}</Badge>;
}

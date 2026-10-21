import { Badge } from '../../../../components/ui';
import type { ApiLearningConfigValue } from '../types/learningConfig.types';

/* Where the shown value comes from: the syllabus documents, a saved change, or nothing yet (To Be Confirmed). */
export default function ConfigSourceBadge({ row }: { row: Pick<ApiLearningConfigValue, 'valueSource' | 'toBeConfirmed'> }) {
  if (row.toBeConfirmed || row.valueSource === null) return <Badge tone="amber">To Be Confirmed</Badge>;
  if (row.valueSource === 'SYLLABUS') return <Badge tone="info">Syllabus default</Badge>;
  return <Badge tone="green">Configured</Badge>;
}

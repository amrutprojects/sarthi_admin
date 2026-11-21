import { Badge } from '../../../components/ui';
import type { SyncFlag } from '../types/lmsSync.types';

/* Label and badge tone per sync flag (three-project-integration-design.md §6). */
export const SYNC_FLAG_LABEL: Record<SyncFlag, [label: string, tone: string]> = {
  NOT_SYNCED: ['Not synced', 'grey'],
  PENDING: ['Queued', 'blue'],
  SENT: ['Sent', 'blue'],
  SYNCED: ['Synced', 'green'],
  FAILED: ['Failed', 'red'],
  REVIEW: ['In review', 'amber'],
};

export function SyncFlagBadge({ flag }: { flag: SyncFlag | null | undefined }) {
  const [label, tone] = SYNC_FLAG_LABEL[flag ?? 'NOT_SYNCED'] ?? [String(flag), 'grey'];
  return <Badge tone={tone}>{label}</Badge>;
}

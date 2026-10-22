import { Badge } from '../../../../components/ui';
import { BATCH_STATUS_LABELS, BATCH_STATUS_TONES, type BatchStatus } from '../types/batch.types';

/*
 * Lifecycle pill of a batch (Planned / Open / Full / Closed / Cancelled). Shown next to, never instead of,
 * the Active / Inactive badge: the lifecycle and the offered-in-dropdowns flag are separate.
 */
export default function BatchStatusPill({ status }: { status: BatchStatus }) {
  return <Badge tone={BATCH_STATUS_TONES[status]}>{BATCH_STATUS_LABELS[status] ?? status}</Badge>;
}

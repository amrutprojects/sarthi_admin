import { Badge } from '../../../../components/ui';
import type { CountCheck, TrackVariantCompleteness } from '../types/trackVariant.types';

const ratio = (c: CountCheck) => `${c.actual}/${c.required ?? '—'}`;

/* "Phases 5/7 · Modules 20/22 · OFT 10/12 · Gates 4/6 · Assessment 8/10" ("—": the per-track count is not entered). */
const completenessCounts =(c: TrackVariantCompleteness) =>
  `Phases ${ratio(c.phases)} · Modules ${ratio(c.trackModules)} · OFT ${ratio(c.oftCards)} · Gates ${ratio(c.readinessGates)} · Assessment ${ratio(c.assessmentComponents)}`;

/* Listing badge of the completeness check (L-07): Complete, or Incomplete with the counts against the Module 3 shape. */
export default function CompletenessBadge({ completeness: c }: { completeness: TrackVariantCompleteness }) {
  if (c.complete) return <Badge tone="green">Complete</Badge>;
  return (
    <div title={c.missing.map((m) => m.message).join('\n')}>
      <Badge tone="amber">Incomplete · {c.missing.length} missing</Badge>
      <div className="muted fs12" style={{ marginTop: 3 }}>{completenessCounts(c)}</div>
    </div>
  );
}

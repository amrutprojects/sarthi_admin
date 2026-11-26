import { Callout } from '../../../components/ui';
import { useCan } from '../../auth';
import { DECIDER, plural } from '../labels';
import type { ApprovalSummary } from '../types/ippApprovals.types';

/* "You decide as Divisional Officer for: Pune, Satara" and how much waits. */
export function DecideAs({ summary }: { summary: ApprovalSummary }) {
  if (!summary.stages.length) return <>You see these applications; you do not decide on them.</>;
  const parts = summary.stages.map((stage) => {
    const who = DECIDER[stage] ?? stage;
    if (stage !== 'DIVISION' || !summary.districts) return `${who} for all districts`;
    return summary.districts.length ? `${who} for: ${summary.districts.map((d) => d.name).join(', ')}` : who;
  });
  return (
    <>
      You decide as {parts.join(' and as ')}. {plural(summary.toDecide, 'application')} to decide
      {summary.sentBack ? `, ${summary.sentBack.toLocaleString('en-IN')} of them sent back to you after a rejection` : ''}.
    </>
  );
}

/*
 * Why the user only reads, or has nothing to decide yet. The Super Admin holds every permission and decides only
 * while Head Office approval is off; the Head Officer decides only while it is on.
 */
export function ReadOnlyNote({ summary }: { summary: ApprovalSummary }) {
  const can = useCan();
  if (summary.districts && !summary.districts.length && can('decideIppDivision')) {
    return (
      <div className="mb14">
        <Callout tone="warn" title="No district is assigned to you yet. ">
          You see and decide the applications of your districts. Ask an administrator to assign them under Officer Districts.
        </Callout>
      </div>
    );
  }
  if (summary.stages.length) return null;
  const finalLevel = can('decideIppHeadOffice');
  return (
    <div className="mb14">
      <Callout tone="info" title="Read only. ">
        {!finalLevel
          ? 'Your role sees the applications but does not decide on them.'
          : summary.headOfficeEnabled
            ? 'Head Office approval is on: the Head Officer gives the final approval. While it is off, the Super Admin does.'
            : 'Head Office approval is off: the Super Admin gives the final approval.'}
      </Callout>
    </div>
  );
}

import { titleCase } from '../../components/ui';
import type { Tone } from '../../types/domain';
import type { ApprovalEvent, Stage } from './types/ippApprovals.types';

/* Where an application is (the API's stageLabel), for the places that name a stage without an application: filters, counts. */
export const STAGE_LABEL: Record<Stage, string> = {
  AUDITOR: 'With IPP Auditor',
  DIVISION: 'With Divisional Officer',
  COEP: 'With COEP',
  HEAD_OFFICE: 'With Head Office',
  SUPER_ADMIN: 'With Super Admin',
  APPROVED: 'Final approved',
};
export const STAGE_TONE: Record<Stage, Tone> = {
  AUDITOR: 'red',
  DIVISION: 'amber',
  COEP: 'blue',
  HEAD_OFFICE: 'violet',
  SUPER_ADMIN: 'violet',
  APPROVED: 'green',
};
/* Short names for the history ("Divisional Officer → COEP"). */
export const STAGE_NAME: Record<Stage, string> = {
  AUDITOR: 'IPP Auditor',
  DIVISION: 'Divisional Officer',
  COEP: 'COEP',
  HEAD_OFFICE: 'Head Office',
  SUPER_ADMIN: 'Super Admin',
  APPROVED: 'Final approved',
};
/* Who decides at a stage ("You decide as …"). */
export const DECIDER: Partial<Record<Stage, string>> = {
  DIVISION: 'Divisional Officer',
  COEP: 'COEP',
  HEAD_OFFICE: 'Head Officer',
  SUPER_ADMIN: 'Super Admin',
};

/*
 * Where a decision at a stage sends the application, for the lists (the detail says it itself: approveTo / rejectTo).
 * The API decides; this only words the confirmation.
 */
export function stageAfterApproval(stage: Stage, headOfficeEnabled: boolean): Stage | null {
  if (stage === 'DIVISION') return 'COEP';
  if (stage === 'COEP') return headOfficeEnabled ? 'HEAD_OFFICE' : 'SUPER_ADMIN';
  if (stage === 'HEAD_OFFICE' || stage === 'SUPER_ADMIN') return 'APPROVED';
  return null;
}
/*
 * The approval confirmation names the next approval authority, from the stage an approval sends the application to
 * (stageAfterApproval: COEP after the Divisional Officer; the Head Officer after the COEP, or the Super Admin while
 * Head Office approval is off). After the Head Office or the Super Admin it is the final approval.
 */
const NEXT_AUTHORITY: Partial<Record<Stage, string>> = {
  COEP: 'the COEP for further review and approval',
  HEAD_OFFICE: 'the Head Officer (HO) for final review and approval',
  SUPER_ADMIN: 'the Super Admin for final review and approval',
};
const STAGE_ORDER: readonly Stage[] = ['AUDITOR', 'DIVISION', 'COEP', 'HEAD_OFFICE', 'SUPER_ADMIN', 'APPROVED'];

/* "Once approved, the application will be forwarded to the COEP for further review and approval." */
export function afterApprovalText(to: Stage | null, several = false): string {
  if (to === 'APPROVED') return `Once approved, this will be ${several ? 'their' : 'its'} final approval.`;
  const next = to ? NEXT_AUTHORITY[to] : undefined;
  if (next) return `Once approved, ${several ? 'the applications' : 'the application'} will be forwarded to ${next}.`;
  return `Once approved, ${several ? 'each application' : 'the application'} goes on to its next level.`;
}

/* The confirmation of one approval; `to` = where the approval sends it (the API's approveTo, or stageAfterApproval). */
export const approveOneQuestion = (to: Stage | null): string =>
  `Are you sure you want to approve this application? ${afterApprovalText(to)}`;

/*
 * The confirmation of several approvals, from the stages the applications are at now (`from`). All at one stage: that
 * stage's sentence. At several: each goes to its own next authority, named stage by stage. `subject` names them
 * ("these 3 selected applications", "all 7 applications of batch B-1 that wait for you").
 */
export function approveManyQuestion(subject: string, from: readonly Stage[], headOfficeEnabled: boolean, count: number): string {
  const ask = `Are you sure you want to approve ${subject}?`;
  const stages = STAGE_ORDER.filter((s) => from.includes(s) && stageAfterApproval(s, headOfficeEnabled));
  if (stages.length <= 1) {
    const to = stages.length ? stageAfterApproval(stages[0], headOfficeEnabled) : null;
    return `${ask} ${afterApprovalText(to, count !== 1)}`;
  }
  const parts = stages.map((s) => {
    const to = stageAfterApproval(s, headOfficeEnabled);
    const those = `those with the ${STAGE_NAME[s]}`;
    return to === 'APPROVED' ? `${those} will have their final approval` : `${those} to ${to ? NEXT_AUTHORITY[to] : 'the next level'}`;
  });
  const list = `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${ask} Once approved, each application will be forwarded to its own next approval authority: ${list}.`;
}

/* The stages of mine that a batch has applications at (BatchRow.stages); all of mine when it says none. */
export function batchDecisionStages(mine: readonly Stage[], counts: Partial<Record<Stage, number>>): Stage[] {
  const waiting = mine.filter((s) => (counts[s] ?? 0) > 0);
  return waiting.length ? waiting : [...mine];
}

export function stageAfterRejection(stage: Stage): Stage | null {
  if (stage === 'DIVISION') return 'AUDITOR';
  if (stage === 'COEP') return 'DIVISION';
  if (stage === 'HEAD_OFFICE' || stage === 'SUPER_ADMIN') return 'COEP';
  return null;
}

const EVENT_LABEL: Record<string, string> = {
  RECEIVED: 'Received from IPP',
  RESUBMITTED: 'Received again after the correction',
  CORRECTED: 'Corrected by the IPP Auditor',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MOVED: 'Moved: Head Office approval was switched',
};
export const eventLabel = (event: string): string => EVENT_LABEL[event] ?? titleCase(event);

/* "COEP → Divisional Officer"; a step without a move (received, corrected) names only where it is. */
export function stageMove(e: ApprovalEvent): string {
  const to = STAGE_NAME[e.to] ?? e.to;
  return e.from && e.from !== e.to ? `${STAGE_NAME[e.from] ?? e.from} → ${to}` : to;
}

/* "Asha Patil (COEP)" */
export const whoLabel = (e: { by: string; role: string | null }): string => (e.role && e.role !== e.by ? `${e.by} (${e.role})` : e.by);

export const plural = (n: number, one: string, many = one + 's'): string => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

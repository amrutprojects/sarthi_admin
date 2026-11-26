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

/* Assign Batch, as /api/v1/cms/batch-assignments returns and accepts it. */
import type { BatchStatus } from '../../batch/types/batch.types';

export const ASSIGNMENT_REASONS = ['PREFERRED_CENTRE_FULL', 'CANDIDATE_REQUEST', 'PROGRAMME_DECISION', 'OTHER'] as const;
export type AssignmentReason = (typeof ASSIGNMENT_REASONS)[number];

export const REASON_LABELS: Record<AssignmentReason, string> = {
  PREFERRED_CENTRE_FULL: 'Preferred centre full',
  CANDIDATE_REQUEST: 'Candidate request',
  PROGRAMME_DECISION: 'Programme decision',
  OTHER: 'Other',
};

export interface ApiBatchAssignment {
  id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  batchIsActive: boolean;
  batchStatus: BatchStatus;
  centreId: string;
  centreName: string;
  centreCode: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  /* The centre the student asked for (null when not recorded). */
  studentPreferredCentreCode: string | null;
  reasonCode: AssignmentReason | null;
  remarks: string | null;
  assignedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* One row of the student search feed (/cms/batch-assignments/student-options). No personal fields. */
export interface StudentOption {
  id: string;
  code: string;
  name: string;
  centreCode: string | null;
  /* Code of the batch the student already holds, else null. */
  assignedBatchCode: string | null;
}

export interface CreateBatchAssignmentInput {
  studentId: string;
  batchId: string;
  reasonCode: AssignmentReason | null;
  remarks: string | null;
  isActive?: boolean;
}

/* The student of an assignment never changes, so it is not part of an update. */
export interface UpdateBatchAssignmentInput {
  batchId?: string;
  reasonCode?: AssignmentReason | null;
  remarks?: string | null;
}

/* Field names of the assignment form, used to key validation messages. */
export const BATCH_ASSIGNMENT_FIELDS = ['studentId', 'batchId', 'reasonCode', 'remarks'] as const;
export type BatchAssignmentField = (typeof BATCH_ASSIGNMENT_FIELDS)[number];

import { optionalValue, requireSelection, validateText, type FieldErrors } from '../../validation';
import type { AssignmentReason, BatchAssignmentField, StudentOption } from '../types/batchAssignment.types';

export interface BatchAssignmentFormValues {
  /* The chosen student, kept whole so the form can show the preferred centre and current batch. */
  student: StudentOption | null;
  batchId: string;
  reasonCode: AssignmentReason | '';
  remarks: string;
  isActive: boolean;
}

export const emptyBatchAssignmentForm = (batchId = ''): BatchAssignmentFormValues => ({
  student: null,
  batchId,
  reasonCode: '',
  remarks: '',
  isActive: true,
});

/* The values sent to the API: ids only, null for an empty reason or remarks. */
export const normalizeBatchAssignmentForm = (v: BatchAssignmentFormValues) => ({
  studentId: v.student?.id ?? '',
  batchId: v.batchId,
  reasonCode: v.reasonCode || null,
  remarks: optionalValue(v.remarks),
  isActive: v.isActive,
});

export type BatchAssignmentPayload = ReturnType<typeof normalizeBatchAssignmentForm>;

/* "Asha Patil (STU0001)" */
export const studentText = (s: Pick<StudentOption, 'name' | 'code'>) => `${s.name} (${s.code})`;

/* "Asha Patil (STU0001) — preferred centre TC0001 — already in batch AMK-B-TC0001-001" */
export const studentOptionText = (s: StudentOption) =>
  studentText(s) +
  (s.centreCode ? ` — preferred centre ${s.centreCode}` : '') +
  (s.assignedBatchCode ? ` — already in batch ${s.assignedBatchCode}` : '');

/*
 * The centre codes behind the reason rule, when it applies: the student's preferred centre and the chosen
 * batch's centre differ. Compared like the server does (trimmed, case-insensitive); null when either code
 * is unknown or they match, i.e. when a reason is optional.
 */
export function reasonMismatch(preferredCentreCode: string | null | undefined, batchCentreCode: string | null | undefined) {
  const preferred = preferredCentreCode?.trim().toUpperCase();
  const centre = batchCentreCode?.trim().toUpperCase();
  return preferred && centre && preferred !== centre ? { preferred, centre } : null;
}

export interface BatchAssignmentRuleContext {
  editing?: boolean;
  /* Centre code of the chosen batch (from the batch dropdown), when known. */
  batchCentreCode?: string | null;
}

/*
 * Mirrors the backend rules that can be checked in the browser, including "a reason is required when the
 * batch's centre differs from the student's preferred centre". The server re-checks all of them.
 */
export function validateBatchAssignmentForm(
  v: BatchAssignmentFormValues,
  { editing = false, batchCentreCode }: BatchAssignmentRuleContext = {},
): FieldErrors<BatchAssignmentField> {
  let studentId: string | undefined;
  if (!editing) {
    if (!v.student) studentId = 'Student is required';
    else if (v.student.assignedBatchCode) studentId = `This student is already assigned to batch ${v.student.assignedBatchCode}`;
  }
  const mismatch = v.batchId ? reasonMismatch(v.student?.centreCode, batchCentreCode) : null;
  return {
    studentId,
    batchId: requireSelection(v.batchId, 'Batch'),
    reasonCode:
      mismatch && !v.reasonCode
        ? `Select a reason: the batch is at centre ${mismatch.centre}, the student's preferred centre is ${mismatch.preferred}`
        : undefined,
    remarks: validateText(v.remarks, 'Remarks', { max: 500 }),
  };
}

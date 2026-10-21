import {
  normalizeCode, normalizeName, optionalValue, requireSelection, validateDate, validateEntityName, validateText, validateWholeNumber,
  type FieldErrors,
} from '../../validation';
import type { BatchField, BatchStatus, DeliveryMode } from '../types/batch.types';

export interface BatchFormValues {
  centreId: string;
  name: string;
  /* '' = let the server generate the code. */
  code: string;
  trackName: string;
  deliveryMode: DeliveryMode | '';
  startDate: string;
  endDate: string;
  /* Typed into a text box; converted on submit. */
  capacity: string;
  batchStatus: BatchStatus;
  isActive: boolean;
}

export const emptyBatchForm = (centreId = ''): BatchFormValues => ({
  centreId,
  name: '',
  code: '',
  trackName: '',
  deliveryMode: '',
  startDate: '',
  endDate: '',
  capacity: '',
  batchStatus: 'PLANNED',
  isActive: true,
});

/* Same shape as the server rule and the CHECK constraint: 2–30 of A–Z, 0–9, hyphen; first a letter or digit. */
const BATCH_CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,29}$/;

export function validateBatchCode(raw: string): string | undefined {
  const value = normalizeCode(raw);
  if (!value) return undefined;
  if (value.length < 2) return 'Batch code must be at least 2 characters';
  if (value.length > 30) return 'Batch code must be at most 30 characters';
  if (!BATCH_CODE_RE.test(value)) return 'Batch code may use A–Z, 0–9 and hyphen, starting with a letter or digit';
  return undefined;
}

/* The values sent to the API: normalised name, upper-case code or null (generate), null for empty optionals. */
export const normalizeBatchForm = (v: BatchFormValues) => ({
  centreId: v.centreId,
  name: normalizeName(v.name),
  code: normalizeCode(v.code) || null,
  trackName: optionalValue(v.trackName),
  capacity: Number(v.capacity.trim()),
  startDate: v.startDate,
  endDate: v.endDate || null,
  deliveryMode: v.deliveryMode as DeliveryMode,
  batchStatus: v.batchStatus,
  isActive: v.isActive,
});

export type BatchPayload = ReturnType<typeof normalizeBatchForm>;

export interface BatchRuleContext {
  /* Students holding a seat in the batch being edited (0 on create). */
  assignedCount?: number;
  /* Lifecycle status saved on the record being edited. */
  savedStatus?: BatchStatus;
}

const students = (n: number) => `${n} ${n === 1 ? 'student' : 'students'}`;

/* Mirrors the backend rules, so most problems are named before the form is submitted. */
export function validateBatchForm(v: BatchFormValues, { assignedCount = 0, savedStatus }: BatchRuleContext = {}): FieldErrors<BatchField> {
  const endDate =
    validateDate(v.endDate, 'End date') ??
    (v.endDate && v.startDate && v.endDate <= v.startDate ? 'End date must be after the start date' : undefined);
  const capacity =
    validateWholeNumber(v.capacity, 'Capacity', { min: 1, max: 100000, required: true }) ??
    (assignedCount > 0 && Number(v.capacity) < assignedCount ? `Capacity cannot be lower than the ${students(assignedCount)} already assigned` : undefined);
  const batchStatus =
    v.batchStatus === 'CANCELLED' && savedStatus !== 'CANCELLED' && assignedCount > 0
      ? `Reassign ${students(assignedCount)} before cancelling`
      : undefined;

  return {
    centreId: requireSelection(v.centreId, 'Training centre'),
    name: validateEntityName(v.name, 'Batch name', { max: 100 }),
    code: validateBatchCode(v.code),
    trackName: validateText(v.trackName, 'Technology track', { max: 100 }),
    deliveryMode: requireSelection(v.deliveryMode, 'Delivery mode'),
    startDate: validateDate(v.startDate, 'Start date', true),
    endDate,
    capacity,
    batchStatus,
  };
}

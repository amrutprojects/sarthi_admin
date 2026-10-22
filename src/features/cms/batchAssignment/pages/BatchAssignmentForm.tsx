import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import type { BatchOption } from '../../batch/types/batch.types';
import { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import SearchSelect from '../../components/SearchSelect';
import { ConfirmModal, toastError } from '../../shared';
import type { GeoOption } from '../../types';
import { isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { STUDENT_SEARCH_LIMIT, batchAssignmentService } from '../services/batchAssignmentService';
import {
  ASSIGNMENT_REASONS, BATCH_ASSIGNMENT_FIELDS, REASON_LABELS, type AssignmentReason, type BatchAssignmentField, type StudentOption,
} from '../types/batchAssignment.types';
import {
  emptyBatchAssignmentForm, normalizeBatchAssignmentForm, reasonMismatch, studentOptionText, studentText, validateBatchAssignmentForm,
  type BatchAssignmentFormValues, type BatchAssignmentPayload,
} from '../validation/batchAssignment.validation';

interface BatchAssignmentFormProps {
  initial?: BatchAssignmentFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: BatchAssignmentPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /*
   * Edit: the assignment's current batch, kept selectable even when it is no longer offered for new
   * assignments (inactive, full, closed…), so the select never silently drops the saved value.
   */
  currentBatch?: GeoOption | null;
  /* Edit: centre code of currentBatch, for the reason rule while that batch stays selected. */
  currentBatchCentreCode?: string | null;
  /* Edit: the student is fixed and shown read-only. */
  editing?: boolean;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-batch-assignment-form';

/*
 * The Assign Batch create / edit form, on its own page.
 *
 * Create: the student is found by typing part of the name or code (the register is too large for a
 * dropdown); students who already hold a batch are listed but cannot be picked. Edit: the student is
 * fixed; the batch, reason and remarks can change. The server re-checks the student, the batch (active,
 * Open, centre active), the free seats and the reason rule on every write.
 */
export default function BatchAssignmentForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentBatch, currentBatchCentreCode, editing = false, statusSlot,
}: BatchAssignmentFormProps) {
  const [values, setValues] = useState<BatchAssignmentFormValues>(initial ?? emptyBatchAssignmentForm());
  const [touched, setTouched] = useState<Partial<Record<BatchAssignmentField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<BatchAssignmentField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /* The batch rows as loaded, kept so the chosen batch's centre code is known (reason rule). */
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);

  const loadBatches = useCallback(async () => {
    const rows = await batchAssignmentService.assignableBatches();
    setBatchOptions(rows);
    return rows;
  }, []);

  /* Centre code of the chosen batch: from the loaded rows, or the saved batch of an edit form. */
  const batchCentreCode =
    batchOptions.find((b) => b.id === values.batchId)?.centreCode ??
    (values.batchId && values.batchId === currentBatch?.id ? currentBatchCentreCode : undefined);

  const local = validateBatchAssignmentForm(values, { editing, batchCentreCode });
  const show = (f: BatchAssignmentField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: BatchAssignmentField) => () => setTouched((t) => ({ ...t, [f]: true }));

  /* Server messages are keyed by API field (studentId), the form value by `student`. */
  const fieldOf = (key: keyof BatchAssignmentFormValues): BatchAssignmentField | null =>
    key === 'student' ? 'studentId' : key === 'isActive' ? null : key;

  const set = <K extends keyof BatchAssignmentFormValues>(key: K, value: BatchAssignmentFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    const field = fieldOf(key);
    if (field && field in serverErrors) setServerErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (!isValid(local)) return;
    if (confirmMessage) {
      setConfirming(true);
      return;
    }
    await save();
  }

  async function save() {
    setConfirming(false);
    setBusy(true);
    setServerErrors({});
    try {
      await onSave(normalizeBatchAssignmentForm(values));
      setDirty(false);
    } catch (err) {
      /* 422 / 400 carry per-field messages (student, batch, reason); show them on the fields. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, BATCH_ASSIGNMENT_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const preferred = values.student?.centreCode ?? null;
  /* Set when the batch is not at the student's preferred centre: the reason is then required. */
  const mismatch = values.batchId ? reasonMismatch(preferred, batchCentreCode) : null;
  const reasonHint = mismatch
    ? `Required: the batch is at centre ${mismatch.centre}, the student's preferred centre is ${mismatch.preferred}.`
    : !preferred
      ? values.student
        ? 'Optional: no preferred centre is recorded for this student.'
        : "Required when the batch's centre differs from the student's preferred centre."
      : batchCentreCode
        ? `Optional: the batch is at the student's preferred centre (${preferred}).`
        : `Required when the batch is not at the student's preferred centre (${preferred}).`;

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          <div className="grid g2">
            {editing ? (
              <MasterField
                id="ba-student"
                label="Student"
                required
                hint={
                  (preferred ? `Preferred centre ${preferred}. ` : 'No preferred centre recorded. ') +
                  'The student cannot be changed. To assign a different student, delete this assignment and create a new one.'
                }
              >
                <input className="inp" id="ba-student" value={values.student ? studentText(values.student) : ''} readOnly disabled />
              </MasterField>
            ) : (
              <SearchSelect<StudentOption>
                id="ba-student"
                label="Student"
                required
                search={batchAssignmentService.searchStudents}
                value={values.student}
                onChange={(s) => set('student', s)}
                optionText={studentText}
                renderOption={studentOptionText}
                disabledReason={(s) => (s.assignedBatchCode ? 'Already assigned. Edit or delete that assignment to move this student.' : undefined)}
                placeholder="Type a name or student code"
                truncatedAt={STUDENT_SEARCH_LIMIT}
                hint={
                  values.student
                    ? preferred
                      ? `Preferred centre ${preferred}.`
                      : 'No preferred centre recorded for this student.'
                    : 'Type at least 2 characters of the name or student code. Students already in a batch cannot be picked.'
                }
                error={show('studentId')}
                onBlur={touch('studentId')}
              />
            )}

            <RootSelect
              id="ba-batch"
              label="Batch"
              required
              load={loadBatches}
              value={values.batchId}
              onChange={(v) => { set('batchId', v); setTouched((t) => ({ ...t, batchId: true })); }}
              placeholder="Select batch"
              emptyHint="No batch is open for assignment. Open a batch in the Batch Master first."
              hint="Only active, Open batches of active centres are offered. Free seats are checked when you save."
              extraOption={currentBatch ?? undefined}
              error={show('batchId')}
            />

            <MasterField id="ba-reason" label="Reason" required={!!mismatch} error={show('reasonCode')} hint={reasonHint}>
              <select
                className="inp"
                {...fieldAria('ba-reason', show('reasonCode'))}
                value={values.reasonCode}
                onChange={(e) => set('reasonCode', e.target.value as AssignmentReason | '')}
              >
                <option value="">{mismatch ? 'Select reason' : 'No reason'}</option>
                {ASSIGNMENT_REASONS.map((r) => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
              </select>
            </MasterField>

            <MasterField id="ba-remarks" label="Remarks" error={show('remarks')} hint="Optional. Up to 500 characters.">
              <textarea
                className="inp"
                {...fieldAria('ba-remarks', show('remarks'))}
                rows={3}
                value={values.remarks}
                maxLength={500}
                onChange={(e) => set('remarks', e.target.value)}
                onBlur={touch('remarks')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="ba-status" label="Status" hint="An active assignment holds a seat in the batch; an inactive one does not.">
                <select
                  className="inp"
                  id="ba-status"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => set('isActive', e.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </MasterField>
            )}
          </div>
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}

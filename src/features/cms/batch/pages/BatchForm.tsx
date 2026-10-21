import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError } from '../../shared';
import { optionLabel, type GeoOption } from '../../types';
import { codeKeystroke, digitsKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import {
  BATCH_FIELDS, BATCH_STATUSES, BATCH_STATUS_LABELS, DELIVERY_MODES, DELIVERY_MODE_LABELS, type BatchField, type BatchStatus, type DeliveryMode,
} from '../types/batch.types';
import {
  emptyBatchForm, normalizeBatchForm, validateBatchForm, type BatchFormValues, type BatchPayload,
} from '../validation/batch.validation';

interface BatchFormProps {
  initial?: BatchFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: BatchPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* The saved centre of a batch being edited, kept selectable even if it was deactivated since. */
  currentCentre?: GeoOption | null;
  /* Edit only: students holding a seat (active assignments). While > 0 the capacity has a floor and cancelling is refused. */
  assignedCount?: number;
  /*
   * Edit only: every assignment of the batch, active or inactive. While > 0 the centre and code are locked:
   * the server refuses to change them even when no assignment holds a seat.
   */
  assignmentCount?: number;
  /* Edit only: lifecycle status saved on the record (cancelling is checked against it). */
  savedStatus?: BatchStatus;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-batch-form';

const students = (n: number) => `${n} ${n === 1 ? 'student is' : 'students are'}`;
const assignments = (n: number) => `${n} student ${n === 1 ? 'assignment' : 'assignments'}`;

/*
 * The Batch create / edit form, on its own page, in two sections (Batch details, Schedule & capacity).
 *
 * Only the centre id is submitted, never its name; the backend re-checks the centre, the uniqueness of the
 * name within the centre, the dates, the seat floor and the cancel rule on every write.
 */
export default function BatchForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentCentre, assignedCount = 0, assignmentCount = 0, savedStatus, statusSlot,
}: BatchFormProps) {
  const [values, setValues] = useState<BatchFormValues>(initial ?? emptyBatchForm());
  const [touched, setTouched] = useState<Partial<Record<BatchField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<BatchField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /*
   * Centre and code are fixed once any assignment exists, inactive ones included (the server refuses the
   * change with 409), so the lock follows assignmentCount, not the seats taken.
   */
  const locked = assignmentCount > 0;

  const local = validateBatchForm(values, { assignedCount, savedStatus });
  const show = (f: BatchField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: BatchField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof BatchFormValues>(key: K, value: BatchFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as BatchField]: undefined }));
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
      await onSave(normalizeBatchForm(values));
      setDirty(false);
    } catch (err) {
      /* 422 / 400 carry per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, BATCH_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const lockHint = `Locked: ${assignments(assignmentCount)} (active or inactive) ${assignmentCount === 1 ? 'references' : 'reference'} this batch. Move or delete them in Assign Batch first.`;

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>Batch details</h3></div>
          <div className="card-b">
            <div className="grid g2">
              {locked ? (
                <MasterField id="bt-centre" label="Training centre" required hint={lockHint}>
                  <select className="inp" id="bt-centre" disabled value={values.centreId}>
                    <option value={values.centreId}>{currentCentre ? optionLabel(currentCentre) : values.centreId}</option>
                  </select>
                </MasterField>
              ) : (
                <RootSelect
                  id="bt-centre"
                  label="Training centre"
                  required
                  load={masterOptions.trainingCentres}
                  value={values.centreId}
                  onChange={(v) => { set('centreId', v); setTouched((t) => ({ ...t, centreId: true })); }}
                  placeholder="Select training centre"
                  emptyHint="No active training centres yet. Add one in the Training Centre Master first."
                  hint="The batch runs at this centre. Its name must be unique within the centre."
                  extraOption={currentCentre ?? undefined}
                  error={show('centreId')}
                />
              )}

              <MasterField id="bt-name" label="Batch Name" required error={show('name')} hint="For example Web Development - Morning. 2 to 100 characters.">
                <input
                  className="inp"
                  {...fieldAria('bt-name', show('name'))}
                  value={values.name}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={touch('name')}
                />
              </MasterField>

              <MasterField
                id="bt-code"
                label="Batch Code"
                error={show('code')}
                hint={locked ? lockHint : 'Leave blank to generate (AMK-B-<centre code>-001). A–Z, 0–9 and hyphen, up to 30 characters.'}
              >
                <input
                  className="inp mono"
                  {...fieldAria('bt-code', show('code'))}
                  value={values.code}
                  maxLength={30}
                  autoComplete="off"
                  placeholder="Leave blank to generate"
                  disabled={locked}
                  onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                  onBlur={touch('code')}
                />
              </MasterField>

              <MasterField id="bt-track" label="Technology track" error={show('trackName')} hint="Optional. For example Full Stack Development. Up to 100 characters.">
                <input
                  className="inp"
                  {...fieldAria('bt-track', show('trackName'))}
                  value={values.trackName}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(e) => set('trackName', e.target.value)}
                  onBlur={touch('trackName')}
                />
              </MasterField>

              <MasterField id="bt-mode" label="Delivery mode" required error={show('deliveryMode')} hint="How the batch is taught.">
                <select
                  className="inp"
                  {...fieldAria('bt-mode', show('deliveryMode'))}
                  value={values.deliveryMode}
                  onChange={(e) => { set('deliveryMode', e.target.value as DeliveryMode | ''); setTouched((t) => ({ ...t, deliveryMode: true })); }}
                  onBlur={touch('deliveryMode')}
                >
                  <option value="">Select delivery mode</option>
                  {DELIVERY_MODES.map((m) => <option key={m} value={m}>{DELIVERY_MODE_LABELS[m]}</option>)}
                </select>
              </MasterField>

              {statusSlot ?? (
                <MasterField id="bt-status" label="Status" hint="An active batch is offered in dropdowns; an inactive one is kept but hidden.">
                  <select
                    className="inp"
                    id="bt-status"
                    value={values.isActive ? 'true' : 'false'}
                    onChange={(e) => set('isActive', e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </MasterField>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Schedule &amp; capacity</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="bt-start" label="Start date" required error={show('startDate')} hint="First day of the batch.">
                <input
                  type="date"
                  className="inp"
                  {...fieldAria('bt-start', show('startDate'))}
                  value={values.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  onBlur={touch('startDate')}
                />
              </MasterField>

              <MasterField id="bt-end" label="End date" error={show('endDate')} hint="Optional. Must be after the start date.">
                <input
                  type="date"
                  className="inp"
                  {...fieldAria('bt-end', show('endDate'))}
                  value={values.endDate}
                  min={values.startDate || undefined}
                  onChange={(e) => set('endDate', e.target.value)}
                  onBlur={touch('endDate')}
                />
              </MasterField>

              <MasterField
                id="bt-capacity"
                label="Capacity"
                required
                error={show('capacity')}
                hint={
                  assignedCount > 0
                    ? `Seats in the batch, 1 to 100000. At least ${assignedCount}: ${students(assignedCount)} already assigned.`
                    : 'Seats in the batch, 1 to 100000.'
                }
              >
                <input
                  className="inp"
                  {...fieldAria('bt-capacity', show('capacity'))}
                  inputMode="numeric"
                  value={values.capacity}
                  autoComplete="off"
                  onChange={(e) => set('capacity', digitsKeystroke(e.target.value, 6))}
                  onBlur={touch('capacity')}
                />
              </MasterField>

              <MasterField
                id="bt-batch-status"
                label="Batch status"
                required
                error={show('batchStatus')}
                hint="Only an Open batch accepts new student assignments. A batch holding students cannot be cancelled."
              >
                <select
                  className="inp"
                  {...fieldAria('bt-batch-status', show('batchStatus'))}
                  value={values.batchStatus}
                  onChange={(e) => { set('batchStatus', e.target.value as BatchStatus); setTouched((t) => ({ ...t, batchStatus: true })); }}
                >
                  {BATCH_STATUSES.map((s) => <option key={s} value={s}>{BATCH_STATUS_LABELS[s]}</option>)}
                </select>
              </MasterField>
            </div>
          </div>
          <div className="card-f">
            <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
          </div>
        </div>
      </form>
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
    </>
  );
}

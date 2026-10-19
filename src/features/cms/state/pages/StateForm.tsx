import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { STATE_FIELDS, type StateField } from '../types/state.types';
import { emptyStateForm, normalizeStateForm, validateStateForm, type StateFormValues } from '../validation/state.validation';

interface StateFormProps {
  initial?: StateFormValues;
  submitLabel: string;
  /* Resolves true when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: StateFormValues) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-state-form';

/*
 * The State create / edit form, on its own page (no modal).
 *
 * - Validates on submit and re-validates a field once it has been touched, so messages appear as the
 *   problem is fixed rather than on every keystroke from the start.
 * - Submitting is blocked while a save is in flight, so the button cannot be double-clicked.
 * - Entered values survive a failed save; field messages the server returned (422 details) are shown
 *   against the matching input, and anything else is toasted.
 */
export default function StateForm({ initial, submitLabel, onSave, backTo, confirmMessage, statusSlot }: StateFormProps) {
  const [values, setValues] = useState<StateFormValues>(initial ?? emptyStateForm());
  const [touched, setTouched] = useState<Partial<Record<StateField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<StateField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateStateForm(values);
  const show = (f: StateField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];

  const set = <K extends keyof StateFormValues>(key: K, value: StateFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as StateField]: undefined }));
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
      await onSave(normalizeStateForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverFieldErrors(err.details, STATE_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          <div className="grid g2">
            <MasterField id="st-name" label="State Name" required error={show('name')} hint="For example Maharashtra. 2 to 100 characters.">
              <input
                className="inp"
                {...fieldAria('st-name', show('name'))}
                value={values.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
            </MasterField>

            <MasterField id="st-code" label="State Code" required error={show('code')} hint="Short upper-case code, for example MH. 2 to 10 characters, letters and digits.">
              <input
                className="inp mono"
                {...fieldAria('st-code', show('code'))}
                value={values.code}
                maxLength={10}
                autoComplete="off"
                onChange={(e) => set('code', codeKeystroke(e.target.value))}
                onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="st-status" label="Status" hint="A new state is active and immediately available to the District master.">
                <select
                  className="inp"
                  id="st-status"
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

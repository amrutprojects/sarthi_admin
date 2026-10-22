import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { CENTRE_TYPE_FIELDS, type CentreTypeField } from '../types/centreType.types';
import {
  emptyCentreTypeForm, normalizeCentreTypeForm, validateCentreTypeForm, type CentreTypeFormValues,
} from '../validation/centreType.validation';

interface CentreTypeFormProps {
  initial?: CentreTypeFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeCentreTypeForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-centre-type-form';

/*
 * The Training Centre Type create / edit form, on its own page (no modal). Same behaviour as the
 * Department form: validates on submit and once a field is touched, blocks double submits, keeps
 * entered values after a failed save, and shows server field messages (400 / 422) against the
 * matching input.
 */
export default function CentreTypeForm({ initial, submitLabel, onSave, backTo, confirmMessage, statusSlot }: CentreTypeFormProps) {
  const [values, setValues] = useState<CentreTypeFormValues>(initial ?? emptyCentreTypeForm());
  const [touched, setTouched] = useState<Partial<Record<CentreTypeField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CentreTypeField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateCentreTypeForm(values);
  const show = (f: CentreTypeField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CentreTypeField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CentreTypeFormValues>(key: K, value: CentreTypeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as CentreTypeField]: undefined }));
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
      await onSave(normalizeCentreTypeForm(values));
      setDirty(false);
    } catch (err) {
      /* A 400 / 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, CENTRE_TYPE_FIELDS);
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
            <MasterField id="ct-name" label="Centre Type Name" required error={show('name')} hint="For example Partner. 2 to 100 characters.">
              <input
                className="inp"
                {...fieldAria('ct-name', show('name'))}
                value={values.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={touch('name')}
              />
            </MasterField>

            <MasterField id="ct-code" label="Centre Type Code" required error={show('code')} hint="Short upper-case code, for example PARTNER. 2 to 20 characters; a hyphen is allowed.">
              <input
                className="inp mono"
                {...fieldAria('ct-code', show('code'))}
                value={values.code}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                onBlur={touch('code')}
              />
            </MasterField>

            <MasterField id="ct-description" label="Description" error={show('description')} hint="Optional. Up to 500 characters.">
              <textarea
                className="inp"
                {...fieldAria('ct-description', show('description'))}
                rows={3}
                value={values.description}
                maxLength={500}
                onChange={(e) => set('description', e.target.value)}
                onBlur={touch('description')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="ct-status" label="Status" hint="A new centre type is active and immediately available in the Training Centre form.">
                <select
                  className="inp"
                  id="ct-status"
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

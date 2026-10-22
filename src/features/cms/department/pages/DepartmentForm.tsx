import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { DEPARTMENT_FIELDS, type DepartmentField } from '../types/department.types';
import {
  emptyDepartmentForm, normalizeDepartmentForm, validateDepartmentForm, type DepartmentFormValues,
} from '../validation/department.validation';

interface DepartmentFormProps {
  initial?: DepartmentFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeDepartmentForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-department-form';

/*
 * The Department create / edit form, on its own page (no modal). Same behaviour as the State form:
 * validates on submit and once a field is touched, blocks double submits, keeps entered values after a
 * failed save, and shows server field messages (422) against the matching input.
 */
export default function DepartmentForm({ initial, submitLabel, onSave, backTo, confirmMessage, statusSlot }: DepartmentFormProps) {
  const [values, setValues] = useState<DepartmentFormValues>(initial ?? emptyDepartmentForm());
  const [touched, setTouched] = useState<Partial<Record<DepartmentField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<DepartmentField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateDepartmentForm(values);
  const show = (f: DepartmentField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: DepartmentField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof DepartmentFormValues>(key: K, value: DepartmentFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as DepartmentField]: undefined }));
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
      await onSave(normalizeDepartmentForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, DEPARTMENT_FIELDS);
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
            <MasterField id="dp-name" label="Department Name" required error={show('name')} hint="For example Computer Science & Engineering. 2 to 100 characters.">
              <input
                className="inp"
                {...fieldAria('dp-name', show('name'))}
                value={values.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={touch('name')}
              />
            </MasterField>

            <MasterField id="dp-code" label="Department Code" required error={show('code')} hint="Short upper-case code, for example CSE. 2 to 20 characters; a hyphen is allowed.">
              <input
                className="inp mono"
                {...fieldAria('dp-code', show('code'))}
                value={values.code}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                onBlur={touch('code')}
              />
            </MasterField>

            <MasterField id="dp-description" label="Description" error={show('description')} hint="Optional. Up to 500 characters.">
              <textarea
                className="inp"
                {...fieldAria('dp-description', show('description'))}
                rows={3}
                value={values.description}
                maxLength={500}
                onChange={(e) => set('description', e.target.value)}
                onBlur={touch('description')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="dp-status" label="Status" hint="A new department is active and immediately available in dropdowns.">
                <select
                  className="inp"
                  id="dp-status"
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

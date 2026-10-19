import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { ConfirmModal, toastError } from '../../shared';
import type { GeoOption } from '../../types';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { stateService } from '../../state/services/stateService';
import { DISTRICT_FIELDS, type DistrictField } from '../types/district.types';
import { emptyDistrictForm, normalizeDistrictForm, validateDistrictForm, type DistrictFormValues } from '../validation/district.validation';

interface DistrictFormProps {
  initial?: DistrictFormValues;
  submitLabel: string;
  onSave: (values: DistrictFormValues) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /*
   * The saved state of a record being edited, so it stays selectable even if it was deactivated after
   * the district was created. Without it the select would quietly drop the current parent.
   */
  currentState?: GeoOption | null;
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-district-form';

/*
 * The District create / edit form, on its own page.
 *
 * The State dropdown is populated from the State Master, and only the state id is submitted — the
 * name is never used to identify the parent. The backend re-validates the state on every write.
 */
export default function DistrictForm({ initial, submitLabel, onSave, backTo, confirmMessage, currentState, statusSlot }: DistrictFormProps) {
  const [values, setValues] = useState<DistrictFormValues>(initial ?? emptyDistrictForm());
  const [touched, setTouched] = useState<Partial<Record<DistrictField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<DistrictField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateDistrictForm(values);
  const show = (f: DistrictField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];

  const set = <K extends keyof DistrictFormValues>(key: K, value: DistrictFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => ({ ...e, [key as DistrictField]: undefined }));
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
      await onSave(normalizeDistrictForm(values));
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, DISTRICT_FIELDS);
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
            <RootSelect
              id="dt-state"
              label="State"
              required
              load={stateService.options}
              value={values.stateId}
              onChange={(v) => { set('stateId', v); setTouched((t) => ({ ...t, stateId: true })); }}
              placeholder="Select state"
              emptyHint="No active states yet. Add a state in the State Master first."
              hint="The district is stored against this state."
              extraOption={currentState ?? undefined}
              error={show('stateId')}
            />

            <MasterField id="dt-name" label="District Name" required error={show('name')} hint="For example Pune. Must be unique within the selected state.">
              <input
                className="inp"
                {...fieldAria('dt-name', show('name'))}
                value={values.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
            </MasterField>

            <MasterField
              id="dt-code"
              label="District Code"
              required
              error={show('code')}
              hint="Short upper-case code, for example PUN. Unique within the state; a hyphen is allowed."
            >
              <input
                className="inp mono"
                {...fieldAria('dt-code', show('code'))}
                value={values.code}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="dt-status" label="Status" hint="A new district is active and immediately available to the Taluka master.">
                <select
                  className="inp"
                  id="dt-status"
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

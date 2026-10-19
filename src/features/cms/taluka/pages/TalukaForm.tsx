import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import DependentSelect, { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { ConfirmModal, toastError } from '../../shared';
import type { GeoOption } from '../../types';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { districtService } from '../../district/services/districtService';
import { stateService } from '../../state/services/stateService';
import { TALUKA_FIELDS, type TalukaField } from '../types/taluka.types';
import {
  emptyTalukaForm, normalizeTalukaForm, validateTalukaForm, type TalukaFormValues, type TalukaPayload,
} from '../validation/taluka.validation';

interface TalukaFormProps {
  initial?: TalukaFormValues;
  submitLabel: string;
  onSave: (values: TalukaPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Saved parents of a record being edited, kept selectable even if they were since deactivated. */
  currentState?: GeoOption | null;
  currentDistrict?: GeoOption | null;
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-taluka-form';

/*
 * The Taluka create / edit form, on its own page, with the State -> District cascade.
 *
 * The District dropdown is disabled until a state is chosen, loads only that state's districts, and
 * clears itself whenever the state changes (DependentSelect owns that behaviour). Both ids are
 * submitted so the server can reject a district that does not belong to the submitted state — the
 * browser filtering is convenience, the server check is the guarantee.
 */
export default function TalukaForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentState, currentDistrict, statusSlot,
}: TalukaFormProps) {
  const [values, setValues] = useState<TalukaFormValues>(initial ?? emptyTalukaForm());
  const [touched, setTouched] = useState<Partial<Record<TalukaField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<TalukaField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateTalukaForm(values);
  const show = (f: TalukaField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];

  const set = <K extends keyof TalukaFormValues>(key: K, value: TalukaFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => ({ ...e, [key as TalukaField]: undefined }));
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
      await onSave(normalizeTalukaForm(values));
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, TALUKA_FIELDS);
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
              id="tk-state"
              label="State"
              required
              load={stateService.options}
              value={values.stateId}
              onChange={(v) => { set('stateId', v); setTouched((t) => ({ ...t, stateId: true })); }}
              placeholder="Select state"
              emptyHint="No active states yet. Add a state in the State Master first."
              hint="Choosing a state loads its districts below."
              extraOption={currentState ?? undefined}
              error={show('stateId')}
            />

            <DependentSelect
              id="tk-district"
              label="District"
              required
              parentValue={values.stateId}
              load={districtService.optionsOfState}
              value={values.districtId}
              onChange={(v) => { set('districtId', v); setTouched((t) => ({ ...t, districtId: true })); }}
              placeholder="Select district"
              disabledHint="Select a state first."
              emptyHint="This state has no active districts yet. Add one in the District Master."
              extraOption={currentDistrict ?? undefined}
              error={show('districtId')}
            />

            <MasterField id="tk-name" label="Taluka Name" required error={show('name')} hint="For example Haveli. Must be unique within the selected district.">
              <input
                className="inp"
                {...fieldAria('tk-name', show('name'))}
                value={values.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
            </MasterField>

            <MasterField
              id="tk-code"
              label="Taluka Code"
              error={show('code')}
              hint="Optional. When given it must be unique within the district, for example HVL."
            >
              <input
                className="inp mono"
                {...fieldAria('tk-code', show('code'))}
                value={values.code}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="tk-status" label="Status" hint="A new taluka is active and immediately available to the public website forms.">
                <select
                  className="inp"
                  id="tk-status"
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

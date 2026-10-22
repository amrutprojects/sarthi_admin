import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import DependentSelect, { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError } from '../../shared';
import type { GeoOption } from '../../types';
import { codeKeystroke, digitsKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { COLLEGE_FIELDS, type CollegeField } from '../types/college.types';
import {
  emptyCollegeForm, normalizeCollegeForm, validateCollegeForm, type CollegeFormValues, type CollegePayload,
} from '../validation/college.validation';

interface CollegeFormProps {
  initial?: CollegeFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: CollegePayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Saved parents of a record being edited, kept selectable even if they were since deactivated. */
  currentState?: GeoOption | null;
  currentDistrict?: GeoOption | null;
  currentTaluka?: GeoOption | null;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-college-form';

/*
 * The College create / edit form, on its own page, grouped into three sections.
 *
 * Location is the State -> District -> Taluka cascade: each dropdown is disabled until its parent is
 * chosen, loads only that parent's active children, and clears itself when the parent changes
 * (DependentSelect owns that), so changing the state also clears the district and the taluka. The
 * state id is submitted only so the server can reject a district of another state; the district and
 * the optional taluka are what is stored, and the server re-checks both on every write.
 *
 * Same behaviour as the Department form otherwise: validates on submit and once a field is touched,
 * blocks double submits, keeps entered values after a failed save, and shows server field messages
 * (400 / 422) against the matching input.
 */
export default function CollegeForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentState, currentDistrict, currentTaluka, statusSlot,
}: CollegeFormProps) {
  const [values, setValues] = useState<CollegeFormValues>(initial ?? emptyCollegeForm());
  const [touched, setTouched] = useState<Partial<Record<CollegeField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CollegeField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateCollegeForm(values);
  const show = (f: CollegeField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CollegeField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CollegeFormValues>(key: K, value: CollegeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => ({ ...e, [key as CollegeField]: undefined }));
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
      await onSave(normalizeCollegeForm(values));
      setDirty(false);
    } catch (err) {
      /* A 400 / 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, COLLEGE_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>College details</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="cl-name" label="College Name" required error={show('name')} hint="For example College of Engineering Pune. 2 to 150 characters; unique within the district.">
                <input
                  className="inp"
                  {...fieldAria('cl-name', show('name'))}
                  value={values.name}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={touch('name')}
                />
              </MasterField>

              <MasterField id="cl-code" label="College Code" required error={show('code')} hint="Short upper-case code, for example COEP. 2 to 20 characters; a hyphen is allowed.">
                <input
                  className="inp mono"
                  {...fieldAria('cl-code', show('code'))}
                  value={values.code}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                  onBlur={touch('code')}
                />
              </MasterField>

              {statusSlot ?? (
                <MasterField id="cl-status" label="Status" hint="A new college is active and immediately available in dropdowns.">
                  <select
                    className="inp"
                    id="cl-status"
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

        <div className="card mb14">
          <div className="card-h"><h3>Location</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <RootSelect
                id="cl-state"
                label="State"
                required
                load={masterOptions.states}
                value={values.stateId}
                onChange={(v) => { set('stateId', v); setTouched((t) => ({ ...t, stateId: true })); }}
                placeholder="Select state"
                emptyHint="No active states yet. Add a state in the State Master first."
                hint="Choosing a state loads its districts."
                extraOption={currentState ?? undefined}
                error={show('stateId')}
              />

              <DependentSelect
                id="cl-district"
                label="District"
                required
                parentValue={values.stateId}
                load={masterOptions.districtsOfState}
                value={values.districtId}
                onChange={(v) => { set('districtId', v); setTouched((t) => ({ ...t, districtId: true })); }}
                placeholder="Select district"
                disabledHint="Select a state first."
                emptyHint="This state has no active districts yet. Add one in the District Master."
                /* The saved district belongs to the saved state; offering it under another state would let a mismatched pair be picked. */
                extraOption={currentDistrict && values.stateId === currentState?.id ? currentDistrict : undefined}
                error={show('districtId')}
              />

              <DependentSelect
                id="cl-taluka"
                label="Taluka"
                parentValue={values.districtId}
                load={masterOptions.talukasOfDistrict}
                value={values.talukaId}
                onChange={(v) => { set('talukaId', v); setTouched((t) => ({ ...t, talukaId: true })); }}
                placeholder="No taluka"
                disabledHint="Optional. Select a district first."
                emptyHint="This district has no active talukas. The taluka is optional."
                extraOption={currentTaluka && values.districtId === currentDistrict?.id ? currentTaluka : undefined}
                error={show('talukaId')}
              />

              <MasterField id="cl-pin" label="PIN Code" error={show('pinCode')} hint="Optional. 6 digits.">
                <input
                  className="inp mono"
                  {...fieldAria('cl-pin', show('pinCode'))}
                  value={values.pinCode}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  onChange={(e) => set('pinCode', digitsKeystroke(e.target.value, 6))}
                  onBlur={touch('pinCode')}
                />
              </MasterField>

              <MasterField id="cl-address" label="Address" error={show('address')} hint="Optional. Up to 300 characters.">
                <textarea
                  className="inp"
                  {...fieldAria('cl-address', show('address'))}
                  rows={3}
                  value={values.address}
                  maxLength={300}
                  onChange={(e) => set('address', e.target.value)}
                  onBlur={touch('address')}
                />
              </MasterField>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Contact</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="cl-contact"
                label="Contact Number"
                error={show('contactNumber')}
                hint="Optional. A 10-digit mobile number, or a landline with its STD code such as 020-25507000."
              >
                <input
                  className="inp mono"
                  {...fieldAria('cl-contact', show('contactNumber'))}
                  value={values.contactNumber}
                  inputMode="tel"
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => set('contactNumber', e.target.value.replace(/[^\d\s-]/g, ''))}
                  onBlur={touch('contactNumber')}
                />
              </MasterField>

              <MasterField id="cl-email" label="Email" error={show('email')} hint="Optional. For example office@college.edu.in.">
                <input
                  className="inp"
                  type="email"
                  {...fieldAria('cl-email', show('email'))}
                  value={values.email}
                  maxLength={254}
                  autoComplete="off"
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={touch('email')}
                />
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

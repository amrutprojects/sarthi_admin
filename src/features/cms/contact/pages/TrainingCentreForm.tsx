import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { useDistrictOptions } from '../services/districtOptions';
import type { DistrictRef } from '../types/contact.types';
import {
  CENTRE_ADDRESS_MAX,
  CENTRE_FIELDS,
  CENTRE_MANAGER_MAX,
  CENTRE_NAME_MAX,
  type CentreField,
  type CreateTrainingCentreInput,
} from '../types/trainingCentre.types';
import { emptyCentreForm, normalizeCentreForm, validateCentreForm, type CentreFormValues } from '../validation/trainingCentre.validation';

interface TrainingCentreFormProps {
  initial?: CentreFormValues;
  /* Edit: the centre's saved district, which stays on offer even if it was deactivated since. */
  savedDistrict?: DistrictRef;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: CreateTrainingCentreInput) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Edit: the order box may not be left empty (an existing centre keeps a place). */
  orderRequired?: boolean;
  /* Create shows the Show on website select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-contact-centre-form';

/* The backend reports "body.name.mr" on a 422 and "districtId" on a 400; a message about a whole pair lands on its Marathi half. */
function mapServerErrors(err: ApiError): FieldErrors<CentreField> {
  const mapped: FieldErrors<CentreField> = {};
  for (const detail of err.details) {
    let key = (detail.field ?? '').replace(/^body\./, '');
    if (key === 'name' || key === 'address' || key === 'managerName') key = `${key}.mr`;
    if ((CENTRE_FIELDS as readonly string[]).includes(key) && !mapped[key as CentreField]) mapped[key as CentreField] = detail.message;
  }
  return mapped;
}

/*
 * The training centre create and edit form, on its own page (no modal): one centre in the "Approved training
 * centres" card of its district's page on the website. A district may have any number of centres.
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it has been
 * touched, blocks a double submit, keeps the entered values when a save fails, and shows the server's field
 * messages against the matching input.
 */
export default function TrainingCentreForm({
  initial,
  savedDistrict,
  submitLabel,
  onSave,
  backTo,
  confirmMessage,
  orderRequired = false,
  statusSlot,
}: TrainingCentreFormProps) {
  const [values, setValues] = useState<CentreFormValues>(initial ?? emptyCentreForm());
  const [touched, setTouched] = useState<Partial<Record<CentreField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CentreField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const districts = useDistrictOptions();

  const local = validateCentreForm(values, { orderRequired });
  const show = (f: CentreField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CentreField) => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CentreFormValues>(key: K, value: CentreFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => {
      const next = { ...e };
      for (const f of CENTRE_FIELDS) if (f === key || f.startsWith(`${key}.`)) delete next[f];
      return next;
    });
  };

  const all = districts.data ?? [];
  const ownMissing = savedDistrict && !all.some((d) => d.id === savedDistrict.id) ? savedDistrict : null;

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
      await onSave(normalizeCentreForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 or the 400 of an unknown district carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = mapServerErrors(err);
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
            <MasterField
              id="tc-district"
              label="District"
              required
              error={show('districtId')}
              hint={
                districts.error ? (
                  <>
                    Could not load the districts. {districts.error.message}{' '}
                    <button type="button" className="btn xs" onClick={() => void districts.reload()}>
                      Retry
                    </button>
                  </>
                ) : (
                  'The centre is listed on this district’s page. A district can have any number of centres.'
                )
              }
            >
              <select
                className="inp"
                {...fieldAria('tc-district', show('districtId'))}
                value={values.districtId}
                disabled={districts.loading}
                onChange={(e) => set('districtId', e.target.value)}
                onBlur={() => touch('districtId')}
              >
                <option value="">{districts.loading ? 'Loading districts…' : 'Select a district…'}</option>
                {ownMissing ? <option value={ownMissing.id}>{ownMissing.name} (inactive)</option> : null}
                {all.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state})
                  </option>
                ))}
              </select>
            </MasterField>
            <MasterField
              id="tc-order"
              label="Display order"
              required={orderRequired}
              error={show('displayOrder')}
              hint={orderRequired ? 'Lower numbers are listed first on the district’s page.' : 'Optional. Left empty, the centre goes to the end of its district’s list.'}
            >
              <input
                className="inp"
                {...fieldAria('tc-order', show('displayOrder'))}
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                value={values.displayOrder}
                onChange={(e) => set('displayOrder', e.target.value)}
                onBlur={() => touch('displayOrder')}
              />
            </MasterField>
          </div>

          <BilingualField
            id="tc-name"
            label="Centre name"
            maxLength={CENTRE_NAME_MAX}
            value={values.name}
            onChange={(next) => set('name', next)}
            onBlur={(half) => touch(`name.${half}`)}
            errorMr={show('name.mr')}
            errorEn={show('name.en')}
          />

          <BilingualField
            id="tc-address"
            label="Address"
            required={false}
            multiline
            maxLength={CENTRE_ADDRESS_MAX}
            value={values.address}
            onChange={(next) => set('address', next)}
            onBlur={(half) => touch(`address.${half}`)}
            errorMr={show('address.mr')}
            errorEn={show('address.en')}
            hint="Optional, but both languages or neither."
          />

          <BilingualField
            id="tc-manager"
            label="Centre manager"
            required={false}
            maxLength={CENTRE_MANAGER_MAX}
            value={values.managerName}
            onChange={(next) => set('managerName', next)}
            onBlur={(half) => touch(`managerName.${half}`)}
            errorMr={show('managerName.mr')}
            errorEn={show('managerName.en')}
            hint="Optional, but both languages or neither."
          />

          <div className="grid g2">
            <MasterField id="tc-phone" label="Phone" error={show('phone')} hint="Optional. X may mask a digit, e.g. +91 98XXX 51200.">
              <input
                className="inp"
                {...fieldAria('tc-phone', show('phone'))}
                type="tel"
                maxLength={32}
                autoComplete="off"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => touch('phone')}
              />
            </MasterField>
            <MasterField id="tc-email" label="Email" error={show('email')} hint="Optional.">
              <input
                className="inp"
                {...fieldAria('tc-email', show('email'))}
                type="email"
                maxLength={255}
                autoComplete="off"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
            </MasterField>
          </div>

          <div className="grid g2">
            {statusSlot ?? (
              <MasterField id="tc-active" label="Show on website" hint="Hidden centres are kept here but not shown on the district's page.">
                <select
                  className="inp"
                  id="tc-active"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => set('isActive', e.target.value === 'true')}
                >
                  <option value="true">Visible</option>
                  <option value="false">Hidden</option>
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

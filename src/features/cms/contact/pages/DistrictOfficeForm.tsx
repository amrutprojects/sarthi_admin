import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError, useApiData } from '../../shared';
import { contactService } from '../services/contactService';
import { useDistrictOptions } from '../services/districtOptions';
import { OFFICE_FIELDS, type CreateDistrictOfficeInput, type DistrictRef, type OfficeField } from '../types/contact.types';
import {
  COLLECTOR_NAME_MAX,
  OFFICE_ADDRESS_MAX,
  OFFICE_HOURS_MAX,
  emptyOfficeForm,
  normalizeOfficeForm,
  validateOfficeForm,
  type OfficeFormValues,
} from '../validation/contact.validation';

interface DistrictOfficeFormProps {
  initial?: OfficeFormValues;
  /* Edit: the office being changed and its saved district, which stays on offer even if it was deactivated since. */
  officeId?: string;
  savedDistrict?: DistrictRef;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: CreateDistrictOfficeInput) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Show on website select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-contact-office-form';

/*
 * The backend reports "body.address.mr" on a 422 and "districtId" on the 409 / 400 of the district
 * rules. A message about a whole pair ("body.address") lands on its Marathi half, which is shown first.
 */
function mapServerErrors(err: ApiError): FieldErrors<OfficeField> {
  const mapped: FieldErrors<OfficeField> = {};
  for (const detail of err.details) {
    let key = (detail.field ?? '').replace(/^body\./, '');
    if (key === 'address' || key === 'officeHours') key = `${key}.mr`;
    if ((OFFICE_FIELDS as readonly string[]).includes(key) && !mapped[key as OfficeField]) mapped[key as OfficeField] = detail.message;
  }
  return mapped;
}

/*
 * The district office create and edit form, on its own page (no modal): the Collectorate details shown
 * on one district's page. Every field but the district is optional — the website leaves out
 * whatever is left blank.
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it
 * has been touched, blocks a double submit, keeps the entered values when a save fails, and shows the
 * server's field messages — including a district that already has an office (409) — against the
 * matching input.
 */
export default function DistrictOfficeForm({
  initial,
  officeId,
  savedDistrict,
  submitLabel,
  onSave,
  backTo,
  confirmMessage,
  statusSlot,
}: DistrictOfficeFormProps) {
  const [values, setValues] = useState<OfficeFormValues>(initial ?? emptyOfficeForm());
  const [touched, setTouched] = useState<Partial<Record<OfficeField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<OfficeField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const districts = useDistrictOptions();
  const offices = useApiData(() => contactService.allDistrictOffices(), []);

  const local = validateOfficeForm(values);
  const show = (f: OfficeField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: OfficeField) => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof OfficeFormValues>(key: K, value: OfficeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => {
      const next = { ...e };
      for (const f of OFFICE_FIELDS) if (f === key || f.startsWith(`${key}.`)) delete next[f];
      return next;
    });
  };

  /* One office per district: offer the districts with no office yet, plus this office's own. */
  const taken = new Set((offices.data ?? []).filter((o) => o.id !== officeId).map((o) => o.district.id));
  const all = districts.data ?? [];
  const available = all.filter((d) => !taken.has(d.id));
  const ownMissing = savedDistrict && !all.some((d) => d.id === savedDistrict.id) ? savedDistrict : null;
  const loading = districts.loading || offices.loading;
  const loadError = districts.error ?? offices.error;

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
      await onSave(normalizeOfficeForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422, or the 409 / 400 of the district rules, carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 409 || err.status === 400) && err.details.length) {
        const mapped = mapServerErrors(err);
        setServerErrors(mapped);
        if (!isValid(mapped)) {
          /* Another administrator may have added an office for the district meanwhile: show the list as it is now. */
          if (mapped.districtId) void offices.reload();
          return;
        }
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
              id="of-district"
              label="District"
              required
              error={show('districtId')}
              hint={
                loadError ? (
                  <>
                    Could not load the districts. {loadError.message}{' '}
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => {
                        if (districts.error) void districts.reload();
                        if (offices.error) void offices.reload();
                      }}
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  'One entry per district: districts that already have an office are not offered.'
                )
              }
            >
              <select
                className="inp"
                {...fieldAria('of-district', show('districtId'))}
                value={values.districtId}
                disabled={loading}
                onChange={(e) => set('districtId', e.target.value)}
                onBlur={() => touch('districtId')}
              >
                <option value="">{loading ? 'Loading districts…' : available.length || ownMissing ? 'Select a district…' : 'Every district has an entry'}</option>
                {ownMissing ? <option value={ownMissing.id}>{ownMissing.name} (inactive)</option> : null}
                {available.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state})
                  </option>
                ))}
              </select>
            </MasterField>
            <MasterField id="of-collector" label="District Collector" error={show('collectorName')} hint="Optional.">
              <input
                className="inp"
                {...fieldAria('of-collector', show('collectorName'))}
                maxLength={COLLECTOR_NAME_MAX}
                autoComplete="off"
                value={values.collectorName}
                onChange={(e) => set('collectorName', e.target.value)}
                onBlur={() => touch('collectorName')}
              />
            </MasterField>
          </div>

          <BilingualField
            id="of-address"
            label="Office address"
            required={false}
            multiline
            maxLength={OFFICE_ADDRESS_MAX}
            value={values.address}
            onChange={(next) => set('address', next)}
            onBlur={(half) => touch(`address.${half}`)}
            errorMr={show('address.mr')}
            errorEn={show('address.en')}
            hint="Optional, but both languages or neither."
          />

          <div className="grid g2">
            <MasterField id="of-phone" label="Official phone" error={show('phone')} hint="Optional. For example 020 2612 3456.">
              <input
                className="inp"
                {...fieldAria('of-phone', show('phone'))}
                type="tel"
                maxLength={32}
                autoComplete="off"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => touch('phone')}
              />
            </MasterField>
            <MasterField id="of-email" label="Official email" error={show('email')} hint="Optional.">
              <input
                className="inp"
                {...fieldAria('of-email', show('email'))}
                type="email"
                maxLength={255}
                autoComplete="off"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
            </MasterField>
          </div>

          <BilingualField
            id="of-hours"
            label="Office hours"
            required={false}
            maxLength={OFFICE_HOURS_MAX}
            value={values.officeHours}
            onChange={(next) => set('officeHours', next)}
            onBlur={(half) => touch(`officeHours.${half}`)}
            errorMr={show('officeHours.mr')}
            errorEn={show('officeHours.en')}
            hint="Optional. For example Mon–Fri, 10:00 – 17:45."
          />

          <div className="grid g2">
            {statusSlot ?? (
              <MasterField id="of-active" label="Show on website" hint="Hidden entries are kept here but not shown on the district's page.">
                <select
                  className="inp"
                  id="of-active"
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

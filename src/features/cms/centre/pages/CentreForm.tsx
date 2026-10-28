import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import DependentSelect, { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError, useApiData } from '../../shared';
import type { GeoOption } from '../../types';
import { codeKeystroke, digitsKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { centreService } from '../services/centreService';
import { CENTRE_FIELDS, type CentreField, type CentreTechnology } from '../types/centre.types';
import {
  MAX_CENTRE_TECHNOLOGIES, emptyCentreForm, normalizeCentreForm, validateCentreForm, type CentreFormValues, type CentrePayload,
} from '../validation/centre.validation';

interface CentreFormProps {
  initial?: CentreFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: CentrePayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Saved parents of a record being edited, kept selectable even if they were since deactivated. */
  currentState?: GeoOption | null;
  currentDistrict?: GeoOption | null;
  currentTaluka?: GeoOption | null;
  /* Technologies already allocated (Edit). Ones no longer active stay listed, marked inactive, so they can be removed. */
  currentTechnologies?: CentreTechnology[];
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-centre-form';
/* Below this many technologies the list is short enough that a search box is only noise. */
const SEARCH_FROM = 8;

interface TechnologyChoice {
  /* Track code (T01 to T12): the value sent in technologyCodes. */
  code: string;
  name: string;
  inactive: boolean;
}

/*
 * The Center create / edit form, on its own page — the College form plus a contact person and the
 * allocated technologies (technology tracks T01 to T12).
 *
 * Location is the State -> District -> Taluka cascade (DependentSelect clears a child when its parent
 * changes). Allocated Technologies is a checkbox list of the active technology tracks; on Edit, an
 * allocated technology that has since been deactivated stays in the list, ticked and marked
 * "(inactive)", so it can be removed but not newly added.
 */
export default function CentreForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentState, currentDistrict, currentTaluka, currentTechnologies, statusSlot,
}: CentreFormProps) {
  const [values, setValues] = useState<CentreFormValues>(initial ?? emptyCentreForm());
  const [touched, setTouched] = useState<Partial<Record<CentreField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CentreField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [technologySearch, setTechnologySearch] = useState('');
  const technologyOptions = useApiData(() => centreService.technologyOptions(), []);

  const local = validateCentreForm(values);
  const show = (f: CentreField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CentreField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CentreFormValues>(key: K, value: CentreFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => ({ ...e, [key as CentreField]: undefined }));
  };

  /* Active technologies, plus any allocated technology that is no longer active (kept so it can be unticked). */
  const choices = useMemo<TechnologyChoice[]>(() => {
    const offered = (technologyOptions.data ?? []).map((t) => ({ code: t.code, name: t.name, inactive: false }));
    const codes = new Set(offered.map((t) => t.code));
    const stale = (currentTechnologies ?? [])
      .filter((t) => !codes.has(t.code))
      .map((t) => ({ code: t.code, name: t.name, inactive: true }));
    return [...stale, ...offered];
  }, [technologyOptions.data, currentTechnologies]);

  const selected = new Set(values.technologyCodes);
  const needle = technologySearch.trim().toLowerCase();
  const visibleChoices = needle
    ? choices.filter((t) => t.name.toLowerCase().includes(needle) || t.code.toLowerCase().includes(needle))
    : choices;

  const toggleTechnology = (code: string) => {
    set(
      'technologyCodes',
      selected.has(code) ? values.technologyCodes.filter((x) => x !== code) : [...values.technologyCodes, code],
    );
    setTouched((t) => ({ ...t, technologyCodes: true }));
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
      await onSave(normalizeCentreForm(values));
      setDirty(false);
    } catch (err) {
      /* A 400 / 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        /* "body.technologyCodes.2" names one element of the array; map it onto the technology list. */
        const details = err.details.map((d) => ({
          ...d,
          field: d.field?.replace(/(^|\.)technologyCodes\.\d+$/, '$1technologyCodes'),
        }));
        const mapped = serverFieldErrors(details, CENTRE_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const technologyError = show('technologyCodes');

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>Center details</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="ce-name" label="Center Name" required error={show('name')} hint="2 to 150 characters; unique within the district.">
                <input
                  className="inp"
                  {...fieldAria('ce-name', show('name'))}
                  value={values.name}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={touch('name')}
                />
              </MasterField>

              <MasterField id="ce-code" label="Center Code" required error={show('code')} hint="Short upper-case code, for example PUN-01. 2 to 20 characters; a hyphen is allowed.">
                <input
                  className="inp mono"
                  {...fieldAria('ce-code', show('code'))}
                  value={values.code}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                  onBlur={touch('code')}
                />
              </MasterField>

              {statusSlot ?? (
                <MasterField id="ce-status" label="Status" hint="A new center is active and immediately available in dropdowns.">
                  <select
                    className="inp"
                    id="ce-status"
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
                id="ce-state"
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
                id="ce-district"
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
                id="ce-taluka"
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

              <MasterField id="ce-pin" label="PIN Code" error={show('pinCode')} hint="Optional. 6 digits.">
                <input
                  className="inp mono"
                  {...fieldAria('ce-pin', show('pinCode'))}
                  value={values.pinCode}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  onChange={(e) => set('pinCode', digitsKeystroke(e.target.value, 6))}
                  onBlur={touch('pinCode')}
                />
              </MasterField>

              <MasterField id="ce-address" label="Address" error={show('address')} hint="Optional. Up to 300 characters.">
                <textarea
                  className="inp"
                  {...fieldAria('ce-address', show('address'))}
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

        <div className="card mb14">
          <div className="card-h">
            <h3>Allocated Technologies</h3>
            <span className="tag">{selected.size} selected</span>
          </div>
          <div className="card-b">
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={technologyError ? 'ce-technologies-error' : undefined}>
              <legend className="hint" style={{ marginBottom: 8 }}>
                Optional. The technologies (3rd module) offered at this center; students choose one of them when they register. Up to {MAX_CENTRE_TECHNOLOGIES}.
              </legend>
              {choices.length >= SEARCH_FROM ? (
                <input
                  className="inp mb10"
                  type="search"
                  aria-label="Search technologies"
                  placeholder="Search technologies by name or code"
                  value={technologySearch}
                  onChange={(e) => setTechnologySearch(e.target.value)}
                />
              ) : null}
              {technologyOptions.error ? (
                <div className="hint" style={{ color: 'var(--red)' }} role="alert">
                  Could not load the technologies. {technologyOptions.error.message}{' '}
                  <button type="button" className="btn xs" onClick={() => void technologyOptions.reload()}>Retry</button>
                </div>
              ) : technologyOptions.loading && !technologyOptions.data ? (
                <div className="hint" aria-busy="true">Loading technologies…</div>
              ) : !choices.length ? (
                <div className="hint">No active technologies yet. Activate a technology track first.</div>
              ) : (
                <div
                  role="group"
                  aria-label="Technologies"
                  style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}
                >
                  {visibleChoices.length ? (
                    visibleChoices.map((t) => (
                      <label key={t.code} className="f ac gp8 fs13" style={{ padding: '5px 0' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(t.code)}
                          /* A technology that is no longer active can only be removed, not added back. */
                          disabled={t.inactive && !selected.has(t.code)}
                          onChange={() => toggleTechnology(t.code)}
                        />
                        <span>
                          <span className="mono muted fs12">{t.code}</span> – {t.name}
                          {t.inactive ? <span className="muted"> (inactive)</span> : null}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="hint">No technology matches “{technologySearch.trim()}”.</div>
                  )}
                </div>
              )}
              {technologyError ? (
                <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id="ce-technologies-error" role="alert">
                  {technologyError}
                </div>
              ) : null}
            </fieldset>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Contact</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="ce-person" label="Contact Person" error={show('contactPerson')} hint="Optional. Up to 120 characters; letters, spaces and . ' - only.">
                <input
                  className="inp"
                  {...fieldAria('ce-person', show('contactPerson'))}
                  value={values.contactPerson}
                  maxLength={120}
                  autoComplete="off"
                  onChange={(e) => set('contactPerson', e.target.value)}
                  onBlur={touch('contactPerson')}
                />
              </MasterField>

              <MasterField
                id="ce-contact"
                label="Contact Number"
                error={show('contactNumber')}
                hint="Optional. A 10-digit mobile number, or a landline with its STD code such as 020-25507000."
              >
                <input
                  className="inp mono"
                  {...fieldAria('ce-contact', show('contactNumber'))}
                  value={values.contactNumber}
                  inputMode="tel"
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => set('contactNumber', e.target.value.replace(/[^\d\s-]/g, ''))}
                  onBlur={touch('contactNumber')}
                />
              </MasterField>

              <MasterField id="ce-email" label="Email" error={show('email')} hint="Optional. For example centre@example.org.">
                <input
                  className="inp"
                  type="email"
                  {...fieldAria('ce-email', show('email'))}
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

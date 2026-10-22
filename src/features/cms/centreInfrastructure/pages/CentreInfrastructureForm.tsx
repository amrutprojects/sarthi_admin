import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError } from '../../shared';
import { digitsKeystroke, isValid, type FieldErrors } from '../../validation';
import {
  FACILITY_AVAILABILITY, FACILITY_AVAILABILITY_LABELS, FACILITY_CODES, FACILITY_LABELS, type FacilityCode,
} from '../types/centreInfrastructure.types';
import {
  emptyCentreInfrastructureForm, facilityKey, infrastructureServerErrors, normalizeCentreInfrastructureForm,
  validateCentreInfrastructureForm, type CentreInfrastructureErrorKey, type CentreInfrastructureFormValues, type FacilityRow,
  type TriState,
} from '../validation/centreInfrastructure.validation';

interface CentreInfrastructureFormProps {
  initial?: CentreInfrastructureFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeCentreInfrastructureForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /*
   * Edit: the record's training centre, shown as read-only text because the centre cannot change once
   * the record exists. Create leaves it out and gets the centre dropdown instead.
   */
  fixedCentre?: { name: string; code: string; isActive: boolean };
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-centre-infrastructure-form';

type NumberField = 'maxSeatingCapacity' | 'numberOfFloors' | 'trainingRooms' | 'computerSystems';
type TextField = 'internetType' | 'internetSpeed' | 'powerBackup';
type AmenityField = 'hasLift' | 'hasAc' | 'hasWashroom' | 'hasDrinkingWater';

/*
 * The Capacity & Infrastructure create / edit form, on its own page, in three sections: Capacity,
 * Connectivity & amenities, and the 20-row Facilities checklist. Same behaviour as the Department form:
 * validates on submit and once a field is touched, blocks double submits, keeps entered values after a
 * failed save, and shows server field messages (422 / 400) against the matching input or facility row.
 */
export default function CentreInfrastructureForm({
  initial, submitLabel, onSave, backTo, confirmMessage, fixedCentre, statusSlot,
}: CentreInfrastructureFormProps) {
  const [values, setValues] = useState<CentreInfrastructureFormValues>(initial ?? emptyCentreInfrastructureForm());
  const [touched, setTouched] = useState<Partial<Record<CentreInfrastructureErrorKey, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CentreInfrastructureErrorKey>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateCentreInfrastructureForm(values);
  const show = (f: CentreInfrastructureErrorKey) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CentreInfrastructureErrorKey) => () => setTouched((t) => ({ ...t, [f]: true }));
  const clearServer = (...keys: CentreInfrastructureErrorKey[]) => {
    if (keys.some((k) => serverErrors[k])) setServerErrors((e) => ({ ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) }));
  };

  const set = <K extends keyof CentreInfrastructureFormValues>(key: K, value: CentreInfrastructureFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key !== 'isActive') clearServer(key as CentreInfrastructureErrorKey);
  };

  /* Clearing a row's availability also clears its remarks: a "not recorded" facility is not stored at all. */
  const setFacility = (code: FacilityCode, patch: Partial<FacilityRow>) => {
    setValues((v) => {
      const row = { ...v.facilities[code], ...patch };
      if (!row.availability) row.remarks = '';
      return { ...v, facilities: { ...v.facilities, [code]: row } };
    });
    setDirty(true);
    clearServer(facilityKey(code), 'facilities');
  };

  const recorded = FACILITY_CODES.filter((c) => values.facilities[c].availability).length;

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
      await onSave(normalizeCentreInfrastructureForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 / 400 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = infrastructureServerErrors(err.details);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const numberField = (f: NumberField, id: string, label: string, hint: string, digits: number, required = false) => (
    <MasterField id={id} label={label} required={required} error={show(f)} hint={hint}>
      <input
        className="inp"
        {...fieldAria(id, show(f))}
        inputMode="numeric"
        value={values[f]}
        maxLength={digits}
        autoComplete="off"
        onChange={(e) => set(f, digitsKeystroke(e.target.value, digits))}
        onBlur={touch(f)}
      />
    </MasterField>
  );

  const textField = (f: TextField, id: string, label: string, hint: string, max: number) => (
    <MasterField id={id} label={label} error={show(f)} hint={hint}>
      <input
        className="inp"
        {...fieldAria(id, show(f))}
        value={values[f]}
        maxLength={max}
        onChange={(e) => set(f, e.target.value)}
        onBlur={touch(f)}
      />
    </MasterField>
  );

  const amenityField = (f: AmenityField, id: string, label: string) => (
    <MasterField id={id} label={label} error={show(f)} hint="Leave as Not recorded when unknown.">
      <select className="inp" {...fieldAria(id, show(f))} value={values[f]} onChange={(e) => set(f, e.target.value as TriState)}>
        <option value="">Not recorded</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </MasterField>
  );

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate>
      <div className="card mb14">
        <div className="card-h"><h3>Capacity</h3></div>
        <div className="card-b">
          <div className="grid g2">
            {fixedCentre ? (
              <MasterField
                id="ci-centre"
                label="Training Centre"
                hint="The centre cannot be changed. To record another centre, add a new record for it."
              >
                <div id="ci-centre" className="f ac gp8" style={{ minHeight: 36 }}>
                  <b>{fixedCentre.name}</b>
                  <span className="tag">{fixedCentre.code}</span>
                  {fixedCentre.isActive ? null : <span className="muted">(inactive)</span>}
                </div>
              </MasterField>
            ) : (
              <RootSelect
                id="ci-centre"
                label="Training Centre"
                required
                load={masterOptions.trainingCentres}
                value={values.centreId}
                onChange={(v) => { set('centreId', v); setTouched((t) => ({ ...t, centreId: true })); }}
                placeholder="Select training centre"
                emptyHint="No active training centres yet. Add one in the Training Centre Master first."
                hint="Each centre has one capacity & infrastructure record. The centre cannot be changed later."
                error={show('centreId')}
              />
            )}

            {statusSlot ?? (
              <MasterField id="ci-status" label="Status" hint="A new record is active.">
                <select
                  className="inp"
                  id="ci-status"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => set('isActive', e.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </MasterField>
            )}

            {numberField('maxSeatingCapacity', 'ci-seating', 'Maximum Seating Capacity', 'Learners the centre can seat at once. 1 to 100000.', 6, true)}
            {numberField('numberOfFloors', 'ci-floors', 'Number of Floors', 'Optional. 0 to 200.', 3)}
            {numberField('trainingRooms', 'ci-rooms', 'Training Rooms', 'Optional. 0 to 1000.', 4)}
            {numberField('computerSystems', 'ci-computers', 'Computer Systems', 'Optional. Working systems available to learners. 0 to 100000.', 6)}
          </div>
        </div>
      </div>

      <div className="card mb14">
        <div className="card-h"><h3>Connectivity &amp; amenities</h3></div>
        <div className="card-b">
          <div className="grid g2">
            {textField('internetType', 'ci-internet-type', 'Internet Type', 'Optional. For example broadband, leased line, 4G. Up to 60 characters.', 60)}
            {textField('internetSpeed', 'ci-internet-speed', 'Internet Speed', 'Optional. For example 100 Mbps. Up to 60 characters.', 60)}
            {amenityField('hasLift', 'ci-lift', 'Lift')}
            {amenityField('hasAc', 'ci-ac', 'Air Conditioning')}
            {amenityField('hasWashroom', 'ci-washroom', 'Washroom')}
            {amenityField('hasDrinkingWater', 'ci-water', 'Drinking Water')}
            {textField(
              'powerBackup',
              'ci-power',
              'Power Backup (UPS / Generator / Inverter, Capacity)',
              'Optional. For example 10 kVA generator + UPS. Up to 200 characters.',
              200,
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Facilities <span className="sub">{recorded} of {FACILITY_CODES.length} recorded</span></h3>
        </div>
        <div className="card-b">
          {show('facilities') ? (
            <div className="hint mb14" style={{ color: 'var(--red)', fontWeight: 600 }} role="alert">{show('facilities')}</div>
          ) : (
            <div className="hint mb14">Choose Yes, No or To be confirmed for each facility that has been assessed; leave the rest as —. Remarks are optional.</div>
          )}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Facility</th>
                  <th style={{ width: 190 }}>Availability</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {FACILITY_CODES.map((code) => {
                  const row = values.facilities[code];
                  const key = facilityKey(code);
                  const remarksId = `ci-fac-${code.toLowerCase()}-remarks`;
                  const err = show(key);
                  return (
                    <tr key={code} className="norow">
                      <td><label htmlFor={`ci-fac-${code.toLowerCase()}`}>{FACILITY_LABELS[code]}</label></td>
                      <td>
                        <select
                          className="inp sm"
                          id={`ci-fac-${code.toLowerCase()}`}
                          value={row.availability}
                          onChange={(e) => setFacility(code, { availability: e.target.value as FacilityRow['availability'] })}
                        >
                          <option value="">—</option>
                          {FACILITY_AVAILABILITY.map((a) => <option key={a} value={a}>{FACILITY_AVAILABILITY_LABELS[a]}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          className="inp sm"
                          {...fieldAria(remarksId, err)}
                          aria-label={`${FACILITY_LABELS[code]} remarks`}
                          value={row.remarks}
                          maxLength={200}
                          disabled={!row.availability}
                          placeholder={row.availability ? 'Optional' : 'Choose an availability first'}
                          onChange={(e) => setFacility(code, { remarks: e.target.value })}
                          onBlur={touch(key)}
                        />
                        {err ? (
                          <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={`${remarksId}-error`} role="alert">{err}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-f">
          <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
        </div>
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
    </form>
  );
}

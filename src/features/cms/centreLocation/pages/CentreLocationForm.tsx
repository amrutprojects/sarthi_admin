import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError } from '../../shared';
import { digitsKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import { CENTRE_LOCATION_FIELDS, PARKING_LABELS, PARKING_OPTIONS, type CentreLocationField, type ParkingOption } from '../types/centreLocation.types';
import {
  emptyCentreLocationForm, normalizeCentreLocationForm, validateCentreLocationForm, type CentreLocationFormValues,
} from '../validation/centreLocation.validation';

interface CentreLocationFormProps {
  initial?: CentreLocationFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeCentreLocationForm>) => Promise<void>;
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

const FORM_ID = 'cms-centre-location-form';

/*
 * The Location Information create / edit form, on its own page, in two sections (Address, and Location
 * & accessibility). Same behaviour as the Department form: validates on submit and once a field is
 * touched, blocks double submits, keeps entered values after a failed save, and shows server field
 * messages (422 / 400) against the matching input.
 */
export default function CentreLocationForm({
  initial, submitLabel, onSave, backTo, confirmMessage, fixedCentre, statusSlot,
}: CentreLocationFormProps) {
  const [values, setValues] = useState<CentreLocationFormValues>(initial ?? emptyCentreLocationForm());
  const [touched, setTouched] = useState<Partial<Record<CentreLocationField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CentreLocationField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateCentreLocationForm(values);
  const show = (f: CentreLocationField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CentreLocationField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CentreLocationFormValues>(key: K, value: CentreLocationFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as CentreLocationField]: undefined }));
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
      await onSave(normalizeCentreLocationForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 / 400 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, CENTRE_LOCATION_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  /* One optional single-line text field of the second section. */
  const textField = (f: 'nearestLandmark' | 'nearestStation' | 'publicTransport', id: string, label: string, hint: string) => (
    <MasterField id={id} label={label} error={show(f)} hint={hint}>
      <input
        className="inp"
        {...fieldAria(id, show(f))}
        value={values[f]}
        maxLength={200}
        onChange={(e) => set(f, e.target.value)}
        onBlur={touch(f)}
      />
    </MasterField>
  );

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate>
      <div className="card mb14">
        <div className="card-h"><h3>Address</h3></div>
        <div className="card-b">
          <div className="grid g2">
            {fixedCentre ? (
              <MasterField
                id="cl-centre"
                label="Training Centre"
                hint="The centre cannot be changed. To record the location of another centre, add a new record for it."
              >
                <div id="cl-centre" className="f ac gp8" style={{ minHeight: 36 }}>
                  <b>{fixedCentre.name}</b>
                  <span className="tag">{fixedCentre.code}</span>
                  {fixedCentre.isActive ? null : <span className="muted">(inactive)</span>}
                </div>
              </MasterField>
            ) : (
              <RootSelect
                id="cl-centre"
                label="Training Centre"
                required
                load={masterOptions.trainingCentres}
                value={values.centreId}
                onChange={(v) => { set('centreId', v); setTouched((t) => ({ ...t, centreId: true })); }}
                placeholder="Select training centre"
                emptyHint="No active training centres yet. Add one in the Training Centre Master first."
                hint="Each centre has one location record. The centre cannot be changed later."
                error={show('centreId')}
              />
            )}

            {statusSlot ?? (
              <MasterField id="cl-status" label="Status" hint="A new record is active.">
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

            <MasterField id="cl-address" label="Address" required error={show('address')} hint="Full postal address of the centre. 5 to 300 characters.">
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

            <MasterField id="cl-pin" label="PIN Code" error={show('pinCode')} hint="Optional. 6 digits.">
              <input
                className="inp mono"
                {...fieldAria('cl-pin', show('pinCode'))}
                inputMode="numeric"
                value={values.pinCode}
                maxLength={6}
                autoComplete="off"
                onChange={(e) => set('pinCode', digitsKeystroke(e.target.value, 6))}
                onBlur={touch('pinCode')}
              />
            </MasterField>

            <MasterField id="cl-url" label="Google Maps / Location URL" error={show('locationUrl')} hint="Optional. An https link, for example a Google Maps share link.">
              <input
                className="inp"
                {...fieldAria('cl-url', show('locationUrl'))}
                type="url"
                inputMode="url"
                placeholder="https://maps.app.goo.gl/…"
                value={values.locationUrl}
                maxLength={500}
                autoComplete="off"
                onChange={(e) => set('locationUrl', e.target.value)}
                onBlur={touch('locationUrl')}
              />
            </MasterField>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Location &amp; accessibility</h3></div>
        <div className="card-b">
          <div className="grid g2">
            {textField('nearestLandmark', 'cl-landmark', 'Nearest Landmark', 'Optional. Up to 200 characters.')}
            {textField('nearestStation', 'cl-station', 'Nearest Railway Station / Bus Stand', 'Optional. Up to 200 characters.')}
            {textField('publicTransport', 'cl-transport', 'Public Transport Availability', 'Optional. For example city bus every 15 minutes. Up to 200 characters.')}

            <MasterField id="cl-parking" label="Parking" error={show('parking')} hint="Optional.">
              <select
                className="inp"
                {...fieldAria('cl-parking', show('parking'))}
                value={values.parking}
                onChange={(e) => set('parking', e.target.value as '' | ParkingOption)}
              >
                <option value="">Not recorded</option>
                {PARKING_OPTIONS.map((p) => <option key={p} value={p}>{PARKING_LABELS[p]}</option>)}
              </select>
            </MasterField>

            <MasterField id="cl-remarks" label="Remarks" error={show('remarks')} hint="Optional. Up to 500 characters.">
              <textarea
                className="inp"
                {...fieldAria('cl-remarks', show('remarks'))}
                rows={3}
                value={values.remarks}
                maxLength={500}
                onChange={(e) => set('remarks', e.target.value)}
                onBlur={touch('remarks')}
              />
            </MasterField>
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

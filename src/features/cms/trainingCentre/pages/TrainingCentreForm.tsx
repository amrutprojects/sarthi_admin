import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import DependentSelect, { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError, useApiData } from '../../shared';
import type { GeoOption } from '../../types';
import { codeKeystroke, digitsKeystroke, isValid, normalizeCode, serverFieldErrors, type FieldErrors } from '../../validation';
import { trainingCentreService } from '../services/trainingCentreService';
import { TRAINING_CENTRE_FIELDS, type CentreCodeSuggestion, type TrainingCentreField } from '../types/trainingCentre.types';
import {
  emptyTrainingCentreForm, normalizeTrainingCentreForm, validateTrainingCentreForm, type TrainingCentreFormValues, type TrainingCentrePayload,
} from '../validation/trainingCentre.validation';

interface TrainingCentreFormProps {
  initial?: TrainingCentreFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: TrainingCentrePayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Saved parents of a record being edited, kept selectable even if they were since deactivated. */
  currentCentreType?: GeoOption | null;
  currentState?: GeoOption | null;
  currentDistrict?: GeoOption | null;
  currentTaluka?: GeoOption | null;
  /* Edit: the code exists and cannot be blanked. */
  codeRequired?: boolean;
  /* Edit: why the code cannot change (batches use the centre). The input is disabled when set. */
  codeLockedReason?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-training-centre-form';
const CODE_LIST_ID = 'tc-code-suggestions';

/*
 * Why the code matters beyond being unique: Assign Batch compares it with the students' preferred centre.
 * "Pick from the list" only while the suggestions are actually offered on the input.
 */
const courseCentreHint = (listed: boolean) =>
  `Should equal the student course-centre code this centre serves (e.g. NAS for Nashik${listed ? '; pick from the list' : ''}), ` +
  'so Assign Batch matches the students who chose it as their preferred centre.';

/*
 * The Training Centre create / edit form (Training Centre Profile sections A and B), on its own page.
 *
 * Section A carries the State -> District -> Taluka cascade: each dropdown is disabled until its parent
 * is chosen, loads only that parent's active children, and clears itself when the parent changes
 * (DependentSelect owns that behaviour). The state is submitted with the district so the server can
 * reject a mismatched pair; the browser filtering is convenience, the server check is the guarantee.
 */
export default function TrainingCentreForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentCentreType, currentState, currentDistrict, currentTaluka,
  codeRequired, codeLockedReason, statusSlot,
}: TrainingCentreFormProps) {
  const [values, setValues] = useState<TrainingCentreFormValues>(initial ?? emptyTrainingCentreForm());
  const [touched, setTouched] = useState<Partial<Record<TrainingCentreField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<TrainingCentreField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateTrainingCentreForm(values, { codeRequired });
  const show = (f: TrainingCentreField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: TrainingCentreField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof TrainingCentreFormValues>(key: K, value: TrainingCentreFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => ({ ...e, [key as TrainingCentreField]: undefined }));
  };

  /* Dropdowns have no blur worth waiting for: a choice counts as touched straight away. */
  const pick = (f: 'centreTypeId' | 'stateId' | 'districtId' | 'talukaId') => (v: string) => {
    set(f, v);
    setTouched((t) => ({ ...t, [f]: true }));
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
      await onSave(normalizeTrainingCentreForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 / 400 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, TRAINING_CENTRE_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  /*
   * Code suggestions: the student-import course centres (NAS / Nashik…). A student's preferred centre is
   * always one of these codes, and Assign Batch asks for a reason whenever it differs from the batch's
   * centre code. Not loaded while the code is locked; a failed load only loses the suggestions.
   */
  const suggestions = useApiData(
    () => (codeLockedReason ? Promise.resolve([] as CentreCodeSuggestion[]) : trainingCentreService.codeSuggestions()),
    [codeLockedReason],
  );
  const courseCentres = suggestions.data ?? [];
  const typedCode = normalizeCode(values.code);
  const courseCentre = typedCode ? courseCentres.find((c) => c.code === typedCode) : undefined;
  /* Says whether the typed code is one of them, once the list is known. */
  const courseCentreNote = !typedCode || !courseCentres.length
    ? ''
    : courseCentre
      ? ` Matches the course centre ${courseCentre.name}.`
      : ' Not a course-centre code: placing a student who has a preferred centre here will need a reason.';

  const courseHint = courseCentreHint(courseCentres.length > 0);
  const codeHint = codeLockedReason
    ?? (codeRequired
      ? `${courseHint} A–Z and 0–9, starting with a letter, 2 to 10 characters. It locks once a batch uses this centre.${courseCentreNote}`
      : `${courseHint} Leave blank to generate one such as TC0001. A–Z and 0–9, starting with a letter, 2 to 10 characters.${courseCentreNote}`);

  /* A free-text field of section B. */
  const textField = (f: 'pocName' | 'centreHead' | 'alternativeContact' | 'coordinator1' | 'coordinator2', id: string, label: string, max: number, hint: string) => (
    <MasterField id={id} label={label} error={show(f)} hint={hint}>
      <input
        className="inp"
        {...fieldAria(id, show(f))}
        value={values[f]}
        maxLength={max}
        autoComplete="off"
        onChange={(e) => set(f, e.target.value)}
        onBlur={touch(f)}
      />
    </MasterField>
  );

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>A · Basic information</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="tc-name" label="Centre Name" required error={show('name')} hint="3 to 150 characters. Must be unique within the district.">
                <input
                  className="inp"
                  {...fieldAria('tc-name', show('name'))}
                  value={values.name}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={touch('name')}
                />
              </MasterField>

              <MasterField id="tc-code" label="Centre Code" required={codeRequired} error={show('code')} hint={codeHint}>
                <input
                  className="inp mono"
                  {...fieldAria('tc-code', show('code'))}
                  value={values.code}
                  maxLength={10}
                  autoComplete="off"
                  disabled={!!codeLockedReason}
                  list={courseCentres.length ? CODE_LIST_ID : undefined}
                  placeholder={codeRequired ? undefined : 'e.g. NAS, or blank for auto'}
                  onChange={(e) => set('code', codeKeystroke(e.target.value))}
                  onBlur={touch('code')}
                />
                {courseCentres.length ? (
                  <datalist id={CODE_LIST_ID}>
                    {courseCentres.map((c) => <option key={c.code} value={c.code} label={c.name} />)}
                  </datalist>
                ) : null}
              </MasterField>

              <RootSelect
                id="tc-centre-type"
                label="Centre Type"
                load={masterOptions.centreTypes}
                value={values.centreTypeId}
                onChange={pick('centreTypeId')}
                placeholder="No centre type"
                emptyHint="No active centre types. Add one in the Training Centre Type Master. The type is optional."
                hint="Optional. The ownership relationship of the centre (Owned, Partner…)."
                extraOption={currentCentreType ?? undefined}
                error={show('centreTypeId')}
              />

              <RootSelect
                id="tc-state"
                label="State"
                required
                load={masterOptions.states}
                value={values.stateId}
                onChange={pick('stateId')}
                placeholder="Select state"
                emptyHint="No active states yet. Add a state in the State Master first."
                hint="Choosing a state loads its districts."
                extraOption={currentState ?? undefined}
                error={show('stateId')}
              />

              <DependentSelect
                id="tc-district"
                label="District"
                required
                parentValue={values.stateId}
                load={masterOptions.districtsOfState}
                value={values.districtId}
                onChange={pick('districtId')}
                placeholder="Select district"
                disabledHint="Select a state first."
                emptyHint="This state has no active districts yet. Add one in the District Master."
                /* The saved district belongs to the saved state; offering it under another state would let a mismatched pair be picked. */
                extraOption={currentDistrict && values.stateId === currentState?.id ? currentDistrict : undefined}
                error={show('districtId')}
              />

              <DependentSelect
                id="tc-taluka"
                label="Taluka"
                parentValue={values.districtId}
                load={masterOptions.talukasOfDistrict}
                value={values.talukaId}
                onChange={pick('talukaId')}
                placeholder="No taluka"
                disabledHint="Optional. Select a district first."
                emptyHint="This district has no active talukas. The taluka is optional."
                extraOption={currentTaluka && values.districtId === currentDistrict?.id ? currentTaluka : undefined}
                error={show('talukaId')}
              />

              <MasterField
                id="tc-contact"
                label="Contact Number"
                error={show('contactNumber')}
                hint="Optional. A 10-digit mobile number, or a landline with its STD code such as 020-25507000."
              >
                <input
                  className="inp mono"
                  {...fieldAria('tc-contact', show('contactNumber'))}
                  value={values.contactNumber}
                  inputMode="tel"
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => set('contactNumber', e.target.value.replace(/[^\d\s-]/g, ''))}
                  onBlur={touch('contactNumber')}
                />
              </MasterField>

              <MasterField id="tc-email" label="Email" error={show('email')} hint="Optional. For example centre@example.org.">
                <input
                  className="inp"
                  type="email"
                  {...fieldAria('tc-email', show('email'))}
                  value={values.email}
                  maxLength={254}
                  autoComplete="off"
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={touch('email')}
                />
              </MasterField>

              {statusSlot ?? (
                <MasterField id="tc-status" label="Status" hint="A new centre is active and immediately available in dropdowns.">
                  <select
                    className="inp"
                    id="tc-status"
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

        <div className="card">
          <div className="card-h"><h3>B · Centre management</h3></div>
          <div className="card-b">
            <div className="grid g2">
              {textField('pocName', 'tc-poc-name', 'POC Name', 120, 'Optional. Point of contact for the centre. Up to 120 characters.')}

              <MasterField id="tc-poc-mobile" label="POC Mobile" error={show('pocMobile')} hint="Optional. 10-digit mobile number starting 6–9.">
                <input
                  className="inp mono"
                  {...fieldAria('tc-poc-mobile', show('pocMobile'))}
                  value={values.pocMobile}
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="off"
                  onChange={(e) => set('pocMobile', digitsKeystroke(e.target.value, 10))}
                  onBlur={touch('pocMobile')}
                />
              </MasterField>

              {textField('centreHead', 'tc-centre-head', 'Centre Head', 120, 'Optional. Up to 120 characters.')}
              {textField('alternativeContact', 'tc-alt-contact', 'Alternative Contact', 160, 'Optional. Name and number of a second contact. Up to 160 characters.')}
              {textField('coordinator1', 'tc-coordinator-1', 'Coordinator 1', 160, 'Optional. Up to 160 characters.')}
              {textField('coordinator2', 'tc-coordinator-2', 'Coordinator 2', 160, 'Optional. Up to 160 characters.')}
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

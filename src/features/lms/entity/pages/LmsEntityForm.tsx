import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, useApiData } from '../../../cms/shared';
import { codeKeystroke, isValid, serverFieldErrors, type FieldErrors } from '../../../cms/validation';
import MultiSelectList, { type MultiSelectOption } from '../../components/MultiSelectList';
import { lmsOptions } from '../../options';
import { LMS_ENTITY_FIELDS, type EnabledCentre, type EnabledTrack, type LmsEntityField, type LmsEntityFormOptions } from '../types/entity.types';
import {
  normalizeLmsEntityForm, validateLmsEntityForm, type LmsEntityFormValues, type LmsEntityPayload,
} from '../validation/entity.validation';

interface LmsEntityFormProps {
  initial: LmsEntityFormValues;
  /* Languages (To Be Confirmed, OQ-023) and time zones, from GET /lms/entities/form-options. */
  formOptions: LmsEntityFormOptions;
  /* Edit: the saved selections, so a centre / track deactivated in the Admin Panel since stays visible. */
  savedCentres?: EnabledCentre[];
  savedTracks?: EnabledTrack[];
  /* Edit: true once a course uses the entity — the code is frozen (F-LMS-03-02). */
  codeLocked?: boolean;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: LmsEntityPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-entity-form';

const centreOption = (c: { id: string; name: string; code: string | null; districtName: string | null }): MultiSelectOption => ({
  id: c.id, label: c.name, sub: c.code, group: c.districtName,
});
const trackOption = (t: { id: string; name: string; code: string | null }): MultiSelectOption => ({ id: t.id, label: t.name, sub: t.code });

/* Server details name array items "body.centreIds.2"; the form shows them on the list itself. */
const fieldOf = (details: { field?: string; message: string }[]) => details.map((d) => ({ ...d, field: d.field?.replace(/\.\d+$/, '') }));

/*
 * The Entity create / edit form (F-LMS-03 Table 28), on its own page. Same behaviour as the CMS forms:
 * validates on submit and once a field is touched, blocks double submits, keeps entered values after a
 * failed save, and shows the server's field messages (422 / 400 / 409) against the matching control.
 */
export default function LmsEntityForm({
  initial, formOptions, savedCentres = [], savedTracks = [], codeLocked = false, submitLabel, onSave, backTo, confirmMessage, statusSlot,
}: LmsEntityFormProps) {
  const [values, setValues] = useState<LmsEntityFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<LmsEntityField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<LmsEntityField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* Admin Panel reference data, active rows only (contract R1). */
  const centres = useApiData(() => lmsOptions.centres(), []);
  const tracks = useApiData(() => lmsOptions.tracks(), []);

  const local = validateLmsEntityForm(values);
  const show = (f: LmsEntityField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: LmsEntityField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof LmsEntityFormValues>(key: K, value: LmsEntityFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as LmsEntityField]: undefined }));
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
      await onSave(normalizeLmsEntityForm(values));
      setDirty(false);
    } catch (err) {
      /* Field-level answers (422 validation, 400 bad reference, 409 duplicate / locked code) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = serverFieldErrors(fieldOf(err.details), LMS_ENTITY_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  /* A saved value missing from the offered list (the list changed since) stays selectable as itself. */
  const languages = formOptions.languages.some((l) => l.code === values.defaultLanguage) || !values.defaultLanguage
    ? formOptions.languages
    : [...formOptions.languages, { code: values.defaultLanguage, label: `${values.defaultLanguage} (not in the platform list)` }];
  const timeZones = !values.timeZone || formOptions.timeZones.includes(values.timeZone) ? formOptions.timeZones : [values.timeZone, ...formOptions.timeZones];

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          <h3 className="fs13" style={{ margin: '0 0 10px' }}>Identity</h3>
          <div className="grid g2">
            <MasterField id="le-name" label="Entity Name" required error={show('name')} hint="Display name of the learning environment, for example AMRUT KALASH. 3 to 120 characters.">
              <input
                className="inp"
                {...fieldAria('le-name', show('name'))}
                value={values.name}
                maxLength={120}
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={touch('name')}
              />
            </MasterField>

            <MasterField
              id="le-code"
              label="Entity Code"
              required
              error={show('code')}
              hint={
                codeLocked
                  ? 'The code cannot be changed: courses already use this entity.'
                  : 'Stable identifier, 2 to 20 characters: capital letters, digits and hyphens. It is frozen once a course uses the entity.'
              }
            >
              <input
                className="inp mono"
                {...fieldAria('le-code', show('code'))}
                value={values.code}
                maxLength={20}
                autoComplete="off"
                disabled={codeLocked}
                onChange={(e) => set('code', codeKeystroke(e.target.value, true))}
                onBlur={touch('code')}
              />
            </MasterField>

            <MasterField id="le-description" label="Description" error={show('description')} hint="Optional. Operational purpose of the entity, up to 500 characters.">
              <textarea
                className="inp"
                {...fieldAria('le-description', show('description'))}
                rows={3}
                value={values.description}
                maxLength={500}
                onChange={(e) => set('description', e.target.value)}
                onBlur={touch('description')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="le-status" label="Status" hint="A new entity is active and is offered to the other LMS masters at once.">
                <select className="inp" id="le-status" value={values.isActive ? 'true' : 'false'} onChange={(e) => set('isActive', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </MasterField>
            )}
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 10px' }}>Defaults</h3>
          <div className="grid g2">
            <MasterField
              id="le-language"
              label="Default Language"
              required
              error={show('defaultLanguage')}
              hint={
                formOptions.languagesConfirmed
                  ? 'Fallback language for content and messages.'
                  : 'Fallback language for content and messages. The platform language list is To Be Confirmed (OQ-023); English and Marathi are the recommended values.'
              }
            >
              <select
                className="inp"
                {...fieldAria('le-language', show('defaultLanguage'))}
                value={values.defaultLanguage}
                onChange={(e) => set('defaultLanguage', e.target.value)}
                onBlur={touch('defaultLanguage')}
              >
                <option value="">Select a language</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                ))}
              </select>
            </MasterField>

            <MasterField id="le-timezone" label="Time Zone" required error={show('timeZone')} hint={`Display zone for schedules (IANA). Times are always stored in UTC. Default ${formOptions.defaultTimeZone}.`}>
              <select
                className="inp"
                {...fieldAria('le-timezone', show('timeZone'))}
                value={values.timeZone}
                onChange={(e) => set('timeZone', e.target.value)}
                onBlur={touch('timeZone')}
              >
                <option value="">Select a time zone</option>
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </MasterField>
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 4px' }}>Enabled centres and tracks</h3>
          <p className="muted fs12" style={{ margin: '0 0 10px' }}>
            Chosen from the Admin Panel's reference data (read-only here); nothing can be typed by hand. At least one centre and one track are
            required before a batch is created; they can be left empty for now.
          </p>
          <div className="grid g2">
            <MultiSelectList
              id="le-centres"
              label="Enabled Centres"
              noun="centres"
              options={(centres.data ?? []).map(centreOption)}
              saved={savedCentres.map(centreOption)}
              value={values.centreIds}
              onChange={(ids) => set('centreIds', ids)}
              loading={centres.loading}
              error={centres.error ? centres.error.fullMessage : null}
              onRetry={() => void centres.reload()}
              emptyMsg="No active training centre is available from the Admin Panel yet."
              fieldError={show('centreIds')}
              hint="Centres at which this entity delivers, grouped by district."
            />
            <MultiSelectList
              id="le-tracks"
              label="Enabled Tracks"
              noun="tracks"
              options={(tracks.data ?? []).map(trackOption)}
              saved={savedTracks.map(trackOption)}
              value={values.trackIds}
              onChange={(ids) => set('trackIds', ids)}
              loading={tracks.loading}
              error={tracks.error ? tracks.error.fullMessage : null}
              onRetry={() => void tracks.reload()}
              emptyMsg="No active technology track is available from the Admin Panel yet."
              fieldError={show('trackIds')}
              hint="Technology tracks (T01–T12) offered by this entity."
            />
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

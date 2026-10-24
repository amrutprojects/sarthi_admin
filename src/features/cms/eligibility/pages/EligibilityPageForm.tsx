import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterFormActions from '../../components/MasterFormActions';
import { ConfirmModal, toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import {
  ELIGIBILITY_SETTINGS_FIELDS,
  SETTINGS_LABEL,
  type Bilingual,
  type EligibilitySettingsField,
  type SettingsKey,
} from '../types/eligibility.types';
import {
  SETTINGS_MAX,
  normalizeEligibilitySettingsForm,
  validateEligibilitySettingsForm,
  type EligibilitySettingsFormValues,
} from '../validation/eligibility.validation';

interface EligibilityPageFormProps {
  initial: EligibilitySettingsFormValues;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeEligibilitySettingsForm>) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-eligibility-page-form';

/* The backend reports "body.pageTitle.mr"; the form keys its messages "pageTitle.mr". */
function mapServerErrors(err: ApiError): FieldErrors<EligibilitySettingsField> {
  const mapped: FieldErrors<EligibilitySettingsField> = {};
  for (const detail of err.details) {
    const key = (detail.field ?? '').replace(/^body\./, '') as EligibilitySettingsField;
    if ((ELIGIBILITY_SETTINGS_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
  }
  return mapped;
}

/* Where each pair appears on the public Eligibility page. */
const HINTS: Record<SettingsKey, string> = {
  pageTitle: 'The banner heading at the top of the page.',
  pageSubtitle: 'The line under the heading.',
  criteriaHeading: 'The title of the eligibility criteria card.',
  documentsHeading: 'The title of the required documents card.',
  noteTitle: 'The title of the note under the two cards, if it is shown.',
  noteBody: 'The text of the note under the two cards, if it is shown.',
};

/*
 * The Eligibility page-text editor, on its own page (no modal): the heading, the two card titles and the
 * note around the criteria and documents lists.
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, ask before saving, keep what was typed when a
 * save fails, and put the server's own field messages on the matching inputs.
 */
export default function EligibilityPageForm({ initial, onSave, backTo }: EligibilityPageFormProps) {
  const [values, setValues] = useState<EligibilitySettingsFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<EligibilitySettingsField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<EligibilitySettingsField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateEligibilitySettingsForm(values);
  const show = (f: EligibilitySettingsField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: EligibilitySettingsField) => setTouched((t) => ({ ...t, [f]: true }));

  /* Any edit clears the server's complaint about that pair — it was about the previous value. */
  const set = (key: SettingsKey, value: Bilingual) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => {
      const next = { ...e };
      delete next[`${key}.mr`];
      delete next[`${key}.en`];
      return next;
    });
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (!isValid(local)) return;
    setConfirming(true);
  }

  async function save() {
    setConfirming(false);
    setBusy(true);
    setServerErrors({});
    try {
      await onSave(normalizeEligibilitySettingsForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = mapServerErrors(err);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const field = (key: SettingsKey, multiline = false) => (
    <BilingualField
      id={`elig-page-${key}`}
      label={SETTINGS_LABEL[key]}
      multiline={multiline}
      value={values[key]}
      maxLength={SETTINGS_MAX[key]}
      onChange={(next) => set(key, next)}
      onBlur={(half) => touch(`${key}.${half}`)}
      errorMr={show(`${key}.mr`)}
      errorEn={show(`${key}.en`)}
      hint={`${HINTS[key]} Up to ${SETTINGS_MAX[key]} characters in each language.`}
    />
  );

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {field('pageTitle')}
          {field('pageSubtitle')}
          {field('criteriaHeading')}
          {field('documentsHeading')}
          <label className="f ac gp8 fs13 mb10">
            <input
              type="checkbox"
              checked={values.showNote}
              onChange={(e) => {
                setValues((v) => ({ ...v, showNote: e.target.checked }));
                setDirty(true);
              }}
            />
            Show the note on the website
          </label>
          {field('noteTitle')}
          {field('noteBody', true)}
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel="Save page text" busy={busy} dirty={dirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message="Are you sure you want to save the changes to the Eligibility page text? They appear on the public website straight away."
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}

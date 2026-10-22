import { Fragment, useState, type FormEvent } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { ConfirmModal, toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import {
  APPLY_SETTINGS_FIELDS,
  CTA_URL_LABEL,
  SETTINGS_GROUPS,
  SETTINGS_LABEL,
  type ApplySettingsField,
  type Bilingual,
  type SettingsKey,
} from '../types/apply.types';
import {
  CTA_URL_MAX,
  SETTINGS_MAX,
  normalizeApplySettingsForm,
  validateApplySettingsForm,
  type ApplySettingsFormValues,
} from '../validation/apply.validation';

interface ApplyPageFormProps {
  initial: ApplySettingsFormValues;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeApplySettingsForm>) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-apply-page-form';

/* The backend reports "body.pageTitle.mr" / "body.ctaUrl"; the form keys its messages "pageTitle.mr" / "ctaUrl". */
function mapServerErrors(err: ApiError): FieldErrors<ApplySettingsField> {
  const mapped: FieldErrors<ApplySettingsField> = {};
  for (const detail of err.details) {
    const key = (detail.field ?? '').replace(/^body\./, '') as ApplySettingsField;
    if ((APPLY_SETTINGS_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
  }
  return mapped;
}

/* The two pairs long enough to need a text area; line breaks typed there are kept on the website. */
const MULTILINE: ReadonlySet<SettingsKey> = new Set(['noteBody', 'ctaText']);

/* Where each pair appears on the public Apply page. */
const HINTS: Record<SettingsKey, string> = {
  pageTitle: 'The banner heading at the top of the page.',
  pageSubtitle: 'The line under the heading.',
  noteTitle: 'The title of the note under the application steps.',
  noteBody: 'The text of the note under the application steps. Line breaks are kept.',
  glanceHeading: 'The title of the "At a glance" card.',
  documentsHeading: "The title of the documents card. Its list is the Eligibility page's required documents.",
  ctaText: 'The text of the Apply box, above the Apply button. Line breaks are kept.',
  ctaLabel: 'The text on the Apply button.',
  ctaHint: 'The small line under the Apply button.',
};

/*
 * The Apply page-text editor, on its own page (no modal): the heading, the note under the steps, the
 * two card titles and the Apply box (its text, button label, portal link and hint).
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, ask before saving, keep what was typed when a
 * save fails, and put the server's own field messages on the matching inputs.
 */
export default function ApplyPageForm({ initial, onSave, backTo }: ApplyPageFormProps) {
  const [values, setValues] = useState<ApplySettingsFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<ApplySettingsField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ApplySettingsField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateApplySettingsForm(values);
  const show = (f: ApplySettingsField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: ApplySettingsField) => setTouched((t) => ({ ...t, [f]: true }));

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

  const setCtaUrl = (ctaUrl: string) => {
    setValues((v) => ({ ...v, ctaUrl }));
    setDirty(true);
    setServerErrors((e) => {
      const next = { ...e };
      delete next.ctaUrl;
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
      await onSave(normalizeApplySettingsForm(values));
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
      id={`apply-page-${key}`}
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

  const ctaUrlField = (
    <div className="grid g2" key="ctaUrl">
      <MasterField
        id="apply-page-ctaUrl"
        label={CTA_URL_LABEL}
        required
        error={show('ctaUrl')}
        hint={`The official portal page the Apply button opens in a new tab, the same for both languages. An https link, up to ${CTA_URL_MAX} characters.`}
      >
        <input
          className="inp"
          {...fieldAria('apply-page-ctaUrl', show('ctaUrl'))}
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={values.ctaUrl}
          maxLength={CTA_URL_MAX}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setCtaUrl(e.target.value)}
          onBlur={() => touch('ctaUrl')}
        />
      </MasterField>
    </div>
  );

  return (
    <div className="card">
      <div className="card-b">
        {/* Grouped as on the Page Text tab: by where each piece appears on the public Apply page. */}
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {SETTINGS_GROUPS.map((group, index) => (
            <section key={group.title} aria-label={group.title}>
              <h4 className={index === 0 ? 'fs14 mb10' : 'fs14 mt14 mb10'}>
                {group.title} <span className="muted fs12">— {group.sub}</span>
              </h4>
              {group.keys.map((key) => (key === 'ctaUrl' ? ctaUrlField : <Fragment key={key}>{field(key, MULTILINE.has(key))}</Fragment>))}
            </section>
          ))}
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
          message="Are you sure you want to save the changes to the Apply page text? They appear on the public website straight away."
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}

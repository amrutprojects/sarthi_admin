import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import { ConfirmModal, toastError, toastOk } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { aboutService } from '../services/aboutService';
import type { AboutField, ApiAboutSection, Bilingual } from '../types/about.types';
import { normPair, optionalPair, requiredPair, samePair, serverErrors } from '../validation/about.validation';

/*
 * The two singleton editors on the dashboard. Each keeps its own draft and saves only its own fields
 * (the API's update is partial), with the version the section was last loaded at, so saving the
 * heading never overwrites an unsaved description and a stale screen is refused, not merged.
 */

function useSectionForm<V>({
  section,
  toValues,
  validate,
  toPayload,
  onSaved,
  successMessage,
}: {
  section: ApiAboutSection;
  toValues: (s: ApiAboutSection) => V;
  validate: (v: V) => FieldErrors<AboutField>;
  toPayload: (v: V) => Parameters<typeof aboutService.updateSection>[0];
  onSaved: (s: ApiAboutSection) => void;
  successMessage: string;
}) {
  const [values, setValues] = useState<V>(() => toValues(section));
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<FieldErrors<AboutField>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const local = validate(values);
  const show = (f: string) => (submitted ? local[f] : undefined) ?? server[f];

  const change = (next: V) => {
    setValues(next);
    setDirty(true);
  };
  const reset = () => {
    setValues(toValues(section));
    setDirty(false);
    setSubmitted(false);
    setServer({});
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (!isValid(local)) return;
    setBusy(true);
    setServer({});
    try {
      const saved = await aboutService.updateSection(toPayload(values));
      setValues(toValues(saved));
      setDirty(false);
      setSubmitted(false);
      onSaved(saved);
      toastOk(successMessage);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(null, err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }
  return { values, change, reset, submit, show, busy, dirty };
}

/* Save / Cancel under an inline editor. Cancel asks before discarding unsaved changes. */
function Actions({
  formId,
  busy,
  dirty,
  onCancel,
  saveLabel,
}: {
  formId: string;
  busy: boolean;
  dirty: boolean;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="f ac gp8 wrap mt10">
        <button type="submit" form={formId} className="btn primary" disabled={busy || !dirty}>
          {busy ? 'Saving…' : saveLabel}
        </button>
        <button type="button" className="btn" disabled={busy || !dirty} onClick={() => setConfirming(true)}>
          Cancel
        </button>
        {dirty ? <span className="muted fs12">Unsaved changes</span> : null}
      </div>
      {confirming ? (
        <ConfirmModal
          title="Discard changes?"
          message="This form has unsaved changes. Cancelling puts back the saved values."
          confirmLabel="Discard changes"
          danger
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onCancel();
          }}
        />
      ) : null}
    </>
  );
}

/*
 * The heading and subtitle. Whether the website shows the section is not here: it is the tab's one "Show on
 * website" switch above (HomePageView), so the PATCH leaves showSection alone.
 */
interface SettingsValues {
  heading: Bilingual;
  subtitle: Bilingual;
}

export function SectionSettingsForm({
  section,
  onSaved,
  readOnly,
}: {
  section: ApiAboutSection;
  onSaved: (s: ApiAboutSection) => void;
  readOnly: boolean;
}) {
  const f = useSectionForm<SettingsValues>({
    section,
    toValues: (s) => ({ heading: { ...s.heading }, subtitle: { ...s.subtitle } }),
    validate: (v) => {
      const e: FieldErrors<AboutField> = {};
      requiredPair(e, 'heading', v.heading, 'Section heading', 120);
      optionalPair(e, 'subtitle', v.subtitle, 'Subtitle', 300);
      return e;
    },
    toPayload: (v) => ({
      heading: normPair(v.heading),
      subtitle: normPair(v.subtitle),
      expectedUpdatedAt: section.updatedAt,
    }),
    onSaved,
    successMessage: 'Section settings saved',
  });
  return (
    <form id="about-settings-form" onSubmit={f.submit} noValidate>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
        <BilingualField
          id="about-heading"
          label="Section heading"
          maxLength={120}
          value={f.values.heading}
          onChange={(heading) => f.change({ ...f.values, heading })}
          errorMr={f.show('heading.mr')}
          errorEn={f.show('heading.en')}
          hint="Shown above the section on the home page. Renaming this admin module does not change it."
        />
        <div className="mt10">
          <BilingualField
            id="about-subtitle"
            label="Subtitle"
            maxLength={300}
            required={false}
            value={f.values.subtitle}
            onChange={(subtitle) => f.change({ ...f.values, subtitle })}
            errorMr={f.show('subtitle.mr')}
            errorEn={f.show('subtitle.en')}
            hint="Optional — a line under the heading. Leave both languages blank for none, as today."
          />
        </div>
      </fieldset>
      {!readOnly ? (
        <Actions formId="about-settings-form" busy={f.busy} dirty={f.dirty} onCancel={f.reset} saveLabel="Save settings" />
      ) : null}
    </form>
  );
}

export function DescriptionForm({
  section,
  onSaved,
  readOnly,
}: {
  section: ApiAboutSection;
  onSaved: (s: ApiAboutSection) => void;
  readOnly: boolean;
}) {
  const f = useSectionForm<{ description: Bilingual }>({
    section,
    toValues: (s) => ({ description: { ...s.description } }),
    validate: (v) => {
      const e: FieldErrors<AboutField> = {};
      requiredPair(e, 'description', v.description, 'Description', 4000, true);
      return e;
    },
    toPayload: (v) => ({ description: normPair(v.description, true), expectedUpdatedAt: section.updatedAt }),
    onSaved,
    successMessage: 'Description saved',
  });
  const area = (half: 'mr' | 'en', label: string): ReactNode => {
    const id = `about-description-${half}`;
    const error = f.show(`description.${half}`);
    return (
      <MasterField id={id} label={label} required error={error} hint={`${f.values.description[half].length} / 4000 characters`}>
        <textarea
          className="inp"
          rows={8}
          maxLength={4000}
          lang={half}
          spellCheck={half === 'en'}
          {...fieldAria(id, error)}
          value={f.values.description[half]}
          onChange={(e) => f.change({ description: { ...f.values.description, [half]: e.target.value } })}
        />
      </MasterField>
    );
  };
  const saved = samePair(normPair(f.values.description, true), section.description);
  return (
    <form id="about-description-form" onSubmit={f.submit} noValidate>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="grid g2">
          {area('mr', 'Description (Marathi)')}
          {area('en', 'Description (English)')}
        </div>
      </fieldset>
      <p className="muted fs12 mt10">Plain text. A blank line starts a new paragraph on the website.</p>
      <div className="mt10" aria-label="Description preview" role="region">
        <b className="fs12">{saved ? 'Preview' : 'Preview (unsaved)'}</b>
        <div className="grid g2 mt10">
          {(['mr', 'en'] as const).map((half) => (
            <div key={half} lang={half} className="card pad">
              <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text-2)', margin: 0, whiteSpace: 'pre-line' }}>
                {f.values.description[half]}
              </p>
            </div>
          ))}
        </div>
      </div>
      {!readOnly ? (
        <Actions formId="about-description-form" busy={f.busy} dirty={f.dirty} onCancel={f.reset} saveLabel="Save description" />
      ) : null}
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { SITE_PAGES } from '../../destination';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { FALLBACK_BUTTON_LABEL, isExpired } from '../constants';
import type { Bilingual, SchemesField } from '../types/schemes.types';
import { serverErrors, validateSchemeForm, type SchemeFormValues } from '../validation/schemes.validation';
import SchemeCardPreview from './SchemeCardPreview';

const FORM_ID = 'cms-schemes-form';

/*
 * The Add / Edit scheme form, on its own page like every other CMS form, with a live preview of the
 * card as the website will draw it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function SchemeForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  defaultLabel,
  onSave,
}: {
  initial: SchemeFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  /* The section's default button label, printed on schemes without their own; null until it has loaded. */
  defaultLabel: Bilingual | null;
  onSave: (values: SchemeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SchemeFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<SchemesField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateSchemeForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof SchemeFormValues>(key: K, value: SchemeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const fallback = defaultLabel ?? FALLBACK_BUTTON_LABEL;
  const ownLabel = values.buttonLabel.mr.trim() || values.buttonLabel.en.trim();
  const shownLabel = ownLabel ? values.buttonLabel : fallback;

  const revealFirstError = () =>
    document
      .getElementById(FORM_ID)
      ?.querySelector('[aria-invalid="true"], [role="alert"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local)) {
      revealFirstError();
      return;
    }
    setBusy(true);
    setServer({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        flushSync(() => setServer(mapped));
        if (!isValid(mapped)) {
          revealFirstError();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const linkError = show('link');
  const deadlineError = show('deadline');

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Card preview</h3>
            <span className="muted fs12">As it will appear in the SARTHI Schemes section</span>
          </div>
          <div className="card-b">
            <SchemeCardPreview
              title={values.title}
              description={values.description}
              badge={values.badge}
              deadline={deadlineError ? '' : values.deadline}
              buttonLabel={shownLabel}
              featured={values.featured}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Scheme details</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="scheme-title"
              label="Scheme title"
              maxLength={150}
              value={values.title}
              onChange={(v) => set('title', v)}
              onBlur={(half) => touch(`title.${half}`)}
              errorMr={show('title.mr')}
              errorEn={show('title.en')}
              hint="e.g. लघुलेखन प्रशिक्षण योजना / Shorthand Training Scheme."
            />
            <div className="mt10">
              <BilingualField
                id="scheme-description"
                label="Description"
                maxLength={500}
                multiline
                value={values.description}
                onChange={(v) => set('description', v)}
                onBlur={(half) => touch(`description.${half}`)}
                errorMr={show('description.mr')}
                errorEn={show('description.en')}
                hint="The short paragraph under the title. Shown as plain text."
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="scheme-badge"
                label="Badge"
                maxLength={40}
                required={false}
                value={values.badge}
                onChange={(v) => set('badge', v)}
                onBlur={(half) => touch(`badge.${half}`)}
                errorMr={show('badge.mr')}
                errorEn={show('badge.en')}
                hint="Optional tag above the title, e.g. हा कार्यक्रम / This programme. Leave both blank for none."
              />
            </div>
            <label className="f ac gp8 fs13 mt10">
              <input type="checkbox" checked={values.featured} onChange={(e) => set('featured', e.target.checked)} />
              Highlight this card (saffron border, as for Sarthi)
            </label>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Last date</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="scheme-deadline"
              label="Last date"
              error={deadlineError}
              hint={
                <>
                  Printed as &ldquo;31 Mar 2027&rdquo;. Leave blank if the scheme has no last date. A scheme whose date has passed stays on
                  the website until you hide or delete it.
                </>
              }
            >
              <div className="f ac gp8 wrap">
                <input
                  className="inp"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  {...fieldAria('scheme-deadline', deadlineError)}
                  value={values.deadline}
                  onChange={(e) => set('deadline', e.target.value)}
                  onBlur={() => touch('deadline')}
                  style={{ maxWidth: 220 }}
                />
                {values.deadline ? (
                  <button type="button" className="btn sm" onClick={() => set('deadline', '')}>
                    Clear date
                  </button>
                ) : null}
                {!deadlineError && isExpired(values.deadline) ? <span className="tag">Date has passed</span> : null}
              </div>
            </MasterField>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Button</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="scheme-link"
              label="Destination"
              error={linkError}
              hint={
                <>
                  A page of the website starting with / (for example /programme), or a full address starting with https:// — other sites
                  open in a new tab. Leave blank for no link: the button then says the page is not available yet, like the schemes without a
                  destination today.
                </>
              }
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                list="scheme-site-pages"
                maxLength={500}
                placeholder="No link"
                {...fieldAria('scheme-link', linkError)}
                value={values.link}
                onChange={(e) => set('link', e.target.value)}
                onBlur={() => touch('link')}
              />
              <datalist id="scheme-site-pages">
                {SITE_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.label}
                  </option>
                ))}
              </datalist>
            </MasterField>
            <div className="mt10">
              <BilingualField
                id="scheme-button"
                label="Button label"
                maxLength={60}
                required={false}
                value={values.buttonLabel}
                onChange={(v) => set('buttonLabel', v)}
                onBlur={(half) => touch(`buttonLabel.${half}`)}
                errorMr={show('buttonLabel.mr')}
                errorEn={show('buttonLabel.en')}
                hint={`Optional. Leave both blank to use the section's default: ${fallback.mr} / ${fallback.en}`}
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Order and visibility</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="scheme-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the scheme at the end of the grid.' : 'Lower numbers are shown first.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('scheme-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the grid' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField id="scheme-active" label="Status" hint="Inactive schemes stay here but are not shown on the website.">
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input id="scheme-active" type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  Active — show on the website
                </label>
              </MasterField>
            </div>
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}

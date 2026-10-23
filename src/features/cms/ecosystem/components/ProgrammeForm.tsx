import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { SITE_PAGES } from '../constants';
import type { Bilingual, EcosystemField } from '../types/ecosystem.types';
import { serverErrors, validateProgrammeForm, type ProgrammeFormValues } from '../validation/ecosystem.validation';
import CardPreview from './CardPreview';
import IconPicker from './IconPicker';

const FORM_ID = 'cms-ecosystem-form';
const FALLBACK_LABEL: Bilingual = { mr: 'अधिक जाणून घ्या →', en: 'Learn more →' };

/*
 * The Add / Edit programme form, on its own page like every other CMS form, with a live preview of
 * the card as the website will draw it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function ProgrammeForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  defaultLabel,
  onSave,
}: {
  initial: ProgrammeFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  /* The section's default link label, printed on cards without their own; null until it has loaded. */
  defaultLabel: Bilingual | null;
  onSave: (values: ProgrammeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProgrammeFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<EcosystemField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateProgrammeForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof ProgrammeFormValues>(key: K, value: ProgrammeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const fallback = defaultLabel ?? FALLBACK_LABEL;
  const ownLabel = values.linkLabel.mr.trim() || values.linkLabel.en.trim();
  const shownLabel = ownLabel ? values.linkLabel : fallback;

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

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Card preview</h3>
            <span className="muted fs12">As it will appear in the अमृत प्रणाली section</span>
          </div>
          <div className="card-b">
            <CardPreview
              name={values.name}
              description={values.description}
              icon={values.icon}
              linked={!!values.link.trim()}
              linkLabel={shownLabel}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Programme details</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="eco-name"
              label="Programme name"
              maxLength={80}
              value={values.name}
              onChange={(v) => set('name', v)}
              onBlur={(half) => touch(`name.${half}`)}
              errorMr={show('name.mr')}
              errorEn={show('name.en')}
              hint="e.g. अमृत कलश / AMRUT Kalash."
            />
            <div className="mt10">
              <BilingualField
                id="eco-description"
                label="Description"
                maxLength={200}
                value={values.description}
                onChange={(v) => set('description', v)}
                onBlur={(half) => touch(`description.${half}`)}
                errorMr={show('description.mr')}
                errorEn={show('description.en')}
                hint="The short line under the name."
              />
            </div>
            <div className="mt10">
              <IconPicker
                value={values.icon}
                onChange={(icon) => {
                  set('icon', icon);
                  touch('icon');
                }}
                error={show('icon')}
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Link</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="eco-link"
              label="Destination"
              error={linkError}
              hint={
                <>
                  A page of the website starting with / (for example /programme), or a full address starting with https:// — other sites
                  open in a new tab. Leave blank for no link: the card then says the page is not available yet, like the cards without a
                  destination today.
                </>
              }
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                list="eco-site-pages"
                maxLength={500}
                placeholder="No link"
                {...fieldAria('eco-link', linkError)}
                value={values.link}
                onChange={(e) => set('link', e.target.value)}
                onBlur={() => touch('link')}
              />
              <datalist id="eco-site-pages">
                {SITE_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.label}
                  </option>
                ))}
              </datalist>
            </MasterField>
            <div className="mt10">
              <BilingualField
                id="eco-label"
                label="Link label"
                maxLength={60}
                required={false}
                value={values.linkLabel}
                onChange={(v) => set('linkLabel', v)}
                onBlur={(half) => touch(`linkLabel.${half}`)}
                errorMr={show('linkLabel.mr')}
                errorEn={show('linkLabel.en')}
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
                id="eco-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the card at the end of the grid.' : 'Lower numbers are shown first.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('eco-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the grid' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField id="eco-active" label="Status" hint="Inactive cards stay here but are not shown on the website.">
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input id="eco-active" type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
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

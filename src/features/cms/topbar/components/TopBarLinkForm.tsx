import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { SITE_PAGES } from '../../destination';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { FALLBACK_GOVERNMENT_NAME } from '../constants';
import type { ApiTopBarSettings, TopBarField } from '../types/topbar.types';
import {
  LABEL_MAX,
  serverErrors,
  validateTopBarLinkForm,
  type TopBarLinkFormValues,
} from '../validation/topbar.validation';
import TopBarPreview from './TopBarPreview';

const FORM_ID = 'cms-top-bar-form';

/*
 * The Add / Edit link form, on its own page like every other CMS form, with a live preview of the button as the
 * website's top strip will draw it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function TopBarLinkForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  settings,
  onSave,
}: {
  initial: TopBarLinkFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  /* The strip's government name and language switch, drawn around the button; null until they have loaded. */
  settings: ApiTopBarSettings | null;
  onSave: (values: TopBarLinkFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<TopBarLinkFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<TopBarField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateTopBarLinkForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof TopBarLinkFormValues>(key: K, value: TopBarLinkFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

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
            <h3>Top bar preview</h3>
            <span className="muted fs12">As the button will read in the strip at the top of the website</span>
          </div>
          <div className="card-b">
            <TopBarPreview
              governmentName={settings ? settings.governmentName : FALLBACK_GOVERNMENT_NAME}
              showLanguageToggle={settings?.showLanguageToggle ?? true}
              buttons={[{ label: values.label, link: linkError ? '' : values.link }]}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Link button</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="top-bar-label"
              label="Label"
              maxLength={LABEL_MAX}
              value={values.label}
              onChange={(v) => set('label', v)}
              onBlur={(half) => touch(`label.${half}`)}
              errorMr={show('label.mr')}
              errorEn={show('label.en')}
              hint="The text on the button, e.g. प्रमाणपत्र पडताळणी / Verify Certificate. Both languages are required."
            />
            <div className="mt10">
              <MasterField
                id="top-bar-link"
                label="Link"
                required
                error={linkError}
                hint={
                  <>
                    A page of the website starting with / (for example /verify), or an address starting with https:// or www. A link is
                    required — the button has to lead somewhere.
                  </>
                }
              >
                <input
                  className="inp"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  list="top-bar-site-pages"
                  maxLength={500}
                  placeholder="/verify"
                  {...fieldAria('top-bar-link', linkError)}
                  value={values.link}
                  onChange={(e) => set('link', e.target.value)}
                  onBlur={() => touch('link')}
                />
                <datalist id="top-bar-site-pages">
                  {SITE_PAGES.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.label}
                    </option>
                  ))}
                </datalist>
              </MasterField>
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
                id="top-bar-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the button at the end of the strip.' : 'Lower numbers appear first, from the left.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('top-bar-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the strip' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField
                id="top-bar-active"
                label="Status"
                hint="Inactive links stay here but are not shown on the website."
              >
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input
                    id="top-bar-active"
                    type="checkbox"
                    checked={values.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
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

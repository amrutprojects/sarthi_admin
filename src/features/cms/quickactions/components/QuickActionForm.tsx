import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { SITE_PAGES } from '../../destination';
import IconPicker from '../../ecosystem/components/IconPicker';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { QUICK_ACTION_ICONS } from '../constants';
import type { QuickActionField } from '../types/quickactions.types';
import {
  SUBTITLE_MAX,
  TITLE_MAX,
  serverErrors,
  validateQuickActionForm,
  type QuickActionFormValues,
} from '../validation/quickactions.validation';
import QuickActionsPreview from './QuickActionsPreview';

const FORM_ID = 'cms-quick-action-form';

/*
 * The Add / Edit quick action form, on its own page like every other CMS form, with a live preview of the tile as
 * the website's strip under the banner will draw it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function QuickActionForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  onSave,
}: {
  initial: QuickActionFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  onSave: (values: QuickActionFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<QuickActionFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<QuickActionField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateQuickActionForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof QuickActionFormValues>(key: K, value: QuickActionFormValues[K]) => {
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
            <h3>Quick action preview</h3>
            <span className="muted fs12">As the tile will read in the strip under the banner of the home page</span>
          </div>
          <div className="card-b">
            <QuickActionsPreview tiles={[{ icon: values.icon, title: values.title, subtitle: values.subtitle }]} />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Tile</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="quick-action-title"
              label="Title"
              maxLength={TITLE_MAX}
              value={values.title}
              onChange={(v) => set('title', v)}
              onBlur={(half) => touch(`title.${half}`)}
              errorMr={show('title.mr')}
              errorEn={show('title.en')}
              hint="The bold line of the tile, e.g. अर्ज करा / Apply Now. Both languages are required."
            />
            <div className="mt10">
              <BilingualField
                id="quick-action-subtitle"
                label="Subtitle"
                required={false}
                maxLength={SUBTITLE_MAX}
                value={values.subtitle}
                onChange={(v) => set('subtitle', v)}
                onBlur={(half) => touch(`subtitle.${half}`)}
                errorMr={show('subtitle.mr')}
                errorEn={show('subtitle.en')}
                hint="The smaller line under the title, e.g. नवीन नोंदणी करा / Register as a new candidate. Optional — both languages or neither."
              />
            </div>
            <div className="mt10">
              <IconPicker
                id="quick-action-icon"
                icons={QUICK_ACTION_ICONS}
                hint="The glyph shown on the rounded square at the left of the tile."
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
              id="quick-action-link"
              label="Destination"
              required
              error={linkError}
              hint={
                <>
                  A page of the website starting with / (for example /apply), or an address starting with https:// or www. — other sites
                  open in a new tab. A destination is required — the tile has to lead somewhere.
                </>
              }
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                list="quick-action-site-pages"
                maxLength={500}
                placeholder="/apply"
                {...fieldAria('quick-action-link', linkError)}
                value={values.link}
                onChange={(e) => set('link', e.target.value)}
                onBlur={() => touch('link')}
              />
              <datalist id="quick-action-site-pages">
                {SITE_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.label}
                  </option>
                ))}
              </datalist>
            </MasterField>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Order and visibility</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="quick-action-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the tile at the end of the strip.' : 'Lower numbers appear first, from the left.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('quick-action-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the strip' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField
                id="quick-action-active"
                label="Show on website"
                hint="Inactive tiles stay here but are not shown on the website."
              >
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input
                    id="quick-action-active"
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

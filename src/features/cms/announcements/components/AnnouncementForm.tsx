import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { SITE_PAGES } from '../../destination';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { FALLBACK_TICKER_LABEL } from '../constants';
import type { AnnouncementsField, Bilingual } from '../types/announcements.types';
import { serverErrors, validateAnnouncementForm, type AnnouncementFormValues } from '../validation/announcements.validation';
import AnnouncementPreview from './AnnouncementPreview';

const FORM_ID = 'cms-announcements-form';

/*
 * The Add / Edit announcement form, on its own page like every other CMS form, with a live preview of the
 * item as the website's ticker will print it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function AnnouncementForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  tickerLabel,
  onSave,
}: {
  initial: AnnouncementFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  /* The ticker's label, printed in the pill before the items; null until it has loaded. */
  tickerLabel: Bilingual | null;
  onSave: (values: AnnouncementFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<AnnouncementFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AnnouncementsField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateAnnouncementForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]) => {
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
            <h3>Ticker preview</h3>
            <span className="muted fs12">As the item will read in the strip at the top of the website</span>
          </div>
          <div className="card-b">
            <AnnouncementPreview
              label={tickerLabel ?? FALLBACK_TICKER_LABEL}
              title={values.title}
              detail={values.detail}
              link={linkError ? '' : values.link}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Announcement</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="announcement-title"
              label="Title"
              maxLength={200}
              value={values.title}
              onChange={(v) => set('title', v)}
              onBlur={(half) => touch(`title.${half}`)}
              errorMr={show('title.mr')}
              errorEn={show('title.en')}
              hint="Printed in bold in the ticker, e.g. प्रवेश प्रक्रिया सुरू / Admissions are open."
            />
            <div className="mt10">
              <BilingualField
                id="announcement-detail"
                label="Detail"
                maxLength={500}
                required={false}
                value={values.detail}
                onChange={(v) => set('detail', v)}
                onBlur={(half) => touch(`detail.${half}`)}
                errorMr={show('detail.mr')}
                errorEn={show('detail.en')}
                hint="Optional line after the title, printed as “title — detail”. Leave both languages blank for none."
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
              id="announcement-link"
              label="Link"
              error={linkError}
              hint={
                <>
                  A page of the website starting with / (for example /apply), or a full address starting with https:// — other sites open in
                  a new tab. Leave blank for plain text that cannot be clicked.
                </>
              }
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                list="announcement-site-pages"
                maxLength={500}
                placeholder="No link"
                {...fieldAria('announcement-link', linkError)}
                value={values.link}
                onChange={(e) => set('link', e.target.value)}
                onBlur={() => touch('link')}
              />
              <datalist id="announcement-site-pages">
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
                id="announcement-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the announcement at the end of the ticker.' : 'Lower numbers scroll past first.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('announcement-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the ticker' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField
                id="announcement-active"
                label="Status"
                hint="Inactive announcements stay here but are not shown on the website."
              >
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input
                    id="announcement-active"
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

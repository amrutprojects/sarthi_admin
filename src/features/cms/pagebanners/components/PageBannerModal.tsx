import { useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import { toastError, toastOk } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { ABOUT_DEFAULT_SUBTITLE, pageBannerEntry } from '../constants';
import { pageBannersService } from '../services/pageBannersService';
import type { Bilingual, PageBanner, UpdatePageBannerInput } from '../types/pagebanners.types';
import {
  SUBTITLE_MAX,
  TITLE_MAX,
  bannerPayload,
  serverBannerErrors,
  toBannerForm,
  validateBanner,
  type BannerField,
  type BannerFormValues,
} from '../validation/pagebanners.validation';

const FORM_ID = 'cms-pagebanner-form';

/* "Default title: About SARTHI · सारथी विषयी माहिती" under a pair, so the admin knows what blank brings back. */
function DefaultLine({ label, value }: { label: string; value: Bilingual | null }) {
  return (
    <div className="hint mt4">
      {label}:{' '}
      {value ? (
        <>
          {value.en}
          <span lang="mr"> &middot; {value.mr}</span>
        </>
      ) : (
        `${ABOUT_DEFAULT_SUBTITLE}.`
      )}
    </div>
  );
}

/*
 * Edit banner — one page's banner title and subtitle on the website, each in both languages, in a dialog over the
 * list (the Navigation Menu's Edit name dialog, with two pairs). Opens with what the website shows now. A pair left
 * blank in both languages (or typed back as the default) saves as the default; "Reset to default" puts both defaults
 * back at once and is offered only while the page has text of its own. The dialog stays open on any failure, with
 * what was typed.
 */
export default function PageBannerModal({
  item,
  onClose,
  onSaved,
}: {
  item: PageBanner;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const entry = pageBannerEntry(item.key);
  const [values, setValues] = useState<BannerFormValues>(() => toBannerForm(item, entry));
  const [touched, setTouched] = useState<Partial<Record<BannerField, boolean>>>({});
  const [server, setServer] = useState<FieldErrors<BannerField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const local = validateBanner(values);
  const show = (f: BannerField) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];

  /* An edit clears the server's complaints about that pair: they were about the previous text. */
  const change = (part: 'title' | 'subtitle', next: Bilingual) => {
    setValues((v) => ({ ...v, [part]: next }));
    setServer((s) => {
      const copy = { ...s };
      delete copy[part];
      delete copy[`${part}.mr`];
      delete copy[`${part}.en`];
      return copy;
    });
  };

  async function save(body: Required<UpdatePageBannerInput>, success: string) {
    setBusy(true);
    setServer({});
    try {
      await pageBannersService.update(item.key, body);
      toastOk(success);
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverBannerErrors(err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (!isValid(local)) return;
    await save(bannerPayload(values, entry), `${entry.page} banner updated`);
  }

  const reset = () => void save({ title: null, subtitle: null }, `${entry.page} banner now uses the default title and subtitle`);

  return (
    <Modal
      title={`Edit banner — ${entry.page}`}
      size="wide"
      onClose={onClose}
      footer={
        <>
          {item.title || item.subtitle ? (
            <button type="button" className="btn" style={{ marginRight: 'auto' }} disabled={busy} onClick={reset}>
              Reset to default
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <BilingualField
          id="banner-title"
          label="Title"
          required={false}
          maxLength={TITLE_MAX}
          value={values.title}
          onChange={(next) => change('title', next)}
          onBlur={(h) => setTouched((t) => ({ ...t, [`title.${h}`]: true }))}
          /* A server message on the pair as a whole ("body.title") is shown on its Marathi half. */
          errorMr={show('title.mr') ?? server.title}
          errorEn={show('title.en')}
        />
        <div className="hint">The heading of the banner at the top of {entry.path || 'the page'}. Leave both blank to use the default title.</div>
        <DefaultLine label="Default title" value={entry.title} />

        <div className="mt10">
          <BilingualField
            id="banner-subtitle"
            label="Subtitle"
            required={false}
            multiline
            maxLength={SUBTITLE_MAX}
            value={values.subtitle}
            onChange={(next) => change('subtitle', next)}
            onBlur={(h) => setTouched((t) => ({ ...t, [`subtitle.${h}`]: true }))}
            errorMr={show('subtitle.mr') ?? server.subtitle}
            errorEn={show('subtitle.en')}
          />
        </div>
        <div className="hint">The line under the heading. Leave both blank to use the default subtitle.</div>
        <DefaultLine label="Default subtitle" value={entry.subtitle} />
      </form>
    </Modal>
  );
}

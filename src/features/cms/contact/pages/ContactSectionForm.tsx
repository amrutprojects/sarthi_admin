import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { ConfirmModal, toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { ApiContactPage, ContactField, ContactSection, UpdateContactPageInput } from '../types/contact.types';
import {
  toFormValues, toSectionPayload, validateContactSection, type ContactFormValues, type OrgFormValues,
} from '../validation/contact.validation';

interface ContactSectionFormProps {
  /* The page as loaded: everything outside the section is sent back exactly as it is here. */
  page: ApiContactPage;
  section: ContactSection;
  /* The caller saves and navigates; this component only reports. */
  onSave: (payload: UpdateContactPageInput) => Promise<void>;
  backTo: string;
  /* What is being saved, for the confirmation: "the AMRUT contact details". */
  confirmName: string;
}

const FORM_ID = 'cms-contact-section-form';

/*
 * One section of the Contact page — page information, the AMRUT card or the implementation partner
 * card — on its own page (no modal), with only that section's fields.
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, ask before saving, keep what was typed when a
 * save fails, and put the server's own field messages on the matching inputs.
 *
 * The backend saves the banner and both cards with one PUT in a single transaction, so the public page
 * is never served half-updated; the rest of the page goes back unchanged.
 */
export default function ContactSectionForm({ page, section, onSave, backTo, confirmName }: ContactSectionFormProps) {
  const [values, setValues] = useState<ContactFormValues>(() => toFormValues(page));
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ContactField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const local = validateContactSection(section, values);
  const show = (f: ContactField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: ContactField) => setTouched((t) => ({ ...t, [f]: true }));

  /* Any edit clears the server's complaint about that field — it was about the previous value. */
  const change = (next: ContactFormValues, cleared: ContactField[]) => {
    setValues(next);
    setDirty(true);
    if (cleared.length) {
      setServerErrors((e) => {
        const copy = { ...e };
        for (const f of cleared) delete copy[f];
        return copy;
      });
    }
  };

  const setCard = (key: 'amrut' | 'partner', patch: Partial<OrgFormValues>, cleared: ContactField[]) =>
    change({ ...values, [key]: { ...values[key], ...patch } }, cleared);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy || !isValid(local)) return;
    setConfirming(true);
  }

  async function save() {
    setConfirming(false);
    setBusy(true);
    setServerErrors({});
    const payload = toSectionPayload(page, section, values);
    try {
      await onSave(payload);
      setDirty(false);
    } catch (err) {
      /*
       * A 422 carries per-field paths such as "body.organizations.0.address.mr". The last two
       * segments identify the field; mapping them onto the form puts the message on the right input
       * instead of in a toast the admin then has to decode.
       */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = mapServerErrors(err, payload, Object.keys(local));
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {section === 'page' ? (
            <>
              <BilingualField
                id="cp-title"
                label="Page title"
                maxLength={150}
                value={values.pageTitle}
                onChange={(pageTitle) => change({ ...values, pageTitle }, ['pageTitle.mr', 'pageTitle.en'])}
                onBlur={(half) => touch(`pageTitle.${half}` as ContactField)}
                errorMr={show('pageTitle.mr')}
                errorEn={show('pageTitle.en')}
                hint="The banner heading at the top of the public Contact page."
              />
              <div className="mt10">
                <BilingualField
                  id="cp-subtitle"
                  label="Page subtitle"
                  maxLength={300}
                  value={values.pageSubtitle}
                  onChange={(pageSubtitle) => change({ ...values, pageSubtitle }, ['pageSubtitle.mr', 'pageSubtitle.en'])}
                  onBlur={(half) => touch(`pageSubtitle.${half}` as ContactField)}
                  errorMr={show('pageSubtitle.mr')}
                  errorEn={show('pageSubtitle.en')}
                  hint="The line under the heading."
                />
              </div>
              <div className="grid g2 mt10">
                <MasterField
                  id="cp-published"
                  label="Status"
                  hint="Unpublishing hides the managed content; the website then falls back to its own built-in copy."
                >
                  <select
                    className="inp"
                    id="cp-published"
                    value={values.isPublished ? 'true' : 'false'}
                    onChange={(e) => change({ ...values, isPublished: e.target.value === 'true' }, [])}
                  >
                    <option value="true">Published</option>
                    <option value="false">Unpublished</option>
                  </select>
                </MasterField>
              </div>
              {!values.isPublished ? (
                <div className="mt10">
                  <Callout tone="warn" title="The public Contact page will not show this content">
                    Visitors keep seeing the website&rsquo;s built-in copy until the page is published again.
                  </Callout>
                </div>
              ) : null}
            </>
          ) : null}

          {section === 'amrut' ? (
            <>
              <BilingualField
                id="cp-amrut-name"
                label="Organisation name"
                maxLength={150}
                value={values.amrut.name}
                onChange={(name) => setCard('amrut', { name }, ['AMRUT.name.mr', 'AMRUT.name.en'])}
                onBlur={(half) => touch(`AMRUT.name.${half}` as ContactField)}
                errorMr={show('AMRUT.name.mr')}
                errorEn={show('AMRUT.name.en')}
              />
              <div className="mt10">
                <BilingualField
                  id="cp-amrut-address"
                  label="Address"
                  maxLength={500}
                  multiline
                  value={values.amrut.address}
                  onChange={(address) => setCard('amrut', { address }, ['AMRUT.address.mr', 'AMRUT.address.en'])}
                  onBlur={(half) => touch(`AMRUT.address.${half}` as ContactField)}
                  errorMr={show('AMRUT.address.mr')}
                  errorEn={show('AMRUT.address.en')}
                />
              </div>
              <div className="grid g3 mt10">
                <MasterField id="cp-amrut-email" label="Email" required error={show('AMRUT.email')}>
                  <input
                    className="inp"
                    {...fieldAria('cp-amrut-email', show('AMRUT.email'))}
                    type="email"
                    maxLength={255}
                    autoComplete="off"
                    value={values.amrut.email}
                    onChange={(e) => setCard('amrut', { email: e.target.value }, ['AMRUT.email'])}
                    onBlur={() => touch('AMRUT.email')}
                  />
                </MasterField>
                <MasterField id="cp-amrut-phone" label="Phone" required error={show('AMRUT.phone')} hint="For example +91 97301 51450.">
                  <input
                    className="inp"
                    {...fieldAria('cp-amrut-phone', show('AMRUT.phone'))}
                    type="tel"
                    maxLength={32}
                    autoComplete="off"
                    value={values.amrut.phone}
                    onChange={(e) => setCard('amrut', { phone: e.target.value }, ['AMRUT.phone'])}
                    onBlur={() => touch('AMRUT.phone')}
                  />
                </MasterField>
                <MasterField id="cp-amrut-website" label="Website" error={show('AMRUT.websiteUrl')} hint="Optional. Must start with http:// or https://.">
                  <input
                    className="inp"
                    {...fieldAria('cp-amrut-website', show('AMRUT.websiteUrl'))}
                    type="url"
                    maxLength={255}
                    autoComplete="off"
                    value={values.amrut.websiteUrl}
                    onChange={(e) => setCard('amrut', { websiteUrl: e.target.value }, ['AMRUT.websiteUrl'])}
                    onBlur={() => touch('AMRUT.websiteUrl')}
                  />
                </MasterField>
              </div>
              <CardStatus id="cp-amrut-active" isActive={values.amrut.isActive} onChange={(isActive) => setCard('amrut', { isActive }, [])} />
            </>
          ) : null}

          {section === 'partner' ? (
            <>
              <BilingualField
                id="cp-partner-name"
                label="Organisation name"
                maxLength={150}
                value={values.partner.name}
                onChange={(name) => setCard('partner', { name }, ['IMPLEMENTATION_PARTNER.name.mr', 'IMPLEMENTATION_PARTNER.name.en'])}
                onBlur={(half) => touch(`IMPLEMENTATION_PARTNER.name.${half}` as ContactField)}
                errorMr={show('IMPLEMENTATION_PARTNER.name.mr')}
                errorEn={show('IMPLEMENTATION_PARTNER.name.en')}
              />
              <div className="mt10">
                <BilingualField
                  id="cp-partner-role"
                  label="Role"
                  maxLength={200}
                  value={values.partner.role}
                  onChange={(role) => setCard('partner', { role }, ['IMPLEMENTATION_PARTNER.role.mr', 'IMPLEMENTATION_PARTNER.role.en'])}
                  onBlur={(half) => touch(`IMPLEMENTATION_PARTNER.role.${half}` as ContactField)}
                  errorMr={show('IMPLEMENTATION_PARTNER.role.mr')}
                  errorEn={show('IMPLEMENTATION_PARTNER.role.en')}
                  hint="For example Implementation & technology partner."
                />
              </div>
              <div className="mt10">
                <BilingualField
                  id="cp-partner-hours"
                  label="Helpdesk hours"
                  maxLength={120}
                  value={values.partner.helpdeskHours}
                  onChange={(helpdeskHours) =>
                    setCard('partner', { helpdeskHours }, ['IMPLEMENTATION_PARTNER.helpdeskHours.mr', 'IMPLEMENTATION_PARTNER.helpdeskHours.en'])
                  }
                  onBlur={(half) => touch(`IMPLEMENTATION_PARTNER.helpdeskHours.${half}` as ContactField)}
                  errorMr={show('IMPLEMENTATION_PARTNER.helpdeskHours.mr')}
                  errorEn={show('IMPLEMENTATION_PARTNER.helpdeskHours.en')}
                  hint="For example Mon–Sat, 10:00 – 18:00."
                />
              </div>
              <div className="grid g2 mt10">
                <MasterField id="cp-partner-email" label="Programme desk email" required error={show('IMPLEMENTATION_PARTNER.email')}>
                  <input
                    className="inp"
                    {...fieldAria('cp-partner-email', show('IMPLEMENTATION_PARTNER.email'))}
                    type="email"
                    maxLength={255}
                    autoComplete="off"
                    value={values.partner.email}
                    onChange={(e) => setCard('partner', { email: e.target.value }, ['IMPLEMENTATION_PARTNER.email'])}
                    onBlur={() => touch('IMPLEMENTATION_PARTNER.email')}
                  />
                </MasterField>
              </div>
              <CardStatus id="cp-partner-active" isActive={values.partner.isActive} onChange={(isActive) => setCard('partner', { isActive }, [])} />
            </>
          ) : null}
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel="Save changes" busy={busy} dirty={dirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={`Are you sure you want to save the changes to ${confirmName}? They appear on the public Contact page straight away.`}
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}

/* Per-card status. A hidden card stays editable here but disappears from the public page. */
function CardStatus({ id, isActive, onChange }: { id: string; isActive: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid g2 mt10">
      <MasterField id={id} label="Show this card" hint="Hidden cards are kept but not sent to the website.">
        <select className="inp" id={id} value={isActive ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      </MasterField>
    </div>
  );
}

/*
 * Server 422 paths -> form field names.
 *
 * The backend reports "body.organizations.<index>.<field>[.<half>]". The index is positional, so it
 * is resolved back to the card type through the payload that was actually sent. Only the fields on
 * this page are mapped: a message about another section has no input here to sit next to.
 */
function mapServerErrors(err: ApiError, sent: UpdateContactPageInput, fields: readonly string[]): FieldErrors<ContactField> {
  const mapped: FieldErrors<ContactField> = {};

  for (const detail of err.details) {
    const path = (detail.field ?? '').split('.');
    if (path[0] === 'body') path.shift();

    let key: string;
    if (path[0] === 'organizations') {
      const type = sent.organizations[Number(path[1])]?.orgType;
      if (!type) continue;
      key = `${type}.${path.slice(2).join('.')}`;
    } else {
      key = path.join('.');
    }
    if (fields.includes(key) && !mapped[key as ContactField]) mapped[key as ContactField] = detail.message;
  }

  /* Anything that did not map to a field leaves `mapped` empty, so the caller falls back to a toast. */
  return mapped;
}

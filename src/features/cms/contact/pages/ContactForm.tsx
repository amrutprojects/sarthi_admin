import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { CONTACT_FIELDS, type ContactField } from '../types/contact.types';
import {
  toPayload, validateContactForm, type ContactFormValues, type OrgFormValues,
} from '../validation/contact.validation';

interface ContactFormProps {
  initial: ContactFormValues;
  onSave: (values: ContactFormValues) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-contact-form';

/*
 * The Contact page editor, on its own page (no modal), in four clearly separated sections:
 * page information, the AMRUT card, the implementation partner card, and visibility.
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, keep what was typed when a save fails, and
 * put the server's own field messages on the matching inputs.
 *
 * The whole page is one PUT — the backend saves the banner and both cards in a single transaction,
 * so the public page is never served half-updated.
 */
export default function ContactForm({ initial, onSave, backTo }: ContactFormProps) {
  const [values, setValues] = useState<ContactFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ContactField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateContactForm(values);
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy || !isValid(local)) return;

    setBusy(true);
    setServerErrors({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      /*
       * A 422 carries per-field paths such as "body.organizations.0.address.mr". The last two
       * segments identify the field; mapping them onto the form puts the message on the right input
       * instead of in a toast the admin then has to decode.
       */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = mapServerErrors(err, values);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>Page information</h3></div>
          <div className="card-b">
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
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h"><h3>AMRUT contact details <span className="sub">first card</span></h3></div>
          <div className="card-b">
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
            <CardStatus
              id="cp-amrut-active"
              isActive={values.amrut.isActive}
              onChange={(isActive) => setCard('amrut', { isActive }, [])}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h"><h3>Implementation partner <span className="sub">second card</span></h3></div>
          <div className="card-b">
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
            <CardStatus
              id="cp-partner-active"
              isActive={values.partner.isActive}
              onChange={(isActive) => setCard('partner', { isActive }, [])}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h"><h3>Page visibility</h3></div>
          <div className="card-b">
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
            {!values.isPublished ? (
              <div className="mt10">
                <Callout tone="warn" title="The public Contact page will not show this content">
                  Visitors keep seeing the website&rsquo;s built-in copy until the page is published again.
                </Callout>
              </div>
            ) : null}
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-b">
          <MasterFormActions formId={FORM_ID} submitLabel="Save changes" busy={busy} dirty={dirty} backTo={backTo} />
        </div>
      </div>
    </>
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
 * is resolved back to the card type through the payload that was actually sent.
 */
function mapServerErrors(err: ApiError, values: ContactFormValues): FieldErrors<ContactField> {
  const sent = toPayload(values).organizations;
  const mapped: FieldErrors<ContactField> = {};

  for (const detail of err.details) {
    const path = (detail.field ?? '').split('.');
    if (path[0] === 'body') path.shift();

    if (path[0] === 'organizations') {
      const index = Number(path[1]);
      const type = sent[index]?.orgType;
      if (!type) continue;
      const key = `${type}.${path.slice(2).join('.')}` as ContactField;
      if ((CONTACT_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
      continue;
    }

    const key = path.join('.') as ContactField;
    if ((CONTACT_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
  }

  /* Anything that did not map to a field leaves `mapped` empty, so the caller falls back to a toast. */
  return mapped;
}

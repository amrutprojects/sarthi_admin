import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import {
  FOOTER_LINK_KINDS,
  LINKING_KINDS,
  LINK_KIND_LABEL,
  MAX_LINK_COLUMNS,
  type FooterField,
  type FooterLinkKind,
} from '../types/footer.types';
import {
  emptyColumn,
  emptyLink,
  validateFooterForm,
  type ColumnFormValues,
  type FooterFormValues,
  type LinkFormValues,
} from '../validation/footer.validation';

interface FooterFormProps {
  initial: FooterFormValues;
  onSave: (values: FooterFormValues) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-footer-form';

/*
 * The footer editor, on its own page (no modal), in the order the footer itself reads:
 * the About column, the link columns, the Contact column, the bottom bar, and visibility.
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, keep what was typed when a save fails, and
 * put the server's own field messages on the matching inputs.
 *
 * The whole footer is one PUT — the backend saves the text, the columns and every link in a single
 * transaction, so no page is ever served a half-updated footer.
 *
 * What is NOT editable here is the layout. The public stylesheet lays the footer out as four
 * columns — About, two link columns, Contact — so the two fixed columns have fixed places and the
 * list in between is capped at MAX_LINK_COLUMNS. Everything inside them is yours to change.
 */
export default function FooterForm({ initial, onSave, backTo }: FooterFormProps) {
  const [values, setValues] = useState<FooterFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<FooterField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateFooterForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  /* Any edit clears the server's complaint about that field — it was about the previous value. */
  const change = (next: FooterFormValues, cleared: string[] = []) => {
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

  /*
   * Editing a list shifts the indexes of everything after the change, so the errors and touched
   * flags keyed by those indexes would then be pointing at the wrong rows. Clearing both is the
   * honest thing to do: the form re-derives local errors immediately, and the server's messages
   * were about the arrangement that no longer exists.
   */
  const changeList = (next: FooterFormValues) => {
    setValues(next);
    setDirty(true);
    setTouched({});
    setServerErrors({});
  };

  const setColumn = (index: number, patch: Partial<ColumnFormValues>, cleared: string[] = []) =>
    change(
      {
        ...values,
        linkColumns: values.linkColumns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
      },
      cleared,
    );

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
       * A 422 carries per-field paths such as "body.linkColumns.0.links.2.href". Those are exactly
       * the keys this form errors by, so dropping the "body." prefix puts each message on the right
       * input instead of in a toast the administrator then has to decode.
       */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: FieldErrors<FooterField> = {};
        for (const d of err.details) {
          /* A detail without a path is a whole-request complaint; it falls through to the toast. */
          if (!d.field) continue;
          mapped[d.field.replace(/^body\./, '')] = d.message;
        }
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  /* One editable list of footer lines, used for a link column and for the contact extras. */
  const linkRows = (prefix: string, links: LinkFormValues[], write: (next: LinkFormValues[]) => void) => {
    const patch = (index: number, change_: Partial<LinkFormValues>) =>
      write(links.map((l, i) => (i === index ? { ...l, ...change_ } : l)));

    const move = (index: number, by: number) => {
      const to = index + by;
      if (to < 0 || to >= links.length) return;
      const next = [...links];
      const [row] = next.splice(index, 1);
      next.splice(to, 0, row!);
      write(next);
    };

    return (
      <div>
        {links.length === 0 ? (
          <p className="muted fs12 mb10">No lines yet. Add one below.</p>
        ) : null}

        {links.map((link, index) => {
          const id = `${prefix}-${index}`;
          const linking = LINKING_KINDS.includes(link.kind);
          return (
            <div className="card mb10" key={index}>
              <div className="card-b">
                <div className="grid g2">
                  <MasterField id={`${id}-kind`} label="Line type" required>
                    <select
                      className="inp"
                      id={`${id}-kind`}
                      value={link.kind}
                      onChange={(e) =>
                        patch(index, { kind: e.target.value as FooterLinkKind })
                      }
                    >
                      {FOOTER_LINK_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {LINK_KIND_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </MasterField>

                  <MasterField id={`${id}-active`} label="Shown on the site">
                    <label className="f ac gp8 fs13">
                      <input
                        type="checkbox"
                        id={`${id}-active`}
                        checked={link.isActive}
                        onChange={(e) => patch(index, { isActive: e.target.checked })}
                      />
                      {link.isActive ? 'Visible' : 'Hidden'}
                    </label>
                  </MasterField>
                </div>

                <div className="mt10">
                  <BilingualField
                    id={`${id}-label`}
                    label="Label"
                    maxLength={150}
                    value={link.label}
                    onChange={(label) => patch(index, { label })}
                    onBlur={(half) => touch(`${prefix}.${index}.label.${half}`)}
                    errorMr={show(`${prefix}.${index}.label.mr`)}
                    errorEn={show(`${prefix}.${index}.label.en`)}
                  />
                </div>

                {/* Only the two linking kinds have a destination; the others must carry none. */}
                {linking ? (
                  <div className="mt10">
                    <MasterField
                      id={`${id}-href`}
                      label={link.kind === 'INTERNAL' ? 'Page path' : 'Website address'}
                      required
                      error={show(`${prefix}.${index}.href`)}
                      hint={
                        link.kind === 'INTERNAL'
                          ? 'A page on this site, such as /apply or /faq.'
                          : 'A full address starting with https://.'
                      }
                    >
                      <input
                        className="inp"
                        type="text"
                        autoComplete="off"
                        maxLength={500}
                        {...fieldAria(`${id}-href`, show(`${prefix}.${index}.href`))}
                        value={link.href}
                        onChange={(e) => patch(index, { href: e.target.value })}
                        onBlur={() => touch(`${prefix}.${index}.href`)}
                      />
                    </MasterField>
                  </div>
                ) : (
                  <p className="muted fs12 mt10">
                    {link.kind === 'TEXT'
                      ? 'Shown as plain text, with no link.'
                      : 'Shown as a link that tells the visitor it is not available yet.'}
                  </p>
                )}

                <div className="f ac gp8 wrap mt10">
                  <button type="button" className="btn sm" disabled={index === 0} onClick={() => move(index, -1)}>
                    Move up
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={index === links.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="btn sm danger"
                    onClick={() => write(links.filter((_, i) => i !== index))}
                  >
                    Remove line
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button type="button" className="btn sm" onClick={() => write([...links, emptyLink()])}>
          <Icon name="plus" />
          Add a line
        </button>
      </div>
    );
  };

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        {/* ── column 1 ─────────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>About column</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="ft-about-heading"
              label="Heading"
              maxLength={200}
              value={values.about.heading}
              onChange={(heading) =>
                change({ ...values, about: { ...values.about, heading } }, [
                  'about.heading.mr',
                  'about.heading.en',
                ])
              }
              onBlur={(half) => touch(`about.heading.${half}`)}
              errorMr={show('about.heading.mr')}
              errorEn={show('about.heading.en')}
              hint="The organisation name in the first footer column."
            />

            <div className="mt10">
              <BilingualField
                id="ft-about-body"
                label="About text"
                maxLength={2000}
                multiline
                value={values.about.body}
                onChange={(body) =>
                  change({ ...values, about: { ...values.about, body } }, [
                    'about.body.mr',
                    'about.body.en',
                  ])
                }
                onBlur={(half) => touch(`about.body.${half}`)}
                errorMr={show('about.body.mr')}
                errorEn={show('about.body.en')}
                hint="The website shows the first 320 characters, so put what matters first."
              />
            </div>

            <div className="grid g2 mt10">
              <BilingualField
                id="ft-partner-label"
                label="Partner label"
                maxLength={120}
                value={values.about.partnerLabel}
                onChange={(partnerLabel) =>
                  change({ ...values, about: { ...values.about, partnerLabel } }, [
                    'about.partnerLabel.mr',
                    'about.partnerLabel.en',
                  ])
                }
                onBlur={(half) => touch(`about.partnerLabel.${half}`)}
                errorMr={show('about.partnerLabel.mr')}
                errorEn={show('about.partnerLabel.en')}
              />
              <MasterField
                id="ft-partner-name"
                label="Partner name"
                required
                error={show('about.partnerName')}
                hint="A registered company name, so it is not translated."
              >
                <input
                  className="inp"
                  type="text"
                  autoComplete="off"
                  maxLength={150}
                  {...fieldAria('ft-partner-name', show('about.partnerName'))}
                  value={values.about.partnerName}
                  onChange={(e) =>
                    change({ ...values, about: { ...values.about, partnerName: e.target.value } }, [
                      'about.partnerName',
                    ])
                  }
                  onBlur={() => touch('about.partnerName')}
                />
              </MasterField>
            </div>
          </div>
        </div>

        {/* ── the link columns ─────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Link columns</h3>
          </div>
          <div className="card-b">
            <Callout tone="info" title="The footer holds two link columns">
              The public footer is laid out as four columns — About, two link columns, and Contact.
              Adding a third would push the footer onto a second row on every page, so the list below
              is capped at {MAX_LINK_COLUMNS}. The links inside each column are yours to add, edit,
              reorder and remove.
            </Callout>

            {show('linkColumns') ? (
              <p className="err fs12 mt10" role="alert">
                {show('linkColumns')}
              </p>
            ) : null}

            {values.linkColumns.map((column, index) => (
              <div className="mt14" key={index}>
                <div className="f ac gp8 wrap mb10">
                  <h4 className="fs14">Column {index + 1}</h4>
                  <span className="flex1" />
                  <label className="f ac gp8 fs13">
                    <input
                      type="checkbox"
                      checked={column.isActive}
                      onChange={(e) => setColumn(index, { isActive: e.target.checked })}
                    />
                    {column.isActive ? 'Visible' : 'Hidden'}
                  </label>
                  <button
                    type="button"
                    className="btn sm danger"
                    onClick={() =>
                      changeList({
                        ...values,
                        linkColumns: values.linkColumns.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove column
                  </button>
                </div>

                <BilingualField
                  id={`ft-col-${index}-heading`}
                  label="Column heading"
                  maxLength={200}
                  value={column.heading}
                  onChange={(heading) =>
                    setColumn(index, { heading }, [
                      `linkColumns.${index}.heading.mr`,
                      `linkColumns.${index}.heading.en`,
                    ])
                  }
                  onBlur={(half) => touch(`linkColumns.${index}.heading.${half}`)}
                  errorMr={show(`linkColumns.${index}.heading.mr`)}
                  errorEn={show(`linkColumns.${index}.heading.en`)}
                />

                <div className="mt10">
                  {linkRows(`linkColumns.${index}.links`, column.links, (links) =>
                    changeList({
                      ...values,
                      linkColumns: values.linkColumns.map((c, i) =>
                        i === index ? { ...c, links } : c,
                      ),
                    }),
                  )}
                </div>
              </div>
            ))}

            {values.linkColumns.length < MAX_LINK_COLUMNS ? (
              <div className="mt14">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    changeList({ ...values, linkColumns: [...values.linkColumns, emptyColumn()] })
                  }
                >
                  <Icon name="plus" />
                  Add a column
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── column 4 ─────────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Contact column</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="ft-contact-heading"
              label="Heading"
              maxLength={200}
              value={values.contact.heading}
              onChange={(heading) =>
                change({ ...values, contact: { ...values.contact, heading } }, [
                  'contact.heading.mr',
                  'contact.heading.en',
                ])
              }
              onBlur={(half) => touch(`contact.heading.${half}`)}
              errorMr={show('contact.heading.mr')}
              errorEn={show('contact.heading.en')}
            />

            <div className="mt10">
              <BilingualField
                id="ft-contact-address"
                label="Address"
                maxLength={500}
                multiline
                value={values.contact.address}
                onChange={(address) =>
                  change({ ...values, contact: { ...values.contact, address } }, [
                    'contact.address.mr',
                    'contact.address.en',
                  ])
                }
                onBlur={(half) => touch(`contact.address.${half}`)}
                errorMr={show('contact.address.mr')}
                errorEn={show('contact.address.en')}
              />
            </div>

            <div className="grid g2 mt10">
              <MasterField id="ft-email" label="Email" required error={show('contact.email')}>
                <input
                  className="inp"
                  type="email"
                  autoComplete="off"
                  maxLength={255}
                  {...fieldAria('ft-email', show('contact.email'))}
                  value={values.contact.email}
                  onChange={(e) =>
                    change({ ...values, contact: { ...values.contact, email: e.target.value } }, [
                      'contact.email',
                    ])
                  }
                  onBlur={() => touch('contact.email')}
                />
              </MasterField>

              <MasterField id="ft-phone" label="Phone" required error={show('contact.phone')}>
                <input
                  className="inp"
                  type="tel"
                  autoComplete="off"
                  maxLength={32}
                  {...fieldAria('ft-phone', show('contact.phone'))}
                  value={values.contact.phone}
                  onChange={(e) =>
                    change({ ...values, contact: { ...values.contact, phone: e.target.value } }, [
                      'contact.phone',
                    ])
                  }
                  onBlur={() => touch('contact.phone')}
                />
              </MasterField>
            </div>

            <h4 className="fs14 mt14 mb10">Extra lines</h4>
            <p className="muted fs12 mb10">
              Shown beneath the phone number. The login control is part of the site itself and is not
              edited here.
            </p>
            {linkRows('contact.links', values.contact.links, (links) =>
              changeList({ ...values, contact: { ...values.contact, links } }),
            )}
          </div>
        </div>

        {/* ── bottom bar ───────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Bottom bar</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="ft-copyright"
              label="Copyright line"
              maxLength={300}
              value={values.bottom.copyright}
              onChange={(copyright) =>
                change({ ...values, bottom: { ...values.bottom, copyright } }, [
                  'bottom.copyright.mr',
                  'bottom.copyright.en',
                ])
              }
              onBlur={(half) => touch(`bottom.copyright.${half}`)}
              errorMr={show('bottom.copyright.mr')}
              errorEn={show('bottom.copyright.en')}
              hint="Write {year} where the year belongs — the site fills in the current year, so this never goes stale."
            />

            <div className="mt10">
              <BilingualField
                id="ft-disclaimer"
                label="Disclaimer"
                maxLength={400}
                multiline
                value={values.bottom.disclaimer}
                onChange={(disclaimer) =>
                  change({ ...values, bottom: { ...values.bottom, disclaimer } }, [
                    'bottom.disclaimer.mr',
                    'bottom.disclaimer.en',
                  ])
                }
                onBlur={(half) => touch(`bottom.disclaimer.${half}`)}
                errorMr={show('bottom.disclaimer.mr')}
                errorEn={show('bottom.disclaimer.en')}
              />
            </div>
          </div>
        </div>

        {/* ── visibility ───────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Visibility</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13">
              <input
                type="checkbox"
                checked={values.isPublished}
                onChange={(e) => change({ ...values, isPublished: e.target.checked })}
              />
              Publish this footer on the public website
            </label>
            {!values.isPublished ? (
              <p className="muted fs12 mt10">
                While unpublished the website shows its own built-in footer, so visitors still see a
                complete page.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <MasterFormActions
        formId={FORM_ID}
        submitLabel="Save footer"
        busy={busy}
        dirty={dirty}
        backTo={backTo}
      />
    </>
  );
}

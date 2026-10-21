import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { ApiProgrammeHighlight, Bilingual, HighlightField, UpdateProgrammeHighlightInput } from '../types/highlight.types';

const FORM_ID = 'cms-highlight-form';

interface BilingualValue {
  mr: string;
  en: string;
}

interface ObjectiveValues {
  text: BilingualValue;
  isActive: boolean;
}

interface FormValues {
  heading: BilingualValue;
  subheading: BilingualValue;
  tagline: BilingualValue;
  certification: BilingualValue;
  objectives: ObjectiveValues[];
  isPublished: boolean;
}

const pairOf = (v: Bilingual | null | undefined): BilingualValue => (v ? { mr: v.mr, en: v.en } : { mr: '', en: '' });
const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });

export const toFormValues = (page: ApiProgrammeHighlight): FormValues => ({
  heading: pairOf(page.heading),
  subheading: pairOf(page.subheading),
  tagline: pairOf(page.tagline),
  certification: pairOf(page.certification),
  objectives: page.objectives.map((o) => ({ text: pairOf(o.text), isActive: o.isActive })),
  isPublished: page.isPublished,
});

const toPayload = (v: FormValues): UpdateProgrammeHighlightInput => ({
  heading: trimPair(v.heading),
  subheading: trimPair(v.subheading),
  tagline: trimPair(v.tagline),
  certification: trimPair(v.certification),
  objectives: v.objectives.map((o, index) => ({
    text: trimPair(o.text),
    displayOrder: index,
    isActive: o.isActive,
  })),
  isPublished: v.isPublished,
});

const required = (value: string, label: string, max: number): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  return undefined;
};

/*
 * Form rules, deliberately identical to the server rules in
 * backend/src/cms/highlight/highlight.validator.ts. Both halves of every pair are required: the
 * public site defaults to Marathi, so a field filled in one language leaves half the visitors
 * looking at a blank line.
 */
function validate(v: FormValues): FieldErrors<HighlightField> {
  const errors: FieldErrors<HighlightField> = {};
  const pair = (prefix: string, value: BilingualValue, label: string, max: number) => {
    errors[`${prefix}.mr`] = required(value.mr, `${label} (Marathi)`, max);
    errors[`${prefix}.en`] = required(value.en, `${label} (English)`, max);
  };

  pair('heading', v.heading, 'Heading', 200);
  pair('subheading', v.subheading, 'Subheading', 300);
  pair('tagline', v.tagline, 'Tagline', 500);
  pair('certification', v.certification, 'Certification', 300);

  /* A ticked list with nothing in it is an empty box on the page. */
  if (v.objectives.length < 1) errors['objectives'] = 'At least one objective is required';
  v.objectives.forEach((o, i) => pair(`objectives.${i}.text`, o.text, 'Objective', 400));

  return errors;
}

/*
 * The home page's programme section editor.
 *
 * What is NOT here is the fact sheet beside it on the page. Total duration, per module and schedule
 * are summed from the modules, so they belong to the Modules Page screen; ideal completion, validity
 * and the deposit are the Programme page's fact sheet (Programme Page Management). Editing any of
 * them here would be a second place for the same numbers to disagree.
 */
export default function HighlightForm({
  initial,
  onSave,
  backTo,
}: {
  initial: FormValues;
  onSave: (values: FormValues) => Promise<void>;
  backTo: string;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<HighlightField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validate(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const change = (next: FormValues) => {
    setValues(next);
    setDirty(true);
  };

  /* Editing the list shifts indexes, so flags and messages keyed by them no longer apply. */
  const changeList = (next: FormValues) => {
    setValues(next);
    setDirty(true);
    setTouched({});
    setServerErrors({});
  };

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
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: FieldErrors<HighlightField> = {};
        for (const d of err.details) {
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

  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= values.objectives.length) return;
    const next = [...values.objectives];
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row!);
    changeList({ ...values, objectives: next });
  };

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <Callout tone="info" title="The fact sheet beside this is edited elsewhere">
          Total duration, per module and schedule are summed from the modules on the Modules Page screen; ideal completion, validity and the
          deposit come from the fact sheet in Programme Page Management. None of them is repeated here.
        </Callout>

        <div className="card mt14 mb14">
          <div className="card-h">
            <h3>Section text</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="hl-heading"
              label="Heading"
              maxLength={200}
              value={values.heading}
              onChange={(heading) => change({ ...values, heading })}
              onBlur={(half) => touch(`heading.${half}`)}
              errorMr={show('heading.mr')}
              errorEn={show('heading.en')}
              hint="The band heading, in full — for example the programme name, a dash, then what it is."
            />
            <div className="mt10">
              <BilingualField
                id="hl-sub"
                label="Subheading"
                maxLength={300}
                value={values.subheading}
                onChange={(subheading) => change({ ...values, subheading })}
                onBlur={(half) => touch(`subheading.${half}`)}
                errorMr={show('subheading.mr')}
                errorEn={show('subheading.en')}
                hint="The line under the heading — what the name expands to."
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="hl-tagline"
                label="Tagline"
                maxLength={500}
                multiline
                value={values.tagline}
                onChange={(tagline) => change({ ...values, tagline })}
                onBlur={(half) => touch(`tagline.${half}`)}
                errorMr={show('tagline.mr')}
                errorEn={show('tagline.en')}
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="hl-cert"
                label="Certification"
                maxLength={300}
                value={values.certification}
                onChange={(certification) => change({ ...values, certification })}
                onBlur={(half) => touch(`certification.${half}`)}
                errorMr={show('certification.mr')}
                errorEn={show('certification.en')}
                hint="The last row of the fact sheet — the only row of it that is text rather than a figure."
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Objectives</h3>
            <span className="muted fs12">{values.objectives.length} listed</span>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">
              The ticked list under the tagline. Unticking one keeps it here but removes it from the website.
            </p>

            {show('objectives') ? (
              <p className="err fs12 mb10" role="alert">
                {show('objectives')}
              </p>
            ) : null}

            {values.objectives.map((o, i) => (
              <div className="card mb10" key={i}>
                <div className="card-b">
                  <div className="f ac gp8 wrap mb10">
                    <b className="fs13">Objective {i + 1}</b>
                    <span className="flex1" />
                    <label className="f ac gp8 fs13">
                      <input
                        type="checkbox"
                        checked={o.isActive}
                        onChange={(e) =>
                          change({
                            ...values,
                            objectives: values.objectives.map((x, k) => (k === i ? { ...x, isActive: e.target.checked } : x)),
                          })
                        }
                      />
                      {o.isActive ? 'Visible' : 'Hidden'}
                    </label>
                    <button type="button" className="btn sm" disabled={i === 0} onClick={() => move(i, -1)}>
                      Move up
                    </button>
                    <button type="button" className="btn sm" disabled={i === values.objectives.length - 1} onClick={() => move(i, 1)}>
                      Move down
                    </button>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() =>
                        changeList({
                          ...values,
                          objectives: values.objectives.filter((_, k) => k !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <BilingualField
                    id={`hl-obj-${i}`}
                    label="Objective"
                    maxLength={400}
                    multiline
                    value={o.text}
                    onChange={(text) =>
                      change({
                        ...values,
                        objectives: values.objectives.map((x, k) => (k === i ? { ...x, text } : x)),
                      })
                    }
                    onBlur={(half) => touch(`objectives.${i}.text.${half}`)}
                    errorMr={show(`objectives.${i}.text.mr`)}
                    errorEn={show(`objectives.${i}.text.en`)}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn sm"
              onClick={() =>
                changeList({
                  ...values,
                  objectives: [...values.objectives, { text: { mr: '', en: '' }, isActive: true }],
                })
              }
            >
              <Icon name="plus" />
              Add an objective
            </button>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Visibility</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13">
              <input type="checkbox" checked={values.isPublished} onChange={(e) => change({ ...values, isPublished: e.target.checked })} />
              Publish this section on the public website
            </label>
            {!values.isPublished ? (
              <p className="muted fs12 mt10">While unpublished the website shows its own built-in copy of this section.</p>
            ) : null}
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel="Save section" busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}

export { toPayload };
export type { FormValues as HighlightFormValues };

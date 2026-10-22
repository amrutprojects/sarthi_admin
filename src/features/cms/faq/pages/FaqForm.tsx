import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { digitsKeystroke, isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { FAQ_FIELDS, type FaqField } from '../types/faq.types';
import {
  ANSWER_MAX,
  QUESTION_MAX,
  emptyFaqForm,
  normalizeFaqForm,
  validateFaqForm,
  type FaqFormValues,
} from '../validation/faq.validation';

interface FaqFormProps {
  initial?: FaqFormValues;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeFaqForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-faq-form';

/* The backend reports "body.question.mr"; the form keys its messages "question.mr". */
function mapServerErrors(err: ApiError): FieldErrors<FaqField> {
  const mapped: FieldErrors<FaqField> = {};
  for (const detail of err.details) {
    const key = (detail.field ?? '').replace(/^body\./, '') as FaqField;
    if ((FAQ_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
  }
  return mapped;
}

/*
 * The FAQ create / edit form, on its own page (no modal).
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it
 * has been touched, blocks a double submit, keeps the entered values when a save fails, and shows the
 * server's 422 messages against the matching input.
 */
export default function FaqForm({ initial, submitLabel, onSave, backTo, confirmMessage, statusSlot }: FaqFormProps) {
  const [values, setValues] = useState<FaqFormValues>(initial ?? emptyFaqForm());
  const [touched, setTouched] = useState<Partial<Record<FaqField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<FaqField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* Editing an existing question keeps its place, so the order cannot be blanked there. */
  const local = validateFaqForm(values, { orderRequired: Boolean(initial) });
  const show = (f: FaqField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: FaqField) => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof FaqFormValues>(key: K, value: FaqFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setServerErrors((e) => {
      const next = { ...e };
      for (const f of FAQ_FIELDS) if (f === key || f.startsWith(`${key}.`)) delete next[f];
      return next;
    });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (!isValid(local)) return;
    if (confirmMessage) {
      setConfirming(true);
      return;
    }
    await save();
  }

  async function save() {
    setConfirming(false);
    setBusy(true);
    setServerErrors({});
    try {
      await onSave(normalizeFaqForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = mapServerErrors(err);
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
          <BilingualField
            id="faq-question"
            label="Question"
            value={values.question}
            maxLength={QUESTION_MAX}
            onChange={(next) => set('question', next)}
            onBlur={(half) => touch(`question.${half}`)}
            errorMr={show('question.mr')}
            errorEn={show('question.en')}
            hint={`As it appears on the FAQ page. Up to ${QUESTION_MAX} characters in each language.`}
          />

          <BilingualField
            id="faq-answer"
            label="Answer"
            multiline
            value={values.answer}
            maxLength={ANSWER_MAX}
            onChange={(next) => set('answer', next)}
            onBlur={(half) => touch(`answer.${half}`)}
            errorMr={show('answer.mr')}
            errorEn={show('answer.en')}
            hint={`Shown when the question is opened. Up to ${ANSWER_MAX} characters in each language.`}
          />

          <div className="grid g2">
            <MasterField
              id="faq-order"
              label="Display Order"
              required={Boolean(initial)}
              error={show('displayOrder')}
              hint={
                initial
                  ? 'Lower numbers are listed first on the FAQ page.'
                  : 'Lower numbers are listed first. Leave empty to add the question at the end.'
              }
            >
              <input
                className="inp"
                {...fieldAria('faq-order', show('displayOrder'))}
                inputMode="numeric"
                value={values.displayOrder}
                maxLength={4}
                autoComplete="off"
                onChange={(e) => set('displayOrder', digitsKeystroke(e.target.value, 4))}
                onBlur={() => touch('displayOrder')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="faq-status" label="Status" hint="Only active questions are shown on the public FAQ page.">
                <select
                  className="inp"
                  id="faq-status"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => set('isActive', e.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </MasterField>
            )}
          </div>
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}

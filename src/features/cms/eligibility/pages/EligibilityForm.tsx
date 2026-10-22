import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { digitsKeystroke, isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { ELIGIBILITY_ITEM_FIELDS, KIND_LABEL, type EligibilityItemField, type EligibilityKind } from '../types/eligibility.types';
import {
  LABEL_MAX,
  VALUE_MAX,
  emptyEligibilityItemForm,
  labelName,
  normalizeEligibilityItemForm,
  validateEligibilityItemForm,
  type EligibilityItemFormValues,
} from '../validation/eligibility.validation';

interface EligibilityFormProps {
  /* Set on Edit; Create starts from an empty form of initialKind. */
  initial?: EligibilityItemFormValues;
  /* Create only: the type the form opens with (from ?kind=). */
  initialKind?: EligibilityKind;
  /* Create only: told when the Type select changes, so the page title can follow it. */
  onKindChange?: (kind: EligibilityKind) => void;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeEligibilityItemForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-eligibility-form';

/*
 * The backend reports "body.label.mr"; the form keys its messages "label.mr". The value-by-type rule
 * names the whole pair ("body.value" on a 422, "value" on a 400), so it lands on the Marathi half,
 * which is shown first.
 */
function mapServerErrors(err: ApiError): FieldErrors<EligibilityItemField> {
  const mapped: FieldErrors<EligibilityItemField> = {};
  for (const detail of err.details) {
    let key = (detail.field ?? '').replace(/^body\./, '');
    if (key === 'label' || key === 'value') key = `${key}.mr`;
    if ((ELIGIBILITY_ITEM_FIELDS as readonly string[]).includes(key) && !mapped[key as EligibilityItemField]) {
      mapped[key as EligibilityItemField] = detail.message;
    }
  }
  return mapped;
}

/*
 * The eligibility criterion / required document create and edit form, on its own page (no modal).
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it
 * has been touched, blocks a double submit, keeps the entered values when a save fails, and shows the
 * server's field messages against the matching input.
 *
 * The type decides the shape: a criterion is a label plus a value, a document is a label only. It can
 * be switched while adding; once saved it is fixed, as on the server.
 */
export default function EligibilityForm({
  initial,
  initialKind,
  onKindChange,
  submitLabel,
  onSave,
  backTo,
  confirmMessage,
  statusSlot,
}: EligibilityFormProps) {
  const [values, setValues] = useState<EligibilityItemFormValues>(initial ?? emptyEligibilityItemForm(initialKind));
  const [touched, setTouched] = useState<Partial<Record<EligibilityItemField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<EligibilityItemField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const editing = Boolean(initial);
  const isCriterion = values.kind === 'CRITERION';
  const name = labelName(values.kind);

  /* Editing an existing item keeps its place, so the order cannot be blanked there. */
  const local = validateEligibilityItemForm(values, { orderRequired: editing });
  const show = (f: EligibilityItemField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: EligibilityItemField) => setTouched((t) => ({ ...t, [f]: true }));

  const clearServer = (prefixes: string[]) =>
    setServerErrors((e) => {
      const next = { ...e };
      for (const f of ELIGIBILITY_ITEM_FIELDS) if (prefixes.some((p) => f === p || f.startsWith(`${p}.`))) delete next[f];
      return next;
    });

  const set = <K extends keyof EligibilityItemFormValues>(key: K, value: EligibilityItemFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    clearServer([key]);
  };

  /*
   * Switching to a document hides the value rather than wiping it, so switching back by mistake does
   * not lose what was typed; a document never sends it. The server's messages about the label and the
   * value were about the other type, so they go too.
   */
  const changeKind = (kind: EligibilityKind) => {
    setValues((v) => ({ ...v, kind }));
    setDirty(true);
    clearServer(['kind', 'label', 'value']);
    onKindChange?.(kind);
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
      await onSave(normalizeEligibilityItemForm(values));
      setDirty(false);
    } catch (err) {
      /* A 422 (or the service's 400 on the value rule) carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
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
          <div className="grid g2">
            {editing ? (
              <MasterField
                id="elig-kind"
                label="Type"
                hint="The type cannot be changed. To move an item to the other list, delete it and add it again there."
              >
                <div className="f ac gp8" id="elig-kind" style={{ minHeight: 36 }}>
                  <span className="tag">{KIND_LABEL[values.kind]}</span>
                </div>
              </MasterField>
            ) : (
              <MasterField
                id="elig-kind"
                label="Type"
                required
                error={show('kind')}
                hint="A criterion is a label with a requirement next to it; a document is one line of the checklist."
              >
                <select
                  className="inp"
                  {...fieldAria('elig-kind', show('kind'))}
                  value={values.kind}
                  onChange={(e) => changeKind(e.target.value as EligibilityKind)}
                >
                  <option value="CRITERION">Eligibility criterion</option>
                  <option value="DOCUMENT">Required document</option>
                </select>
              </MasterField>
            )}
          </div>

          <BilingualField
            id="elig-label"
            label={name}
            value={values.label}
            maxLength={LABEL_MAX}
            onChange={(next) => set('label', next)}
            onBlur={(half) => touch(`label.${half}`)}
            errorMr={show('label.mr')}
            errorEn={show('label.en')}
            hint={
              isCriterion
                ? `The heading of the row in the criteria card, e.g. "Age". Up to ${LABEL_MAX} characters in each language.`
                : `One line of the required-documents checklist. Up to ${LABEL_MAX} characters in each language.`
            }
          />

          {isCriterion ? (
            <BilingualField
              id="elig-value"
              label="Value"
              multiline
              value={values.value}
              maxLength={VALUE_MAX}
              onChange={(next) => set('value', next)}
              onBlur={(half) => touch(`value.${half}`)}
              errorMr={show('value.mr')}
              errorEn={show('value.en')}
              hint={`The requirement shown next to the criterion, e.g. "18 to 45 years". Up to ${VALUE_MAX} characters in each language.`}
            />
          ) : null}

          <div className="grid g2">
            <MasterField
              id="elig-order"
              label="Display Order"
              required={editing}
              error={show('displayOrder')}
              hint={
                editing
                  ? `Lower numbers are listed first among the ${isCriterion ? 'criteria' : 'documents'}.`
                  : 'Lower numbers are listed first. Leave empty to add it at the end of its list.'
              }
            >
              <input
                className="inp"
                {...fieldAria('elig-order', show('displayOrder'))}
                inputMode="numeric"
                value={values.displayOrder}
                maxLength={4}
                autoComplete="off"
                onChange={(e) => set('displayOrder', digitsKeystroke(e.target.value, 4))}
                onBlur={() => touch('displayOrder')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="elig-status" label="Status" hint="Only active items are shown on the public Eligibility page.">
                <select
                  className="inp"
                  id="elig-status"
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

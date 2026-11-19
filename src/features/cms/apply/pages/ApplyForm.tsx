import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { digitsKeystroke, isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError } from '../../shared';
import { APPLY_ITEM_FIELDS, KIND_LABEL, type ApplyItemField, type ApplyKind } from '../types/apply.types';
import {
  LABEL_MAX,
  VALUE_MAX,
  emptyApplyItemForm,
  labelName,
  normalizeApplyItemForm,
  validateApplyItemForm,
  valueName,
  type ApplyItemFormValues,
} from '../validation/apply.validation';

interface ApplyFormProps {
  /* Set on Edit; Create starts from an empty form of initialKind. */
  initial?: ApplyItemFormValues;
  /* Create only: the type the form opens with (from ?kind=). */
  initialKind?: ApplyKind;
  /* Create only: told when the Type select changes, so the page title can follow it. */
  onKindChange?: (kind: ApplyKind) => void;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: ReturnType<typeof normalizeApplyItemForm>) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-apply-form';

/*
 * The backend reports "body.label.mr"; the form keys its messages "label.mr". A rule that names the
 * whole pair ("body.label") lands on the Marathi half, which is shown first.
 */
function mapServerErrors(err: ApiError): FieldErrors<ApplyItemField> {
  const mapped: FieldErrors<ApplyItemField> = {};
  for (const detail of err.details) {
    let key = (detail.field ?? '').replace(/^body\./, '');
    if (key === 'label' || key === 'value') key = `${key}.mr`;
    if ((APPLY_ITEM_FIELDS as readonly string[]).includes(key) && !mapped[key as ApplyItemField]) {
      mapped[key as ApplyItemField] = detail.message;
    }
  }
  return mapped;
}

/*
 * The application step / information row create and edit form, on its own page (no modal).
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it
 * has been touched, blocks a double submit, keeps the entered values when a save fails, and shows the
 * server's field messages against the matching input.
 *
 * Both types are a label plus a value — a step's title and description, a fact's label and value — so
 * the type only changes what the fields are called. It can be switched while adding; once saved it is
 * fixed, as on the server.
 */
export default function ApplyForm({
  initial,
  initialKind,
  onKindChange,
  submitLabel,
  onSave,
  backTo,
  confirmMessage,
  statusSlot,
}: ApplyFormProps) {
  const [values, setValues] = useState<ApplyItemFormValues>(initial ?? emptyApplyItemForm(initialKind));
  const [touched, setTouched] = useState<Partial<Record<ApplyItemField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ApplyItemField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const editing = Boolean(initial);
  const isStep = values.kind === 'STEP';

  /* Editing an existing item keeps its place, so the order cannot be blanked there. */
  const local = validateApplyItemForm(values, { orderRequired: editing });
  const show = (f: ApplyItemField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: ApplyItemField) => setTouched((t) => ({ ...t, [f]: true }));

  const clearServer = (prefixes: string[]) =>
    setServerErrors((e) => {
      const next = { ...e };
      for (const f of APPLY_ITEM_FIELDS) if (prefixes.some((p) => f === p || f.startsWith(`${p}.`))) delete next[f];
      return next;
    });

  const set = <K extends keyof ApplyItemFormValues>(key: K, value: ApplyItemFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    clearServer([key]);
  };

  /*
   * Switching the type keeps what was typed — both types have a label and a value. The server's
   * messages about the label and the value named them for the other type, so they go.
   */
  const changeKind = (kind: ApplyKind) => {
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
      await onSave(normalizeApplyItemForm(values));
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
          <div className="grid g2">
            {editing ? (
              <MasterField
                id="apply-kind"
                label="Type"
                hint="The type cannot be changed. To move an item to the other list, delete it and add it again there."
              >
                <div className="f ac gp8" id="apply-kind" style={{ minHeight: 36 }}>
                  <span className="tag">{KIND_LABEL[values.kind]}</span>
                </div>
              </MasterField>
            ) : (
              <MasterField
                id="apply-kind"
                label="Type"
                required
                error={show('kind')}
                hint={
                  'A step is one numbered stage of the application; a "For Your Information" row is a label with a value in the "For Your Information" card.'
                }
              >
                <select
                  className="inp"
                  {...fieldAria('apply-kind', show('kind'))}
                  value={values.kind}
                  onChange={(e) => changeKind(e.target.value as ApplyKind)}
                >
                  <option value="STEP">Application step</option>
                  <option value="FACT">Information row</option>
                </select>
              </MasterField>
            )}
          </div>

          <BilingualField
            id="apply-label"
            label={labelName(values.kind)}
            value={values.label}
            maxLength={LABEL_MAX}
            onChange={(next) => set('label', next)}
            onBlur={(half) => touch(`label.${half}`)}
            errorMr={show('label.mr')}
            errorEn={show('label.en')}
            hint={
              isStep
                ? `The heading of the step, e.g. "Online application". Up to ${LABEL_MAX} characters in each language.`
                : `The label of the row in the "For Your Information" card, e.g. "Security deposit". Up to ${LABEL_MAX} characters in each language.`
            }
          />

          <BilingualField
            id="apply-value"
            label={valueName(values.kind)}
            multiline
            value={values.value}
            maxLength={VALUE_MAX}
            onChange={(next) => set('value', next)}
            onBlur={(half) => touch(`value.${half}`)}
            errorMr={show('value.mr')}
            errorEn={show('value.en')}
            hint={
              isStep
                ? `What happens at this step, shown under its title. Line breaks are kept. Up to ${VALUE_MAX} characters in each language.`
                : `The value shown next to the label, e.g. "₹2,000 (refundable)". Up to ${VALUE_MAX} characters in each language.`
            }
          />

          <div className="grid g2">
            <MasterField
              id="apply-order"
              label="Display Order"
              required={editing}
              error={show('displayOrder')}
              hint={
                editing
                  ? `Lower numbers are listed first among the ${isStep ? 'steps' : 'information rows'}.`
                  : 'Lower numbers are listed first. Leave empty to add it at the end of its list.'
              }
            >
              <input
                className="inp"
                {...fieldAria('apply-order', show('displayOrder'))}
                inputMode="numeric"
                value={values.displayOrder}
                maxLength={4}
                autoComplete="off"
                onChange={(e) => set('displayOrder', digitsKeystroke(e.target.value, 4))}
                onBlur={() => touch('displayOrder')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="apply-status" label="Status" hint="Only active items are shown on the public Apply page.">
                <select
                  className="inp"
                  id="apply-status"
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

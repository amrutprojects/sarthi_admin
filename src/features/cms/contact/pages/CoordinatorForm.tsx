import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import MultiSelectList from '../../../lms/components/MultiSelectList';
import { digitsKeystroke, isValid, type FieldErrors } from '../../validation';
import { ConfirmModal, toastError, useApiData } from '../../shared';
import { contactService } from '../services/contactService';
import { useDistrictOptions } from '../services/districtOptions';
import { COORDINATOR_FIELDS, type CoordinatorField, type CreateCoordinatorInput, type DistrictRef } from '../types/contact.types';
import {
  COORDINATOR_NAME_MAX,
  emptyCoordinatorForm,
  normalizeCoordinatorForm,
  validateCoordinatorForm,
  type CoordinatorFormValues,
} from '../validation/contact.validation';

interface CoordinatorFormProps {
  initial?: CoordinatorFormValues;
  /* Edit: the coordinator being changed, whose own districts stay on offer. */
  coordinatorId?: string;
  submitLabel: string;
  /* The caller saves and navigates; this component only reports. */
  onSave: (values: CreateCoordinatorInput) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Show on website select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-contact-coordinator-form';

/*
 * The backend reports "body.name" on a 422 and "districtIds" on the 409 / 400 of the district rules
 * ("body.districtIds.0" for one malformed id); the form keys its messages by the field alone.
 */
function mapServerErrors(err: ApiError): FieldErrors<CoordinatorField> {
  const mapped: FieldErrors<CoordinatorField> = {};
  for (const detail of err.details) {
    const key = (detail.field ?? '').replace(/^body\./, '').split('.')[0] as CoordinatorField;
    if ((COORDINATOR_FIELDS as readonly string[]).includes(key) && !mapped[key]) mapped[key] = detail.message;
  }
  return mapped;
}

/*
 * The district / cluster coordinator create and edit form, on its own page (no modal).
 *
 * Same behaviour as the other CMS master forms: validates on submit and re-validates a field once it
 * has been touched, blocks a double submit, keeps the entered values when a save fails, and shows the
 * server's field messages — including a district another coordinator took meanwhile (409) — against
 * the matching input.
 *
 * A district can be covered by one coordinator only (the backend enforces the same rule). The picker lists
 * every district of the District Master. One another coordinator covers can still be ticked: it is marked
 * with that coordinator's name, and saving asks for confirmation and then moves it here (moveDistricts).
 */
export default function CoordinatorForm({
  initial,
  coordinatorId,
  submitLabel,
  onSave,
  backTo,
  confirmMessage,
  statusSlot,
}: CoordinatorFormProps) {
  const [values, setValues] = useState<CoordinatorFormValues>(initial ?? emptyCoordinatorForm());
  const [touched, setTouched] = useState<Partial<Record<CoordinatorField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<CoordinatorField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const districts = useDistrictOptions();
  const coordinators = useApiData(() => contactService.allCoordinators(), []);

  /* Editing an existing coordinator keeps its place, so the order cannot be blanked there. */
  const local = validateCoordinatorForm(values, { orderRequired: Boolean(initial) });
  const show = (f: CoordinatorField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: CoordinatorField) => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof CoordinatorFormValues>(key: K, value: CoordinatorFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    /* The server names the district list "districtIds". */
    const field = key === 'districts' ? 'districtIds' : key;
    setServerErrors((e) => {
      const next = { ...e };
      delete next[field as CoordinatorField];
      return next;
    });
  };

  const all = useMemo(() => districts.data ?? [], [districts.data]);
  const byId = useMemo(() => new Map(all.map((d) => [d.id, d])), [all]);
  /* Districts covered by another coordinator (district id -> that coordinator's name); this one cannot take them. */
  const takenElsewhere = useMemo(
    () =>
      new Map(
        (coordinators.data ?? [])
          .filter((c) => c.id !== coordinatorId)
          .flatMap((c) => c.districts.map((d): [string, string] => [d.id, c.name])),
      ),
    [coordinators.data, coordinatorId],
  );
  /* Every district of the District Master is listed; one another coordinator covers says who has it now. */
  const options = all.map((d) => {
    const holder = takenElsewhere.get(d.id);
    return { id: d.id, label: d.name, sub: d.code, group: d.state, note: holder ? `now with ${holder}` : null };
  });
  /* The ticked districts that would be taken from another coordinator by this save. */
  const moving = values.districts.filter((d) => takenElsewhere.has(d.id));

  /*
   * The website lists a coordinator's districts in the saved order (lead district first), so ticking
   * or unticking keeps the existing order and appends newly ticked districts at the end.
   */
  const pickDistricts = (ids: string[]) => {
    const kept = values.districts.filter((d) => ids.includes(d.id));
    const added = ids
      .filter((id) => !kept.some((d) => d.id === id))
      .map((id) => byId.get(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map(({ id, name, code }): DistrictRef => ({ id, name, code }));
    set('districts', [...kept, ...added]);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (!isValid(local)) return;
    if (confirmMessage || moving.length) {
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
      await onSave({ ...normalizeCoordinatorForm(values), ...(moving.length ? { moveDistricts: true } : {}) });
      setDirty(false);
    } catch (err) {
      /* A 422, or the 409 / 400 of the district rules, carries per-field messages; show them on the fields and skip the toast. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 409 || err.status === 400) && err.details.length) {
        const mapped = mapServerErrors(err);
        setServerErrors(mapped);
        if (!isValid(mapped)) {
          /* Another coordinator may have taken a district meanwhile: show the picker as it is now. */
          if (mapped.districtIds) void coordinators.reload();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const loadError = districts.error ?? coordinators.error;

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          <div className="grid g3">
            <MasterField id="co-name" label="Name" required error={show('name')}>
              <input
                className="inp"
                {...fieldAria('co-name', show('name'))}
                maxLength={COORDINATOR_NAME_MAX}
                autoComplete="off"
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => touch('name')}
              />
            </MasterField>
            <MasterField id="co-phone" label="Phone" required error={show('phone')} hint="For example +91 98765 41201. X may mask a digit.">
              <input
                className="inp"
                {...fieldAria('co-phone', show('phone'))}
                type="tel"
                maxLength={32}
                autoComplete="off"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => touch('phone')}
              />
            </MasterField>
            <MasterField id="co-email" label="Email" error={show('email')} hint="Optional.">
              <input
                className="inp"
                {...fieldAria('co-email', show('email'))}
                type="email"
                maxLength={255}
                autoComplete="off"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
            </MasterField>
          </div>

          <div className="mt10">
            <MultiSelectList
              id="co-districts"
              label="Districts covered"
              noun="districts"
              options={options}
              saved={values.districts.map((d) => ({ id: d.id, label: d.name, sub: d.code }))}
              value={values.districts.map((d) => d.id)}
              onChange={pickDistricts}
              loading={districts.loading || coordinators.loading}
              error={loadError?.message ?? null}
              onRetry={() => {
                if (districts.error) void districts.reload();
                if (coordinators.error) void coordinators.reload();
              }}
              emptyMsg="No districts available. Add them in the District Master first."
              hint="Listed on the website in the order ticked, lead district first. A district marked “now with …” can be ticked too: saving moves it from that coordinator to this one, after you confirm."
              fieldError={show('districtIds')}
            />
          </div>

          <div className="grid g2">
            <MasterField
              id="co-order"
              label="Display Order"
              required={Boolean(initial)}
              error={show('displayOrder')}
              hint={
                initial
                  ? 'Lower numbers are shown first on the Contact page.'
                  : 'Lower numbers are shown first. Leave empty to add the coordinator at the end.'
              }
            >
              <input
                className="inp"
                {...fieldAria('co-order', show('displayOrder'))}
                inputMode="numeric"
                value={values.displayOrder}
                maxLength={3}
                autoComplete="off"
                onChange={(e) => set('displayOrder', digitsKeystroke(e.target.value, 3))}
                onBlur={() => touch('displayOrder')}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="co-active" label="Show on website" hint="Hidden coordinators are kept here but not shown on the public Contact page.">
                <select
                  className="inp"
                  id="co-active"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => set('isActive', e.target.value === 'true')}
                >
                  <option value="true">Visible</option>
                  <option value="false">Hidden</option>
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
          message={
            moving.length
              ? `${moving.length === 1 ? 'This district is' : `These ${moving.length} districts are`} covered by another coordinator. Saving takes ${moving.length === 1 ? 'it' : 'them'} from that coordinator and gives ${moving.length === 1 ? 'it' : 'them'} to this one.`
              : (confirmMessage ?? '')
          }
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        >
          {moving.length ? (
            <ul className="fs13" style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 180, overflowY: 'auto' }}>
              {moving.map((d) => (
                <li key={d.id}>
                  {d.name} — now with {takenElsewhere.get(d.id)}
                </li>
              ))}
            </ul>
          ) : null}
        </ConfirmModal>
      ) : null}
    </div>
  );
}

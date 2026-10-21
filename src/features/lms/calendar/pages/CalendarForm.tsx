import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, useApiData } from '../../../cms/shared';
import { lmsOptions } from '../../options';
import { WEEKDAYS, WEEKDAY_SHORT, sortWeekdays, type CalendarRef, type Weekday } from '../types/calendar.types';
import {
  MAX_HOLIDAYS, calendarFormSchema, calendarServerErrors, normalizeCalendarForm, type CalendarFormValues, type CalendarPayload,
} from '../validation/calendar.validation';
import { addDays, isIsoDate, periodStats, weekdayOf } from '../validation/calendarDates';

interface CalendarFormProps {
  initial: CalendarFormValues;
  /* Edit: the entity is fixed after creation, so it is shown, not chosen. */
  fixedEntity?: CalendarRef | null;
  /* Edit: the saved exception centre, kept selectable even when it is no longer enabled or active. */
  savedCentre?: CalendarRef | null;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: CalendarPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-calendar-form';

const PRESETS: { l: string; days: Weekday[] }[] = [
  { l: 'Mon–Fri', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
  { l: 'Mon–Sat', days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
];

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

/*
 * The Academic Calendar create / edit form (F-LMS-05 Table 30), on its own page: entity, optional exception
 * centre, name, period, working days and the holiday list. React Hook Form + Zod with the backend's rules:
 * validates on submit and once a field is touched, blocks double submits, keeps entered values after a failed
 * save, and puts the server's field answers (409 name / overlap, 400 centre / holiday outside the period)
 * on the matching control.
 */
export default function CalendarForm({ initial, fixedEntity, savedCentre, submitLabel, onSave, backTo, confirmMessage, statusSlot }: CalendarFormProps) {
  const {
    control, register, handleSubmit, setValue, setError, trigger, getValues, getFieldState, watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CalendarFormValues>({ resolver: zodResolver(calendarFormSchema), defaultValues: initial, mode: 'onTouched' });
  const holidays = useFieldArray({ control, name: 'holidays' });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<CalendarFormValues | null>(null);
  const [serverSummary, setServerSummary] = useState<string | null>(null);

  const entityId = watch('entityId');
  const validFrom = watch('validFrom');
  const validTo = watch('validTo');
  const workingDays = watch('workingDays');
  const holidayRows = watch('holidays');

  /* Create: active entities (contract E1). Edit: the entity is fixed. */
  const entities = useApiData(() => (fixedEntity ? Promise.resolve([]) : lmsOptions.entities()), []);
  /* The active centres enabled for the chosen entity (F-LMS-05-03), the only ones the server accepts. */
  const centres = useApiData(() => (entityId ? lmsOptions.centres(entityId) : Promise.resolve(null)), [entityId]);

  /* A rule that spans fields (period, holidays inside it) is re-checked when either end changes. */
  const revalidatePeriod = () => {
    const targets: FieldPath<CalendarFormValues>[] = [];
    if (isSubmitted || getFieldState('validTo').isTouched) targets.push('validTo');
    if (getValues('holidays').length && (isSubmitted || getFieldState('holidays').isTouched)) targets.push('holidays');
    if (targets.length) void trigger(targets);
  };

  const setDays = (days: Weekday[]) =>
    setValue('workingDays', sortWeekdays(days), { shouldDirty: true, shouldTouch: true, shouldValidate: true });

  const sortHolidays = () => {
    holidays.replace([...getValues('holidays')].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')));
    if (isSubmitted) void trigger('holidays');
  };

  const submit = handleSubmit((values) => {
    if (busy) return;
    if (confirmMessage) {
      setConfirming(values);
      return;
    }
    return save(values);
  });

  async function save(values: CalendarFormValues) {
    setConfirming(null);
    setBusy(true);
    setServerSummary(null);
    try {
      await onSave(normalizeCalendarForm(values));
    } catch (err) {
      /* Field-level answers (422 validation, 400 bad reference / holiday outside the period, 409 name / overlap) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = calendarServerErrors(err.details);
        if (mapped.length) {
          mapped.forEach(({ path, message }) => setError(path, { type: 'server', message }));
          setServerSummary(err.message);
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const feed = centres.data;
  /* The saved centre stays visible as itself while the list loads, and when the list no longer offers it. */
  const extraCentre =
    savedCentre && entityId === initial.entityId && !(feed ?? []).some((c) => c.id === savedCentre.id) ? savedCentre : null;
  const centreHint = !entityId
    ? 'Select an entity first.'
    : centres.loading
      ? 'Loading the centres enabled for the entity…'
      : !feed
        ? undefined
        : feed.length
          ? `Leave "All centres" for the entity-wide calendar, or choose one of the ${feed.length} centres enabled for the entity for a centre exception calendar.`
          : 'No active centre is enabled for this entity, so only an entity-wide calendar is possible. Centres are enabled in the Entity Master.';

  const stats = periodStats(validFrom, validTo, workingDays, holidayRows.map((h) => h.date));
  const holidayError = errors.holidays?.message ?? errors.holidays?.root?.message;

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {serverSummary ? (
            <div className="callout c-err mb14" role="alert">
              <div>
                <b>Not saved. </b>
                {serverSummary}
              </div>
            </div>
          ) : null}

          <h3 className="fs13" style={{ margin: '0 0 10px' }}>Calendar</h3>
          <div className="grid g2">
            {fixedEntity ? (
              <MasterField id="lc-entity" label="Entity" required error={errors.entityId?.message} hint="The entity cannot be changed after the calendar is created.">
                <select className="inp" {...fieldAria('lc-entity', errors.entityId?.message)} value={initial.entityId} disabled>
                  <option value={initial.entityId}>
                    {fixedEntity.name} ({fixedEntity.code}){fixedEntity.isActive ? '' : ' (inactive)'}
                  </option>
                </select>
              </MasterField>
            ) : (
              <MasterField
                id="lc-entity"
                label="Entity"
                required
                error={errors.entityId?.message}
                hint={
                  entities.data && !entities.data.length
                    ? 'No active entity exists yet. Create one in the Entity Master first.'
                    : 'The learning environment this calendar belongs to. It cannot be changed later.'
                }
              >
                <Controller
                  control={control}
                  name="entityId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('lc-entity', errors.entityId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={entities.loading || !!entities.error}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        /* The centre list belongs to the entity: a new entity starts from "All centres". */
                        setValue('centreId', '', { shouldDirty: true });
                      }}
                    >
                      <option value="">{entities.loading ? 'Loading entities…' : 'Select an entity'}</option>
                      {(entities.data ?? []).map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                      ))}
                      {field.value && !entities.loading && !(entities.data ?? []).some((e) => e.id === field.value) ? (
                        <option value={field.value}>Selected entity (inactive)</option>
                      ) : null}
                    </select>
                  )}
                />
                {entities.error ? (
                  <div className="callout c-err mt8" role="alert">
                    <div>
                      <b>Could not load the entities. </b>
                      {entities.error.fullMessage}{' '}
                      <button type="button" className="btn xs" onClick={() => void entities.reload()}>Retry</button>
                    </div>
                  </div>
                ) : null}
              </MasterField>
            )}

            <MasterField id="lc-centre" label="Centre" error={errors.centreId?.message} hint={centreHint}>
              <Controller
                control={control}
                name="centreId"
                render={({ field }) => (
                  <select
                    className="inp"
                    {...fieldAria('lc-centre', errors.centreId?.message)}
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    disabled={!entityId || !!centres.error}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">All centres (entity-wide calendar)</option>
                    {(feed ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.code ? ` (${c.code})` : ''}
                        {c.districtName ? ` · ${c.districtName}` : ''}
                      </option>
                    ))}
                    {extraCentre ? (
                      <option value={extraCentre.id}>
                        {extraCentre.name} ({extraCentre.code}){feed ? (extraCentre.isActive ? ' (no longer enabled for the entity)' : ' (inactive)') : ''}
                      </option>
                    ) : null}
                  </select>
                )}
              />
              {centres.error ? (
                <div className="callout c-err mt8" role="alert">
                  <div>
                    <b>Could not load the centres. </b>
                    {centres.error.fullMessage}{' '}
                    <button type="button" className="btn xs" onClick={() => void centres.reload()}>Retry</button>
                  </div>
                </div>
              ) : null}
            </MasterField>

            <MasterField id="lc-name" label="Calendar Name" required error={errors.name?.message} hint="For example Academic Year 2026-27. 3 to 80 characters, unique within the entity.">
              <input className="inp" {...fieldAria('lc-name', errors.name?.message)} maxLength={80} autoComplete="off" {...register('name')} />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="lc-status" label="Status" hint="An active calendar is offered to the other LMS screens.">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <select className="inp" id="lc-status" ref={field.ref} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  )}
                />
              </MasterField>
            )}
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 10px' }}>Period and working days</h3>
          <div className="grid g2">
            <MasterField id="lc-from" label="Valid From" required error={errors.validFrom?.message} hint="First day of the calendar.">
              <input type="date" className="inp" {...fieldAria('lc-from', errors.validFrom?.message)} {...register('validFrom', { onChange: revalidatePeriod })} />
            </MasterField>
            <MasterField
              id="lc-to"
              label="Valid To"
              required
              error={errors.validTo?.message}
              hint={
                stats
                  ? `${stats.days} days in the period · ${stats.teachingDays} teaching days (working days less holidays). It must not overlap another calendar of the same entity and centre.`
                  : 'Last day of the calendar, after the start date. It must not overlap another calendar of the same entity and centre.'
              }
            >
              <input
                type="date"
                className="inp"
                {...fieldAria('lc-to', errors.validTo?.message)}
                min={isIsoDate(validFrom) ? addDays(validFrom, 1) : undefined}
                {...register('validTo', { onChange: revalidatePeriod })}
              />
            </MasterField>
          </div>

          <div className="fld">
            <label id="lc-days-label">
              Working Days<span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>
            </label>
            <div
              role="group"
              aria-labelledby="lc-days-label"
              aria-describedby={errors.workingDays ? 'lc-days-error' : undefined}
              className="f ac wrap"
              style={{ gap: '6px 14px' }}
            >
              {WEEKDAYS.map((d) => (
                <label key={d.code} htmlFor={`lc-day-${d.code}`} className="f ac gp4" style={{ cursor: 'pointer' }}>
                  <input
                    id={`lc-day-${d.code}`}
                    type="checkbox"
                    checked={workingDays.includes(d.code)}
                    onChange={(e) => setDays(e.target.checked ? [...workingDays, d.code] : workingDays.filter((x) => x !== d.code))}
                  />
                  <span className="fs13">{d.label}</span>
                </label>
              ))}
            </div>
            <div className="f ac gp8 wrap mt8">
              {PRESETS.map((p) => (
                <button key={p.l} type="button" className="btn xs" onClick={() => setDays(p.days)}>{p.l}</button>
              ))}
              <button type="button" className="btn xs" disabled={!workingDays.length} onClick={() => setDays([])}>Clear</button>
            </div>
            {errorLine('lc-days-error', errors.workingDays?.message) ?? (
              <div className="hint">Days on which sessions can be scheduled. No day is assumed: choose at least one.</div>
            )}
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 4px' }} id="lc-holidays-label">Holidays</h3>
          <p className="muted fs12" style={{ margin: '0 0 10px' }}>
            One row per holiday: a date inside the period (one holiday per date) and a name of 2 to 80 characters. Saving replaces the
            calendar's whole holiday list.
          </p>
          <div className="tbl-wrap">
            <table className="tbl" aria-labelledby="lc-holidays-label">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Sr. No.</th>
                  <th style={{ width: 190 }}>Date</th>
                  <th>Holiday Name</th>
                  <th style={{ width: 150 }}>Day</th>
                  <th style={{ width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.fields.map((f, i) => {
                  const dateErr = errors.holidays?.[i]?.date?.message;
                  const nameErr = errors.holidays?.[i]?.name?.message;
                  const date = holidayRows[i]?.date ?? '';
                  const offDay = isIsoDate(date) && workingDays.length > 0 && !workingDays.includes(weekdayOf(date));
                  return (
                    <tr key={f.id} className="norow">
                      <td className="muted fs12">{i + 1}</td>
                      <td>
                        <input
                          type="date"
                          className="inp sm"
                          aria-label={`Holiday ${i + 1} date`}
                          aria-invalid={dateErr ? true : undefined}
                          aria-describedby={dateErr ? `lc-h${i}-date-error` : undefined}
                          min={isIsoDate(validFrom) ? validFrom : undefined}
                          max={isIsoDate(validTo) ? validTo : undefined}
                          {...register(`holidays.${i}.date`)}
                        />
                        {errorLine(`lc-h${i}-date-error`, dateErr)}
                      </td>
                      <td>
                        <input
                          className="inp sm"
                          aria-label={`Holiday ${i + 1} name`}
                          aria-invalid={nameErr ? true : undefined}
                          aria-describedby={nameErr ? `lc-h${i}-name-error` : undefined}
                          maxLength={80}
                          autoComplete="off"
                          {...register(`holidays.${i}.name`)}
                        />
                        {errorLine(`lc-h${i}-name-error`, nameErr)}
                      </td>
                      <td className="fs12">
                        {isIsoDate(date) ? WEEKDAY_SHORT[weekdayOf(date)] : <span className="muted">—</span>}
                        {offDay ? <span className="muted"> · not a working day</span> : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn xs"
                          title="Remove"
                          aria-label={`Remove holiday ${i + 1}`}
                          style={{ color: 'var(--red)' }}
                          onClick={() => holidays.remove(i)}
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!holidays.fields.length ? (
                  <tr className="norow">
                    <td colSpan={5} className="muted fs12">No holidays yet. Use Add holiday to list the days off within the period.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="f ac gp8 wrap mt8">
            <button
              type="button"
              className="btn sm"
              disabled={holidays.fields.length >= MAX_HOLIDAYS}
              onClick={() => holidays.append({ date: '', name: '' }, { focusName: `holidays.${holidays.fields.length}.date` })}
            >
              <Icon name="plus" />Add holiday
            </button>
            <button type="button" className="btn sm" disabled={holidays.fields.length < 2} onClick={sortHolidays}>Sort by date</button>
            <span className="muted fs12" aria-live="polite">
              {holidays.fields.length} {holidays.fields.length === 1 ? 'holiday' : 'holidays'}
            </span>
          </div>
          {errorLine('lc-holidays-error', holidayError)}
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={isDirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setConfirming(null)}
          onConfirm={() => void save(confirming)}
        />
      ) : null}
    </div>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, useApiData } from '../../../cms/shared';
import { deliveryText, fmtHours, moduleLabel, oftShare, oftText, releaseLabel } from '../components/format';
import { lmsOptions } from '../../options';
import { courseLabel, courseModuleService } from '../services/courseModuleService';
import { MODULE_NUMBERS, type ModuleCourseSummary } from '../types/courseModule.types';
import {
  DELIVERY_PATTERNS, DELIVERY_PATTERN_LABELS, courseModuleFormSchema, courseModuleServerErrors, coreHoursChanged, missingForRelease,
  parseCourseModuleForm, prescribedFormValues, usesLecture, usesSessions, type CourseModuleFormContext, type CourseModuleFormValues,
} from '../validation/courseModule.validation';

interface CourseModuleFormProps {
  mode: 'create' | 'edit';
  initial: CourseModuleFormValues;
  /* Edit: the saved core hours — changing them needs a reason (F-LMS-07-04). */
  savedCoreHours?: number | null;
  /* Edit: course and module number are fixed after creation, so they are shown, not chosen. */
  fixedCourse?: ModuleCourseSummary | null;
  submitLabel: string;
  /* Resolves when the record was saved. The caller builds the request and navigates; this component only reports. */
  onSave: (values: CourseModuleFormValues) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-course-module-form';

/* Fields read by a cross-field rule: a change to one re-checks the others the user has already met. */
const HOUR_GROUP = ['coreHours', 'syllabusRef', 'sessions', 'sessionHours', 'lectureHours', 'practicalHours', 'oftHoursMin', 'oftHoursMax', 'reason'] as const;

const h3 = (text: string, first = false) => <h3 className="fs13" style={{ margin: first ? '0 0 10px' : '14px 0 10px' }}>{text}</h3>;

/*
 * The Module create / edit form (F-LMS-07 Table 32), on its own page. React Hook Form + Zod with the backend's
 * rules: validates on submit and once a field is touched, re-checks the cross-field rules (sessions × session
 * hours = core hours, lecture + practical = core hours, OFT 0 < min ≤ max, syllabus reference with core hours,
 * reason for a core-hours change) as related fields change, blocks double submits, keeps entered values after a
 * failed save, and puts the server's field answers (422 / 400 / 409) on the matching control.
 */
export default function CourseModuleForm({
  mode, initial, savedCoreHours = null, fixedCourse, submitLabel, onSave, backTo, confirmMessage, statusSlot,
}: CourseModuleFormProps) {
  const ctx = useMemo<CourseModuleFormContext>(() => ({ mode, savedCoreHours }), [mode, savedCoreHours]);
  const schema = useMemo(() => courseModuleFormSchema(ctx), [ctx]);
  const {
    control, register, handleSubmit, setValue, setError, trigger, getFieldState, watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CourseModuleFormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<CourseModuleFormValues | null>(null);
  const [serverSummary, setServerSummary] = useState<string | null>(null);

  const values = watch();
  const { courseId, moduleNumber, deliveryPattern } = values;

  /* Create: the active courses (lmsOptions.courses) and the modules the chosen course already has. */
  const courses = useApiData(() => (mode === 'create' ? lmsOptions.courses() : Promise.resolve([])), [mode]);
  const existing = useApiData(() => (mode === 'create' && courseId ? courseModuleService.forCourse(courseId) : Promise.resolve(null)), [mode, courseId]);
  const prescribed = useApiData(() => courseModuleService.prescribed(), []);

  const revalidateGroup = () => {
    const targets = HOUR_GROUP.filter((f) => isSubmitted || getFieldState(f).isTouched);
    if (targets.length) void trigger(targets);
  };

  const submit = handleSubmit((v) => {
    if (busy) return;
    if (confirmMessage) {
      setConfirming(v);
      return;
    }
    return save(v);
  });

  async function save(v: CourseModuleFormValues) {
    setConfirming(null);
    setBusy(true);
    setServerSummary(null);
    try {
      await onSave(v);
    } catch (err) {
      /* Field-level answers (422 validation, 400 hours / course, 409 module already exists) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = courseModuleServerErrors(err.details);
        if (mapped.length) {
          mapped.forEach(({ field, message }) => setError(field, { type: 'server', message }, { shouldFocus: true }));
          setServerSummary(err.message);
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const prescribedModule = prescribed.data?.modules.find((p) => String(p.moduleNumber) === moduleNumber) ?? null;
  const applyPrescribed = () => {
    if (!prescribedModule) return;
    for (const [key, value] of Object.entries(prescribedFormValues(prescribedModule))) {
      setValue(key as keyof CourseModuleFormValues, value as never, { shouldDirty: true, shouldTouch: true });
    }
    void trigger(['title', ...HOUR_GROUP]);
  };

  /* Live sums for the delivery pattern and the OFT share, from the values that parse. */
  const parsed = parseCourseModuleForm(values, ctx).value;
  const missing = missingForRelease(parsed);
  const sessionsTotal = parsed.sessions !== null && parsed.sessionHours !== null ? parsed.sessions * parsed.sessionHours : null;
  const lectureTotal = parsed.lectureHours !== null && parsed.practicalHours !== null ? parsed.lectureHours + parsed.practicalHours : null;
  const sumHint = (total: number | null, what: string) =>
    total === null
      ? `${what} must add up to the core hours.`
      : parsed.coreHours === null
        ? `${what}: ${fmtHours(total)}. Enter the core hours too.`
        : Math.round(total * 100) === Math.round(parsed.coreHours * 100)
          ? `${what}: ${fmtHours(total)}, equal to the core hours.`
          : `${what}: ${fmtHours(total)}, but the core hours are ${fmtHours(parsed.coreHours)}.`;
  const reasonNeeded = coreHoursChanged(values, ctx);

  const taken = new Set((existing.data ?? []).map((m) => m.moduleNumber));
  const courseList = courses.data ?? [];
  const selectedCourseMissing = !!courseId && !courses.loading && !courseList.some((c) => c.id === courseId);

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

          {h3('Module', true)}
          <div className="grid g2">
            {fixedCourse !== undefined ? (
              <MasterField id="cm-course" label="Course" required hint="The course cannot be changed after the module is created.">
                <select className="inp" id="cm-course" value={initial.courseId} disabled>
                  <option value={initial.courseId}>{fixedCourse ? courseLabel(fixedCourse) : 'Unknown course'}</option>
                </select>
              </MasterField>
            ) : (
              <MasterField
                id="cm-course"
                label="Course"
                required
                error={errors.courseId?.message}
                hint={
                  courses.error
                    ? undefined
                    : courses.data && !courses.data.length
                      ? 'No active course exists yet. Create one in the Course Master first.'
                      : 'The course this module belongs to. It cannot be changed later.'
                }
              >
                {/* Controlled: the options arrive after the form, and a prefilled course (?courseId=) must stay selected. */}
                <Controller
                  control={control}
                  name="courseId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('cm-course', errors.courseId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={courses.loading || !!courses.error}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">{courses.loading ? 'Loading courses…' : 'Select a course'}</option>
                      {courseList.map((c) => (
                        <option key={c.id} value={c.id}>{courseLabel(c)}</option>
                      ))}
                      {selectedCourseMissing ? <option value={courseId}>Selected course (inactive or retired)</option> : null}
                    </select>
                  )}
                />
                {courses.error ? (
                  <div className="hint" style={{ color: 'var(--red)' }}>
                    Could not load the courses ({courses.error.message}).{' '}
                    <button type="button" className="btn xs" onClick={() => void courses.reload()}>Retry</button>
                  </div>
                ) : null}
              </MasterField>
            )}

            {mode === 'edit' ? (
              <MasterField id="cm-number" label="Module Number" required hint="The module number cannot be changed after the module is created.">
                <select className="inp" id="cm-number" value={initial.moduleNumber} disabled>
                  <option value={initial.moduleNumber}>{moduleLabel(Number(initial.moduleNumber))}</option>
                </select>
              </MasterField>
            ) : (
              <MasterField
                id="cm-number"
                label="Module Number"
                required
                error={errors.moduleNumber?.message}
                hint={
                  courseId && existing.data
                    ? taken.size
                      ? `The course already has ${[...taken].sort((a, b) => a - b).map(moduleLabel).join(', ')}. A course has one module of each number.`
                      : 'The course has no module yet.'
                    : 'One of the four programme modules, 1 to 4. It cannot be changed later.'
                }
              >
                <select className="inp" {...fieldAria('cm-number', errors.moduleNumber?.message)} {...register('moduleNumber')}>
                  <option value="">Select module 1, 2, 3 or 4</option>
                  {MODULE_NUMBERS.map((n) => (
                    <option key={n} value={String(n)} disabled={taken.has(n) && String(n) !== moduleNumber}>
                      {moduleLabel(n)}{taken.has(n) ? ' (already exists)' : ''}
                    </option>
                  ))}
                </select>
              </MasterField>
            )}

            <MasterField id="cm-title" label="Module Title" required error={errors.title?.message} hint="Plain text, 3 to 160 characters, for example Basic Information Technology Skills.">
              <input className="inp" {...fieldAria('cm-title', errors.title?.message)} maxLength={200} autoComplete="off" {...register('title')} />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="cm-status" label="Status" hint="A new module is created as a draft; an active one is offered to the other LMS masters at once.">
                <select
                  className="inp"
                  id="cm-status"
                  value={values.isActive ? 'true' : 'false'}
                  onChange={(e) => setValue('isActive', e.target.value === 'true', { shouldDirty: true })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </MasterField>
            )}
          </div>

          <MasterField
            id="cm-description"
            label="Description"
            error={errors.description?.message}
            hint="Optional. Description and learning outcomes, up to 3,000 characters. Plain text, or paragraphs, bold, italic, lists and https links."
          >
            <textarea className="inp" {...fieldAria('cm-description', errors.description?.message)} rows={4} {...register('description')} />
          </MasterField>

          {prescribedModule ? (
            <div className="callout c-info mb14">
              <div>
                <b>Prescribed values for {moduleLabel(prescribedModule.moduleNumber)}: </b>
                {prescribedModule.title} · {fmtHours(prescribedModule.coreHours)} core · {deliveryText(prescribedModule)} · OFT {oftText(prescribedModule)}
                {prescribed.data?.confirmedByCompetentAuthority ? '' : ' (draft values awaiting approval, OQ-012)'}.{' '}
                <button type="button" className="btn xs" onClick={applyPrescribed}>Use the prescribed values</button>
              </div>
            </div>
          ) : prescribed.error ? (
            <div className="callout c-warn mb14">
              <div>
                The prescribed values could not be loaded ({prescribed.error.message}).{' '}
                <button type="button" className="btn xs" onClick={() => void prescribed.reload()}>Retry</button>
              </div>
            </div>
          ) : null}

          {h3('Core hours and syllabus reference')}
          <div className="grid g2">
            <MasterField
              id="cm-core"
              label="Core Hours"
              error={errors.coreHours?.message}
              hint="Required before release. Hours greater than 0, at most 2 decimals. OFT hours are separate and never deducted."
            >
              <input className="inp" inputMode="decimal" {...fieldAria('cm-core', errors.coreHours?.message)} autoComplete="off" {...register('coreHours', { onChange: revalidateGroup })} />
            </MasterField>
            <MasterField
              id="cm-syllabus"
              label="Syllabus Reference"
              required={parsed.coreHours !== null}
              error={errors.syllabusRef?.message}
              hint="Document and version the values come from, up to 120 characters. Required with core hours."
            >
              <input className="inp" {...fieldAria('cm-syllabus', errors.syllabusRef?.message)} maxLength={120} autoComplete="off" {...register('syllabusRef', { onChange: revalidateGroup })} />
            </MasterField>
            {reasonNeeded ? (
              <MasterField
                id="cm-reason"
                label="Reason for the Change"
                required
                error={errors.reason?.message}
                hint={`The core hours change from ${fmtHours(savedCoreHours)} to ${fmtHours(parsed.coreHours)}. The reason is kept in the audit record (up to 500 characters).`}
              >
                <textarea className="inp" {...fieldAria('cm-reason', errors.reason?.message)} rows={2} maxLength={500} {...register('reason')} />
              </MasterField>
            ) : null}
          </div>

          {h3('Delivery pattern')}
          <div className="grid g2">
            <MasterField
              id="cm-pattern"
              label="Delivery Pattern"
              hint="Required before release. Each pair entered must add up to the core hours; a pair not in the pattern is saved empty."
            >
              <select className="inp" id="cm-pattern" {...register('deliveryPattern', { onChange: revalidateGroup })}>
                {DELIVERY_PATTERNS.map((p) => (
                  <option key={p} value={p}>{DELIVERY_PATTERN_LABELS[p]}</option>
                ))}
              </select>
            </MasterField>
          </div>
          {usesSessions(deliveryPattern) ? (
            <div className="grid g2">
              <MasterField id="cm-sessions" label="Number of Sessions" required error={errors.sessions?.message} hint={sumHint(sessionsTotal, 'Sessions × session hours')}>
                <input className="inp" inputMode="numeric" {...fieldAria('cm-sessions', errors.sessions?.message)} autoComplete="off" {...register('sessions', { onChange: revalidateGroup })} />
              </MasterField>
              <MasterField id="cm-session-hours" label="Session Hours" required error={errors.sessionHours?.message} hint="Whole hours per session, for example 2.">
                <input className="inp" inputMode="numeric" {...fieldAria('cm-session-hours', errors.sessionHours?.message)} autoComplete="off" {...register('sessionHours', { onChange: revalidateGroup })} />
              </MasterField>
            </div>
          ) : null}
          {usesLecture(deliveryPattern) ? (
            <div className="grid g2">
              <MasterField id="cm-lecture" label="Lecture Hours" required error={errors.lectureHours?.message} hint={sumHint(lectureTotal, 'Lecture + practical hours')}>
                <input className="inp" inputMode="decimal" {...fieldAria('cm-lecture', errors.lectureHours?.message)} autoComplete="off" {...register('lectureHours', { onChange: revalidateGroup })} />
              </MasterField>
              <MasterField id="cm-practical" label="Practical Hours" required error={errors.practicalHours?.message} hint="Hours greater than 0, at most 2 decimals.">
                <input className="inp" inputMode="decimal" {...fieldAria('cm-practical', errors.practicalHours?.message)} autoComplete="off" {...register('practicalHours', { onChange: revalidateGroup })} />
              </MasterField>
            </div>
          ) : null}

          {h3('OFT hours')}
          <div className="grid g2">
            <MasterField
              id="cm-oft-min"
              label="OFT Hours (Minimum)"
              error={errors.oftHoursMin?.message}
              hint={oftShare(parsed) ?? 'Required before release. Greater than 0 and not above the maximum; additional to the core hours.'}
            >
              <input className="inp" inputMode="decimal" {...fieldAria('cm-oft-min', errors.oftHoursMin?.message)} autoComplete="off" {...register('oftHoursMin', { onChange: revalidateGroup })} />
            </MasterField>
            <MasterField id="cm-oft-max" label="OFT Hours (Maximum)" error={errors.oftHoursMax?.message} hint="Enter both ends of the range, or neither.">
              <input className="inp" inputMode="decimal" {...fieldAria('cm-oft-max', errors.oftHoursMax?.message)} autoComplete="off" {...register('oftHoursMax', { onChange: revalidateGroup })} />
            </MasterField>
          </div>

          <div className={'callout ' + (missing.length ? 'c-info' : 'c-ok')} role="status" style={{ marginTop: 6 }}>
            <div>
              {missing.length ? (
                <>
                  <b>Can be saved, not released yet. </b>Still empty and required before release: {missing.map(releaseLabel).join('; ')}.
                </>
              ) : (
                <b>Every field required before release is filled.</b>
              )}
            </div>
          </div>
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

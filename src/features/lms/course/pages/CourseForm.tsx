import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, useApiData } from '../../../cms/shared';
import { codeKeystroke } from '../../../cms/validation';
import { lmsOptions } from '../../options';
import CourseStatusBadge from '../components/CourseStatusBadge';
import { courseService } from '../services/courseService';
import {
  COURSE_CODE_MAX, COURSE_DESCRIPTION_MAX, COURSE_STATUS_LABELS, COURSE_TITLE_MAX, type ApiLmsCourseDetail, type CourseLanguage,
} from '../types/course.types';
import {
  codeLockReason, courseFormSchema, courseServerErrors, isCodeLocked, normalizeCourseForm, type CourseFormValues, type CoursePayload,
} from '../validation/course.validation';

interface CourseFormProps {
  initial: CourseFormValues;
  /* Edit: the saved course. The entity is fixed, the code is locked unless DRAFT, the lifecycle and release are shown. */
  course?: ApiLmsCourseDetail;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: CoursePayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Active / Inactive select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-course-form';

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

/*
 * The Course create / edit form (F-LMS-06 Table 31), on its own page: entity, code, title, description and
 * languages; the lifecycle status and content release are read-only (system-set). React Hook Form + Zod with
 * the backend's rules: validates on submit and once a field is touched, blocks double submits, keeps entered
 * values after a failed save, and puts the server's field answers (409 duplicate / locked code, 400 inactive
 * entity or languages not enabled for the entity) on the matching control.
 */
export default function CourseForm({ initial, course, submitLabel, onSave, backTo, confirmMessage, statusSlot }: CourseFormProps) {
  const codeLocked = !!course && isCodeLocked(course.status);

  /* Create: active entities (contract E1). Edit: the entity is fixed (F-LMS-06-03). */
  const entities = useApiData(() => (course ? Promise.resolve([]) : lmsOptions.entities()), []);

  const [entityId, setEntityId] = useState(initial.entityId);
  /* The languages the chosen entity allows (F-LMS-06-05, GET /lms/courses/languages), tagged with the entity they were read for. */
  const feed = useApiData(async () => (entityId ? { entityId, ...(await courseService.languages(entityId)) } : null), [entityId]);
  /* Only the chosen entity's list counts: the previous entity's is never offered while the new one loads. */
  const languageFeed = feed.data && feed.data.entityId === entityId ? feed.data : null;
  const feedLoading = feed.loading || (!!entityId && !languageFeed && !feed.error);

  const [selected, setSelected] = useState<string[]>(initial.languages);
  /* What the checklist offers: the feed, plus any selected code it does not list (kept visible as itself). */
  const offered: (CourseLanguage & { extra?: boolean })[] = useMemo(() => {
    const list = feedLoading ? [] : (languageFeed?.languages ?? []);
    const extra = selected.filter((c) => !list.some((l) => l.code === c)).map((code) => ({ code, label: code, extra: true }));
    return [...list, ...extra];
  }, [feedLoading, languageFeed, selected]);
  /* At least one language whenever the list is there (it always holds the default); without it the server uses the default. */
  const requireLanguages = !!course || offered.length > 0;
  const schema = useMemo(() => courseFormSchema({ requireLanguages }), [requireLanguages]);

  const {
    control, register, handleSubmit, setValue, setError, getValues, watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CourseFormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<CourseFormValues | null>(null);
  const [serverSummary, setServerSummary] = useState<string | null>(null);

  const description = watch('description');

  const setLanguages = (codes: string[], touch = true) => {
    setSelected(codes);
    setValue('languages', codes, { shouldDirty: touch, shouldTouch: touch, shouldValidate: touch || isSubmitted });
  };

  /* A new course starts with the entity's default language (the server's default), once the entity's list is read. */
  const defaultLanguage = languageFeed?.defaultLanguage ?? null;
  useEffect(() => {
    if (!course && defaultLanguage && getValues('languages').length === 0) setLanguages([defaultLanguage], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageFeed]);

  const toggleLanguage = (code: string, on: boolean) => {
    const current = getValues('languages');
    /* Kept in the offered order, so an unchanged list is sent exactly as saved. */
    setLanguages(offered.map((l) => l.code).filter((c) => (c === code ? on : current.includes(c))));
  };

  const submit = handleSubmit((values) => {
    if (busy) return;
    if (confirmMessage) {
      setConfirming(values);
      return;
    }
    return save(values);
  });

  async function save(values: CourseFormValues) {
    setConfirming(null);
    setBusy(true);
    setServerSummary(null);
    try {
      await onSave(normalizeCourseForm(values));
    } catch (err) {
      /* Field-level answers (422 validation, 400 inactive entity / languages, 409 duplicate or locked code) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = courseServerErrors(err.details);
        if (mapped.length) {
          mapped.forEach(({ field, message }) => setError(field, { type: 'server', message }));
          setServerSummary(err.message);
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const languagesHint = (() => {
    if (!entityId) return 'Select an entity first: a course uses the languages enabled for its entity.';
    if (feedLoading) return 'Loading the languages of the entity…';
    if (!languageFeed) return undefined;
    return course
      ? 'The languages enabled for the entity (Branding and Settings). At least one.'
      : "The languages enabled for the entity (Branding and Settings). At least one; the entity's default language is selected for a new course.";
  })();

  const descriptionLength = description.trim().length;

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

          <h3 className="fs13" style={{ margin: '0 0 10px' }}>Course</h3>
          <div className="grid g2">
            {course ? (
              <MasterField id="lco-entity" label="Entity" required hint="The entity cannot be changed after the course is created.">
                <select className="inp" id="lco-entity" value={initial.entityId} disabled>
                  <option value={initial.entityId}>{course.entity ? `${course.entity.name} (${course.entity.code})` : 'Unknown entity'}</option>
                </select>
              </MasterField>
            ) : (
              <MasterField
                id="lco-entity"
                label="Entity"
                required
                error={errors.entityId?.message}
                hint={
                  entities.data && !entities.data.length
                    ? 'No active entity exists yet. Create one in the Entity Master first.'
                    : 'The LMS entity that owns the course. It cannot be changed later.'
                }
              >
                <Controller
                  control={control}
                  name="entityId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('lco-entity', errors.entityId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={entities.loading || !!entities.error}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setEntityId(e.target.value);
                        /* The language list belongs to the entity: a new entity starts from its own default. */
                        setLanguages([], false);
                      }}
                    >
                      <option value="">{entities.loading ? 'Loading entities…' : 'Select an entity'}</option>
                      {(entities.data ?? []).map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.code ? ` (${e.code})` : ''}
                        </option>
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

            <MasterField
              id="lco-code"
              label="Course Code"
              required
              error={errors.code?.message}
              hint={
                course && codeLocked
                  ? codeLockReason(course.status)
                  : `Stable identifier, 2 to ${COURSE_CODE_MAX} characters: capital letters, digits and hyphens. Unique; frozen once the course is in a published release.`
              }
            >
              <Controller
                control={control}
                name="code"
                render={({ field }) => (
                  <input
                    className="inp mono"
                    {...fieldAria('lco-code', errors.code?.message)}
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    maxLength={COURSE_CODE_MAX}
                    autoComplete="off"
                    disabled={codeLocked}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(codeKeystroke(e.target.value, true))}
                  />
                )}
              />
            </MasterField>

            <MasterField id="lco-title" label="Course Title" required error={errors.title?.message} hint="The course name in the default language. 3 to 120 characters.">
              <input className="inp" {...fieldAria('lco-title', errors.title?.message)} maxLength={COURSE_TITLE_MAX} autoComplete="off" {...register('title')} />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="lco-active" label="Status" hint="An active course is offered to the Module and Track Variant masters.">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <select className="inp" id="lco-active" ref={field.ref} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  )}
                />
              </MasterField>
            )}
          </div>

          <MasterField
            id="lco-description"
            label="Description"
            error={errors.description?.message}
            hint={
              <>
                Optional, up to {COURSE_DESCRIPTION_MAX.toLocaleString('en-IN')} characters ({descriptionLength.toLocaleString('en-IN')} used). Plain
                text, or basic markup only: &lt;p&gt;, &lt;br&gt;, &lt;strong&gt; / &lt;b&gt;, &lt;em&gt; / &lt;i&gt;, &lt;u&gt;, &lt;ul&gt; /
                &lt;ol&gt; / &lt;li&gt; and links &lt;a href=&quot;https://…&quot;&gt;, without other attributes. Scripts, styles and other tags
                are refused.
              </>
            }
          >
            <textarea className="inp" {...fieldAria('lco-description', errors.description?.message)} rows={5} {...register('description')} />
          </MasterField>

          <div className="fld">
            <label id="lco-languages-label">
              Languages{requireLanguages ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
            </label>
            <div
              role="group"
              aria-labelledby="lco-languages-label"
              aria-describedby={errors.languages?.message ? 'lco-languages-error' : undefined}
              className="f ac wrap"
              style={{ gap: '6px 14px', minHeight: 24 }}
            >
              {offered.map((l) => (
                <label key={l.code} htmlFor={`lco-lang-${l.code}`} className="f ac gp4" style={{ cursor: 'pointer' }}>
                  <input
                    id={`lco-lang-${l.code}`}
                    type="checkbox"
                    checked={selected.includes(l.code)}
                    onChange={(e) => toggleLanguage(l.code, e.target.checked)}
                  />
                  <span className="fs13">
                    {l.label === l.code ? <span className="mono">{l.code}</span> : `${l.label} (${l.code})`}
                    {l.extra && languageFeed ? <span className="muted fs12"> · no longer enabled for the entity</span> : null}
                    {l.code === defaultLanguage ? <span className="muted fs12"> · default</span> : null}
                  </span>
                </label>
              ))}
            </div>
            {feed.error ? (
              <div className="callout c-err mt8" role="alert">
                <div>
                  <b>Could not load the languages of the entity. </b>
                  {feed.error.fullMessage}{' '}
                  <button type="button" className="btn xs" onClick={() => void feed.reload()}>Retry</button>
                </div>
              </div>
            ) : null}
            {errorLine('lco-languages-error', errors.languages?.message) ?? (languagesHint ? <div className="hint">{languagesHint}</div> : null)}
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 4px' }}>Lifecycle and content release</h3>
          <p className="muted fs12" style={{ margin: '0 0 10px' }}>
            Set by the system, not on this form: a course is Draft when created, Published by its first published content release and
            Retired by the Retire action.
          </p>
          <div className="grid g2">
            <div className="fld">
              <label>Course Status</label>
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <CourseStatusBadge status={course?.status ?? 'DRAFT'} />
                {course ? null : <span className="muted fs12">{COURSE_STATUS_LABELS.DRAFT} on creation</span>}
              </div>
            </div>
            <MasterField id="lco-release-no" label="Latest Published Release" hint="Read-only. Content releases (L-30) are not built in this system yet.">
              <input className="inp" id="lco-release-no" readOnly value={course?.publishedReleaseNo != null ? `Release ${course.publishedReleaseNo}` : 'None yet'} />
            </MasterField>
            <MasterField id="lco-release-id" label="Release Record" hint="Read-only. Set when a content release is published.">
              <input className="inp mono" id="lco-release-id" readOnly value={course?.publishedReleaseId ?? '—'} />
            </MasterField>
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

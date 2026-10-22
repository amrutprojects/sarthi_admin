import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, useApiData } from '../../../cms/shared';
import { trackVariantService } from '../services/trackVariantService';
import type { ApiTrackVariant, TrackVariantFormOptions } from '../types/trackVariant.types';
import { RICH_TEXT_HINT } from '../validation/richText';
import { trackVariantFormSchema, trackVariantServerErrors, type TrackVariantFormValues } from '../validation/trackVariant.validation';

interface TrackVariantFormProps {
  mode: 'create' | 'edit';
  initial: TrackVariantFormValues;
  /* The Module 3 shape (per-track count ranges) from GET /lms/track-variants/form-options. */
  formOptions: TrackVariantFormOptions;
  /* Edit: the variant — its course, module and track are fixed after creation, so they are shown, not chosen. */
  variant?: ApiTrackVariant;
  submitLabel: string;
  /* Resolves when the record was saved. The caller builds the payload and navigates; this component only reports. */
  onSave: (values: TrackVariantFormValues) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-track-variant-form';

const loadError = (what: string, error: ApiError | null, retry: () => void) =>
  error ? (
    <div className="callout c-err mt8" role="alert">
      <div>
        <b>Could not load the {what}. </b>
        {error.fullMessage}{' '}
        <button type="button" className="btn xs" onClick={retry}>Retry</button>
      </div>
    </div>
  ) : null;

const range = (r: { min: number; max: number }) => Array.from({ length: r.max - r.min + 1 }, (_, i) => String(r.min + i));

/*
 * The Track Variant create / edit form (L-07, F-LMS-07-01 / -03 / -09), on its own page. Create picks the course,
 * then its Module 3, then a technology track enabled for the course's entity; the module and track are fixed
 * afterwards. Both edit the per-track counts from the syllabus, the syllabus reference and the description.
 * React Hook Form + Zod with the backend's rules; the server's field answers (409 "A variant for this track already
 * exists.", 400 track not enabled / module not Module 3) land on the matching control.
 */
export default function TrackVariantForm({
  mode, initial, formOptions, variant, submitLabel, onSave, backTo, confirmMessage, statusSlot,
}: TrackVariantFormProps) {
  const schema = useMemo(() => trackVariantFormSchema(formOptions.shape, mode), [formOptions.shape, mode]);
  const {
    control, register, handleSubmit, setValue, setError, watch,
    formState: { errors, isDirty },
  } = useForm<TrackVariantFormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<TrackVariantFormValues | null>(null);
  const [serverSummary, setServerSummary] = useState<string | null>(null);

  const creating = mode === 'create';
  const courseId = watch('courseId');
  const courseModuleId = watch('courseModuleId');

  /* Create: active courses → the course's Module 3 → the tracks enabled for its entity, less those already used. */
  const courses = useApiData(() => (creating ? trackVariantService.courseOptions() : Promise.resolve(null)), []);
  const course = courses.data?.find((c) => c.id === courseId);
  const modules = useApiData(() => (creating && courseId ? trackVariantService.moduleThreeOptions(courseId) : Promise.resolve(null)), [courseId]);
  const tracks = useApiData(() => (creating && course ? trackVariantService.tracksForEntity(course.entityId) : Promise.resolve(null)), [course?.entityId]);
  const existing = useApiData(
    () => (creating && courseModuleId ? trackVariantService.variantsOfModule(courseModuleId) : Promise.resolve(null)),
    [courseModuleId],
  );
  const taken = new Set((existing.data ?? []).map((v) => v.trackId));

  /* A course has at most one Module 3: choose it at once. */
  const onlyModule = modules.data?.length === 1 ? modules.data[0].id : null;
  useEffect(() => {
    if (onlyModule && !courseModuleId) setValue('courseModuleId', onlyModule, { shouldDirty: true, shouldValidate: true });
  }, [onlyModule, courseModuleId, setValue]);

  const submit = handleSubmit((values) => {
    if (busy) return;
    if (confirmMessage) {
      setConfirming(values);
      return;
    }
    return save(values);
  });

  async function save(values: TrackVariantFormValues) {
    setConfirming(null);
    setBusy(true);
    setServerSummary(null);
    try {
      await onSave(values);
    } catch (err) {
      /* Field-level answers (422 validation, 400 bad reference, 409 duplicate track) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = trackVariantServerErrors(err.details);
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

  const moduleHint = !courseId
    ? 'Select a course first.'
    : modules.loading
      ? 'Loading the course’s Module 3…'
      : modules.data && !modules.data.length
        ? 'This course has no active Module 3 yet. Add it in the Module Master first.'
        : 'Track variants belong to Module 3 of the course. It cannot be changed later.';
  const trackHint = !courseId
    ? 'Select a course first.'
    : tracks.loading
      ? 'Loading the tracks enabled for the course’s entity…'
      : tracks.data && !tracks.data.length
        ? 'No active technology track is enabled for this course’s entity. Tracks are enabled in the Entity Master.'
        : 'Only the active tracks enabled for the course’s entity are offered; a track that already has a variant of this module is marked. It cannot be changed later.';

  const countOptions = (r: { min: number; max: number }) => (
    <>
      <option value="">Not entered yet</option>
      {range(r).map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </>
  );

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

          <h3 className="fs13" style={{ margin: '0 0 10px' }}>Module and track</h3>
          {creating ? (
            <div className="grid g2">
              <MasterField
                id="tv-course"
                label="Course"
                required
                error={errors.courseId?.message}
                hint={
                  courses.data && !courses.data.length
                    ? 'No active course exists yet. Create one in the Course Master first.'
                    : 'The course whose Module 3 this variant belongs to.'
                }
              >
                <Controller
                  control={control}
                  name="courseId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('tv-course', errors.courseId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={courses.loading || !!courses.error}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        /* The module and the tracks belong to the course: a new course starts them again. */
                        setValue('courseModuleId', '', { shouldDirty: true });
                        setValue('trackId', '', { shouldDirty: true });
                      }}
                    >
                      <option value="">{courses.loading ? 'Loading courses…' : 'Select a course'}</option>
                      {(courses.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.code} · {c.title}</option>
                      ))}
                    </select>
                  )}
                />
                {loadError('courses', courses.error, () => void courses.reload())}
              </MasterField>

              <MasterField id="tv-module" label="Module 3" required error={errors.courseModuleId?.message} hint={moduleHint}>
                <Controller
                  control={control}
                  name="courseModuleId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('tv-module', errors.courseModuleId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={!courseId || modules.loading || !!modules.error}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setValue('trackId', '', { shouldDirty: true });
                      }}
                    >
                      <option value="">{courseId && modules.loading ? 'Loading…' : 'Select the Module 3'}</option>
                      {(modules.data ?? []).map((m) => (
                        <option key={m.id} value={m.id}>Module {m.moduleNumber} · {m.title}</option>
                      ))}
                    </select>
                  )}
                />
                {loadError('modules', modules.error, () => void modules.reload())}
              </MasterField>

              <MasterField id="tv-track" label="Technology Track" required error={errors.trackId?.message} hint={trackHint}>
                {/* Controlled: a disabled registered input would drop out of the values and lose its message. */}
                <Controller
                  control={control}
                  name="trackId"
                  render={({ field }) => (
                    <select
                      className="inp"
                      {...fieldAria('tv-track', errors.trackId?.message)}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      disabled={!courseId || tracks.loading || !!tracks.error}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">{courseId && tracks.loading ? 'Loading…' : 'Select a track'}</option>
                      {(tracks.data ?? []).map((t) => (
                        <option key={t.id} value={t.id} disabled={taken.has(t.id)}>
                          {t.code ? `${t.code} · ` : ''}{t.name}{taken.has(t.id) ? ' (variant exists)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {loadError('tracks', tracks.error, () => void tracks.reload())}
                {loadError('existing variants of the module', existing.error, () => void existing.reload())}
              </MasterField>

              {statusSlot ?? (
                <MasterField id="tv-status" label="Status" hint="A new variant is a draft. An active one is offered to the screens that pick a variant once published.">
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <select className="inp" id="tv-status" ref={field.ref} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    )}
                  />
                </MasterField>
              )}
            </div>
          ) : variant ? (
            <div className="grid g2">
              <MasterField id="tv-course" label="Course" hint="Fixed: the module and track of a variant are chosen on creation.">
                <select className="inp" id="tv-course" value={variant.course.id} disabled>
                  <option value={variant.course.id}>{variant.course.code} · {variant.course.title}</option>
                </select>
              </MasterField>
              <MasterField id="tv-module" label="Module 3">
                <select className="inp" id="tv-module" value={variant.courseModuleId} disabled>
                  <option value={variant.courseModuleId}>Module {variant.courseModule.moduleNumber} · {variant.courseModule.title}</option>
                </select>
              </MasterField>
              <MasterField id="tv-track" label="Technology Track" hint={variant.track.isActive ? undefined : 'This track has been deactivated in the Admin Panel; the variant is kept.'}>
                <select className="inp" id="tv-track" value={variant.trackId} disabled>
                  <option value={variant.trackId}>{variant.track.code} · {variant.track.name}{variant.track.isActive ? '' : ' (inactive)'}</option>
                </select>
              </MasterField>
              {statusSlot}
            </div>
          ) : null}

          <h3 className="fs13" style={{ margin: '14px 0 10px' }}>From the track syllabus</h3>
          <div className="grid g2">
            <MasterField
              id="tv-expected-modules"
              label="Track Modules (count)"
              error={errors.expectedTrackModules?.message}
              hint={`${formOptions.shape.trackModules.min} or ${formOptions.shape.trackModules.max}, as the track syllabus states. Until it is entered the variant is incomplete.`}
            >
              <select className="inp" {...fieldAria('tv-expected-modules', errors.expectedTrackModules?.message)} {...register('expectedTrackModules')}>
                {countOptions(formOptions.shape.trackModules)}
              </select>
            </MasterField>
            <MasterField
              id="tv-expected-oft"
              label="OFT Cards (count)"
              error={errors.expectedOftCards?.message}
              hint={`${formOptions.shape.oftCards.min} or ${formOptions.shape.oftCards.max}, as the track syllabus states. Until it is entered the variant is incomplete.`}
            >
              <select className="inp" {...fieldAria('tv-expected-oft', errors.expectedOftCards?.message)} {...register('expectedOftCards')}>
                {countOptions(formOptions.shape.oftCards)}
              </select>
            </MasterField>
            <MasterField id="tv-syllabus" label="Syllabus Reference" error={errors.syllabusReference?.message} hint="Optional: the syllabus document and version, up to 120 characters.">
              <input className="inp" {...fieldAria('tv-syllabus', errors.syllabusReference?.message)} maxLength={120} autoComplete="off" {...register('syllabusReference')} />
            </MasterField>
          </div>
          <MasterField id="tv-description" label="Description" error={errors.description?.message} hint={`Optional, up to 3,000 characters. ${RICH_TEXT_HINT}`}>
            <textarea className="inp" rows={4} maxLength={3000} {...fieldAria('tv-description', errors.description?.message)} {...register('description')} />
          </MasterField>
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

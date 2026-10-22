import { useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { toastError, toastOk, useApiData } from '../../../cms/shared';
import type { CourseOption } from '../../options';
import { courseLabel, courseModuleService } from '../services/courseModuleService';
import { MODULE_NUMBERS, type PrescribedModulesResult } from '../types/courseModule.types';
import { COURSE_MESSAGE, prescribedSyllabusRefRule } from '../validation/courseModule.validation';

interface CreatePrescribedDialogProps {
  /* Active, not retired courses (lmsOptions.courses). null while loading. */
  courses: CourseOption[] | null;
  /* The course the listing is filtered by, preselected. */
  initialCourseId: string;
  onClose: () => void;
  onDone: (result: PrescribedModulesResult) => void;
}

type Errors = { courseId?: string; syllabusRef?: string };

const numbers = (ns: number[]) => (ns.length === 1 ? `module ${ns[0]}` : `modules ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

/*
 * "Create missing prescribed modules" (POST /lms/course-modules/prescribed { courseId, syllabusRef }).
 * The prescribed modules carry core hours, so the syllabus reference is required (F-LMS-07-05). Two steps:
 * the course and the reference, then a confirmation naming what will be created.
 */
export default function CreatePrescribedDialog({ courses, initialCourseId, onClose, onDone }: CreatePrescribedDialogProps) {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [syllabusRef, setSyllabusRef] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [busy, setBusy] = useState(false);

  /* The modules the course already has, so the dialog can say which ones will be created. */
  const existing = useApiData(() => (courseId ? courseModuleService.forCourse(courseId) : Promise.resolve(null)), [courseId]);
  const present = new Set((existing.data ?? []).map((m) => m.moduleNumber));
  const missing = MODULE_NUMBERS.filter((n) => !present.has(n));
  const complete = !!existing.data && missing.length === 0;

  const course = courses?.find((c) => c.id === courseId);
  const courseName = course ? courseLabel(course) : 'the selected course';

  const validate = (): Errors => {
    const ref = prescribedSyllabusRefRule.safeParse(syllabusRef);
    return { courseId: courseId ? undefined : COURSE_MESSAGE, syllabusRef: ref.success ? undefined : ref.error.issues[0]?.message };
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (!found.courseId && !found.syllabusRef) setStep('confirm');
  };

  async function create() {
    setBusy(true);
    try {
      const result = await courseModuleService.createPrescribed({ courseId, syllabusRef: syllabusRef.trim() });
      toastOk(result.created.length ? `Created ${numbers(result.created)} with the prescribed values` : result.message);
      onDone(result);
    } catch (err) {
      /* 422 (syllabus reference) and 400 (course inactive, retired or deleted) name a field: back to the form, next to it. */
      if (err instanceof ApiError && err.details.length) {
        const found: Errors = {};
        for (const d of err.details) {
          const name = (d.field ?? '').split('.').pop();
          if ((name === 'courseId' || name === 'syllabusRef') && !found[name]) found[name] = d.message;
        }
        if (found.courseId || found.syllabusRef) {
          setErrors(found);
          setStep('form');
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const courseHint = !courseId
    ? 'The prescribed modules the course does not have yet are created, as drafts.'
    : existing.loading
      ? 'Checking the modules of the course…'
      : existing.error
        ? `Could not read the modules of the course (${existing.error.message}). The server still creates only the missing ones.`
        : complete
          ? 'This course already has its four modules: nothing would be created.'
          : present.size
            ? `The course has ${numbers([...present].sort((a, b) => a - b))}; ${numbers(missing)} will be created.`
            : 'The course has no module yet: modules 1 to 4 will be created.';

  return (
    <Modal
      title={step === 'form' ? 'Create missing prescribed modules' : 'Confirm: create prescribed modules'}
      onClose={busy ? () => undefined : onClose}
      footer={
        step === 'form' ? (
          <>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" form="cm-prescribed-form" className="btn primary" disabled={complete}>Continue</button>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={busy} onClick={() => setStep('form')}>Back</button>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void create()}>
              {busy ? 'Creating…' : 'Yes, create modules'}
            </button>
          </>
        )
      }
    >
      {step === 'form' ? (
        <form id="cm-prescribed-form" onSubmit={next} noValidate>
          <MasterField id="cm-pr-course" label="Course" required error={errors.courseId} hint={courseHint}>
            <select
              className="inp"
              {...fieldAria('cm-pr-course', errors.courseId)}
              value={courseId}
              disabled={!courses}
              onChange={(e) => {
                setCourseId(e.target.value);
                setErrors((x) => ({ ...x, courseId: undefined }));
              }}
            >
              <option value="">{courses ? 'Select a course' : 'Loading courses…'}</option>
              {(courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>{courseLabel(c)}</option>
              ))}
              {courseId && courses && !course ? <option value={courseId}>Selected course (inactive or retired)</option> : null}
            </select>
          </MasterField>
          <MasterField
            id="cm-pr-ref"
            label="Syllabus Reference"
            required
            error={errors.syllabusRef}
            hint="Document and version the values come from, stored on every module created (required with core hours). Up to 120 characters."
          >
            <input
              className="inp"
              {...fieldAria('cm-pr-ref', errors.syllabusRef)}
              value={syllabusRef}
              maxLength={120}
              autoComplete="off"
              onChange={(e) => {
                setSyllabusRef(e.target.value);
                setErrors((x) => ({ ...x, syllabusRef: undefined }));
              }}
            />
          </MasterField>
        </form>
      ) : (
        <p style={{ margin: 0 }}>
          Create {existing.data ? numbers(missing) : 'the missing modules'} of {courseName} with the prescribed values of the final syllabus documents
          and the syllabus reference “{syllabusRef.trim()}”? Each is created as a draft; modules the course already has are left unchanged.
        </p>
      )}
    </Modal>
  );
}

import { z } from 'zod';
import type { ErrorDetail } from '../../../../services/api-client';
import type { ApiTrackVariant, CreateTrackVariantInput, TrackVariantFormOptions, UpdateTrackVariantInput } from '../types/trackVariant.types';
import { RICH_TEXT_REFUSED, isAllowedRichText } from './richText';

/*
 * Track variant form rules, the same as the backend validator (track-variant.validator.ts createTrackVariantSchema /
 * updateTrackVariantSchema) with its messages. Not a security boundary: the server validates every request again,
 * and its answers (409 "A variant for this track already exists.", 400 track not enabled / module not Module 3)
 * are shown on the matching field.
 */
export interface TrackVariantFormValues {
  /* Create only: the course whose Module 3 the variant belongs to (not sent; it narrows the module and tracks). */
  courseId: string;
  courseModuleId: string;
  trackId: string;
  /* '' = not entered yet (F-LMS-07-09: from the track syllabus). */
  expectedTrackModules: string;
  expectedOftCards: string;
  syllabusReference: string;
  description: string;
  isActive: boolean;
}

export type TrackVariantShape = TrackVariantFormOptions['shape'];

export const emptyTrackVariantForm = (courseId = ''): TrackVariantFormValues => ({
  courseId,
  courseModuleId: '',
  trackId: '',
  expectedTrackModules: '',
  expectedOftCards: '',
  syllabusReference: '',
  description: '',
  isActive: true,
});

export const trackVariantFormFrom = (v: ApiTrackVariant): TrackVariantFormValues => ({
  courseId: v.course.id,
  courseModuleId: v.courseModuleId,
  trackId: v.trackId,
  expectedTrackModules: v.expectedTrackModules === null ? '' : String(v.expectedTrackModules),
  expectedOftCards: v.expectedOftCards === null ? '' : String(v.expectedOftCards),
  syllabusReference: v.syllabusReference ?? '',
  description: v.description ?? '',
  isActive: v.isActive,
});

const issue = (ctx: z.RefinementCtx, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });

const blankToNull = (raw: string): string | null => (raw.trim() ? raw.trim() : null);
const countOrNull = (raw: string): number | null => (raw.trim() ? Number(raw.trim()) : null);

/* Optional whole number within the per-track range ("22 or 23", "12 or 13"). */
const syllabusCount = (range: { min: number; max: number }) => {
  const message = `Enter ${range.min} or ${range.max} from the track syllabus.`;
  return z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (!v) return;
    const n = Number(v);
    if (!/^\d+$/.test(v) || n < range.min || n > range.max) issue(ctx, message);
  });
};

/* Optional rich text: blank is cleared; at most `max` characters; allow-listed markup only. */
export const optionalRichText = (max: number, tooLong = 'Shorten the text.') =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (v.length > max) issue(ctx, tooLong);
    else if (v && !isAllowedRichText(v)) issue(ctx, RICH_TEXT_REFUSED);
  });

export const optionalText = (max: number) =>
  z.string().superRefine((raw, ctx) => {
    if (raw.trim().length > max) issue(ctx, `Must be at most ${max} characters`);
  });

/* Create checks the course, module and track; Edit only the four editable fields (module and track are fixed). */
export const trackVariantFormSchema = (shape: TrackVariantShape, mode: 'create' | 'edit') =>
  z.object({
    courseId: mode === 'create' ? z.string().min(1, 'Select a course.') : z.string(),
    courseModuleId: mode === 'create' ? z.string().min(1, 'Select a Module 3 course module.') : z.string(),
    trackId: mode === 'create' ? z.string().min(1, 'Select a technology track.') : z.string(),
    expectedTrackModules: syllabusCount(shape.trackModules),
    expectedOftCards: syllabusCount(shape.oftCards),
    syllabusReference: optionalText(120),
    description: optionalRichText(3000),
    isActive: z.boolean(),
  });

/* What a create sends: numbers or null for the counts, null for blank text. */
export const createTrackVariantPayload = (v: TrackVariantFormValues): CreateTrackVariantInput => ({
  courseModuleId: v.courseModuleId,
  trackId: v.trackId,
  expectedTrackModules: countOrNull(v.expectedTrackModules),
  expectedOftCards: countOrNull(v.expectedOftCards),
  syllabusReference: blankToNull(v.syllabusReference),
  description: blankToNull(v.description),
  isActive: v.isActive,
});

/* What an edit sends: the four editable fields (blank clears them). */
export const updateTrackVariantPayload = (v: TrackVariantFormValues): UpdateTrackVariantInput => ({
  expectedTrackModules: countOrNull(v.expectedTrackModules),
  expectedOftCards: countOrNull(v.expectedOftCards),
  syllabusReference: blankToNull(v.syllabusReference),
  description: blankToNull(v.description),
});

export type TrackVariantPayload = CreateTrackVariantInput | UpdateTrackVariantInput;

export const TRACK_VARIANT_FIELDS = ['courseModuleId', 'trackId', 'expectedTrackModules', 'expectedOftCards', 'syllabusReference', 'description'] as const;
export type TrackVariantField = (typeof TRACK_VARIANT_FIELDS)[number];

/* Server field details ("body.trackId", "trackId") mapped onto form fields; unknown fields are left out. */
export function trackVariantServerErrors(details: ErrorDetail[]): { field: TrackVariantField; message: string }[] {
  const out: { field: TrackVariantField; message: string }[] = [];
  for (const d of details) {
    const name = (d.field ?? '').replace(/^(body|params|query)\./, '').split('.')[0] as TrackVariantField;
    if (TRACK_VARIANT_FIELDS.includes(name) && !out.some((o) => o.field === name)) out.push({ field: name, message: d.message });
  }
  return out;
}

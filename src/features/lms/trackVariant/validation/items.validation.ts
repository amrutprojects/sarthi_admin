import { z } from 'zod';
import {
  EVIDENCE_TYPES, GATE_CLEARANCE_MODES, LEARNING_COMPONENT_KINDS, type ApiAssessmentComponent, type ApiLearningComponent, type ApiOftCard,
  type ApiPhase, type ApiReadinessGate, type ApiTrackModule, type EvidenceType, type GateClearanceMode, type LearningComponentKind,
} from '../types/trackVariant.types';
import { RICH_TEXT_REFUSED, isAllowedRichText } from './richText';
import { optionalRichText, optionalText, type TrackVariantShape } from './trackVariant.validation';

/*
 * The curriculum item forms, one per child collection, with the backend's rules and messages
 * (track-variant.validator.ts create*Schema / update*Schema, and the item service's own checks: the OFT code's
 * track part, the hours range, a weight change needing its reference, the gate's minimum band). Every input is
 * kept as text and converted only in the payload. The server checks again; uniqueness (phase / gate number,
 * codes, positions, single learning components) and references are its answers, shown on the field.
 */

const issue = (ctx: z.RefinementCtx, message: string, path: (string | number)[] = []) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

const blankToNull = (raw: string): string | null => (raw.trim() ? raw.trim() : null);
const numberOrNull = (raw: string): number | null => (raw.trim() ? Number(raw.trim()) : null);
/* At most two decimal places, checked exactly (as the server does: the number is its own two-place form). */
const twoDecimals = (n: number) => Number(n.toFixed(2)) === n;
const DECIMAL = /^\d+(\.\d+)?$/;

const requiredText = (min: number, max: number, message: string) =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (v.length < min || v.length > max) issue(ctx, message);
  });

const requiredRichText = (min: number, max: number, message: string) =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (v.length < min || v.length > max) issue(ctx, message);
    else if (!isAllowedRichText(v)) issue(ctx, RICH_TEXT_REFUSED);
  });

const selected = (message: string) => z.string().min(1, message);

const wholeNumber = (min: number, max: number, message: string) =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    const n = Number(v);
    if (!/^\d+$/.test(v) || n < min || n > max) issue(ctx, message);
  });

/* Hours, numeric(6,2): 0–9999.99 (or > 0 for an OFT card), two decimals at most. */
const hours = (message: string, { required = false, positive = false }: { required?: boolean; positive?: boolean } = {}) =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (!v) {
      if (required) issue(ctx, message);
      return;
    }
    const n = Number(v);
    if (!DECIMAL.test(v) || n > 9999.99 || (positive && n <= 0)) issue(ctx, message);
    else if (!twoDecimals(n)) issue(ctx, 'Use at most two decimal places.');
  });

/* A code typed in any case; the server upper-cases it before checking. */
const code = (max: number, pattern: RegExp, message: string) =>
  z.string().superRefine((raw, ctx) => {
    const v = raw.trim().toUpperCase();
    if (!v || v.length > max || !pattern.test(v)) issue(ctx, message);
  });

const evidenceTypes = z.array(z.string()).min(1, 'Select at least one type of evidence.');

/* In the catalogue's order, each once. */
const evidenceList = (xs: string[]): EvidenceType[] => EVIDENCE_TYPES.filter((t) => xs.includes(t));

/* Smallest number from 1 to max not taken yet ('' when all are taken). */
export const firstFree = (taken: number[], max: number): string => {
  for (let n = 1; n <= max; n++) if (!taken.includes(n)) return String(n);
  return '';
};

/* ============================== phases ============================== */

export type PhaseForm = { phaseNumber: string; title: string; description: string };

export const phaseSchema = (shape: TrackVariantShape) =>
  z.object({
    phaseNumber: wholeNumber(1, shape.phases, `Choose a phase number from 1 to ${shape.phases}.`),
    title: requiredText(3, 160, 'Enter a phase title of 3 to 160 characters.'),
    description: optionalRichText(3000),
  });

export const phaseForm = (row: ApiPhase | null, rows: ApiPhase[], shape: TrackVariantShape): PhaseForm => ({
  phaseNumber: row ? String(row.phaseNumber) : firstFree(rows.map((r) => r.phaseNumber), shape.phases),
  title: row?.title ?? '',
  description: row?.description ?? '',
});

export const phasePayload = (v: PhaseForm) => ({
  phaseNumber: Number(v.phaseNumber),
  title: v.title.trim(),
  description: blankToNull(v.description),
});

/* ============================== track modules ============================== */

export type TrackModuleForm = {
  phaseId: string;
  code: string;
  title: string;
  sortOrder: string;
  lectureHours: string;
  practicalHours: string;
  description: string;
};

export const trackModuleSchema = () =>
  z.object({
    phaseId: selected('Select a phase of this variant.'),
    code: code(30, /^[A-Z0-9][A-Z0-9-]*$/, 'Use capital letters, digits and hyphens (up to 30).'),
    title: requiredText(3, 160, 'Enter a track module title of 3 to 160 characters.'),
    sortOrder: wholeNumber(1, 999, 'Enter the position of the track module (1 or more).'),
    lectureHours: hours('Enter the lecture hours (0 or more).'),
    practicalHours: hours('Enter the practical hours (0 or more).'),
    description: optionalRichText(3000),
  });

/* A new track module goes after the last one, in the phase of the last one. */
export const trackModuleForm = (row: ApiTrackModule | null, rows: ApiTrackModule[]): TrackModuleForm => {
  const last = [...rows].sort((a, b) => a.sortOrder - b.sortOrder).pop();
  return {
    phaseId: row?.phaseId ?? last?.phaseId ?? '',
    code: row?.code ?? '',
    title: row?.title ?? '',
    sortOrder: String(row ? row.sortOrder : Math.min(999, (last?.sortOrder ?? 0) + 1)),
    lectureHours: row?.lectureHours == null ? '' : String(row.lectureHours),
    practicalHours: row?.practicalHours == null ? '' : String(row.practicalHours),
    description: row?.description ?? '',
  };
};

export const trackModulePayload = (v: TrackModuleForm) => ({
  phaseId: v.phaseId,
  code: v.code.trim().toUpperCase(),
  title: v.title.trim(),
  sortOrder: Number(v.sortOrder),
  lectureHours: numberOrNull(v.lectureHours),
  practicalHours: numberOrNull(v.practicalHours),
  description: blankToNull(v.description),
});

/* ============================== learning components ============================== */

export type LearningComponentForm = { kind: string; title: string; trackModuleId: string; description: string };

export const learningComponentSchema = () =>
  z.object({
    kind: z.string().refine((v) => (LEARNING_COMPONENT_KINDS as readonly string[]).includes(v), 'Select a kind.'),
    title: requiredText(3, 150, 'Enter a title.'),
    trackModuleId: z.string(),
    description: optionalRichText(3000),
  });

export const learningComponentForm = (row: ApiLearningComponent | null): LearningComponentForm => ({
  kind: row?.kind ?? '',
  title: row?.title ?? '',
  trackModuleId: row?.trackModuleId ?? '',
  description: row?.description ?? '',
});

export const learningComponentPayload = (v: LearningComponentForm) => ({
  kind: v.kind as LearningComponentKind,
  title: v.title.trim(),
  trackModuleId: v.trackModuleId || null,
  description: blankToNull(v.description),
});

/* ============================== OFT cards ============================== */

export type OftCardForm = {
  oftCode: string;
  title: string;
  stage: string;
  linkedTrackModuleId: string;
  instructions: string;
  hoursMin: string;
  hoursMax: string;
  deliverable: string;
  evidenceTypes: string[];
  evidenceNotes: string;
  hostVerificationRequired: boolean;
};

export const OFT_CODE_MESSAGE = 'Use the pattern OFT-M3-{track code}-{nn}, for example OFT-M3-T07-04.';
const OFT_CODE_SHAPE = /^OFT-M3-T\d{2}-\d{2}$/;
const RANGE = 'Enter a valid hours range.';

/* F-LMS-29-01: OFT-M3-{track}-{nn}; the track part must be the variant's own track code (checked by the service). */
export const oftCodeOfTrack = (trackCode: string) => `OFT-M3-${trackCode}-`;

export const oftCardSchema = (trackCode: string) =>
  z
    .object({
      oftCode: z.string().superRefine((raw, ctx) => {
        const v = raw.trim().toUpperCase();
        if (!v || v.length > 20 || !OFT_CODE_SHAPE.test(v)) issue(ctx, OFT_CODE_MESSAGE);
        else if (!(v.startsWith(oftCodeOfTrack(trackCode)) && /^\d{2}$/.test(v.slice(oftCodeOfTrack(trackCode).length)))) {
          issue(ctx, `Use the pattern OFT-M3-${trackCode}-{nn}, for example OFT-M3-${trackCode}-01.`);
        }
      }),
      title: requiredText(3, 150, 'Enter a title.'),
      stage: optionalText(60),
      linkedTrackModuleId: z.string(),
      instructions: requiredRichText(20, 8000, 'Enter the task instructions.'),
      hoursMin: hours(RANGE, { required: true, positive: true }),
      hoursMax: hours(RANGE, { required: true, positive: true }),
      deliverable: requiredText(10, 1000, 'Describe the deliverable.'),
      evidenceTypes,
      evidenceNotes: optionalText(2000),
      hostVerificationRequired: z.boolean(),
    })
    .superRefine((v, ctx) => {
      const min = Number(v.hoursMin.trim());
      const max = Number(v.hoursMax.trim());
      if (DECIMAL.test(v.hoursMin.trim()) && DECIMAL.test(v.hoursMax.trim()) && min > max) issue(ctx, RANGE, ['hoursMax']);
    });

/* A new card gets the next free number of the track: OFT-M3-T07-05 after …-04. */
export const nextOftCode = (trackCode: string, rows: ApiOftCard[]): string => {
  const prefix = oftCodeOfTrack(trackCode);
  const used = rows.map((r) => (r.oftCode.startsWith(prefix) ? Number(r.oftCode.slice(prefix.length)) : 0)).filter((n) => Number.isInteger(n));
  const next = Math.min(99, Math.max(0, ...used) + 1);
  return `${prefix}${String(next).padStart(2, '0')}`;
};

export const oftCardForm = (row: ApiOftCard | null, rows: ApiOftCard[], trackCode: string): OftCardForm => ({
  oftCode: row?.oftCode ?? nextOftCode(trackCode, rows),
  title: row?.title ?? '',
  stage: row?.stage ?? '',
  linkedTrackModuleId: row?.linkedTrackModuleId ?? '',
  instructions: row?.instructions ?? '',
  hoursMin: row ? String(row.hoursMin) : '',
  hoursMax: row ? String(row.hoursMax) : '',
  deliverable: row?.deliverable ?? '',
  evidenceTypes: row ? [...row.evidenceTypes] : [],
  evidenceNotes: row?.evidenceNotes ?? '',
  hostVerificationRequired: row?.hostVerificationRequired ?? false,
});

/* The code is sent on create and while the card is a draft; a published card's code is frozen (F-LMS-29-01). */
export const oftCardPayload = (v: OftCardForm, row: ApiOftCard | null) => ({
  ...(row && row.status !== 'DRAFT' ? {} : { oftCode: v.oftCode.trim().toUpperCase() }),
  title: v.title.trim(),
  stage: blankToNull(v.stage),
  linkedTrackModuleId: v.linkedTrackModuleId || null,
  instructions: v.instructions.trim(),
  hoursMin: Number(v.hoursMin.trim()),
  hoursMax: Number(v.hoursMax.trim()),
  deliverable: v.deliverable.trim(),
  evidenceTypes: evidenceList(v.evidenceTypes),
  evidenceNotes: blankToNull(v.evidenceNotes),
  hostVerificationRequired: v.hostVerificationRequired,
});

/* ============================== assessment components ============================== */

export type AssessmentComponentForm = {
  componentCode: string;
  label: string;
  weight: string;
  source: string;
  indicative: boolean;
  sortOrder: string;
};

const WEIGHT = 'Enter a weight from 0 to 100.';

/* F-LMS-18-10: changing a set weight "needs a reference to the prescribing decision" (the source). */
export const assessmentComponentSchema = (shape: TrackVariantShape, row: ApiAssessmentComponent | null) =>
  z
    .object({
      componentCode: code(30, /^[A-Z0-9][A-Z0-9_-]*$/, 'Use capital letters, digits, hyphens and underscores (up to 30).'),
      label: requiredText(2, 150, 'Enter a label.'),
      weight: z.string().superRefine((raw, ctx) => {
        const v = raw.trim();
        if (!v) return;
        const n = Number(v);
        if (!DECIMAL.test(v) || n > 100) issue(ctx, WEIGHT);
        else if (!twoDecimals(n)) issue(ctx, 'Use at most two decimal places.');
      }),
      source: optionalText(200),
      indicative: z.boolean(),
      sortOrder: wholeNumber(1, shape.assessmentComponents, `Choose a position from 1 to ${shape.assessmentComponents}.`),
    })
    .superRefine((v, ctx) => {
      if (!row || row.weight === null) return;
      const w = v.weight.trim();
      if (w && !DECIMAL.test(w)) return;
      if (Number(numberOrNull(w)) !== Number(row.weight) && !v.source.trim()) issue(ctx, 'Enter the reference for this change.', ['source']);
    });

export const assessmentComponentForm = (row: ApiAssessmentComponent | null, rows: ApiAssessmentComponent[], shape: TrackVariantShape): AssessmentComponentForm => ({
  componentCode: row?.componentCode ?? '',
  label: row?.label ?? '',
  weight: row?.weight == null ? '' : String(row.weight),
  source: row?.source ?? '',
  /* Syllabus weights are indicative defaults until a prescribing decision (OQ-013). */
  indicative: row?.indicative ?? true,
  sortOrder: row ? String(row.sortOrder) : firstFree(rows.map((r) => r.sortOrder), shape.assessmentComponents),
});

export const assessmentComponentPayload = (v: AssessmentComponentForm) => ({
  componentCode: v.componentCode.trim().toUpperCase(),
  label: v.label.trim(),
  weight: numberOrNull(v.weight),
  source: blankToNull(v.source),
  indicative: v.indicative,
  sortOrder: Number(v.sortOrder),
});

/* ============================== readiness gates ============================== */

export type ReadinessGateForm = {
  gateNumber: string;
  title: string;
  heldAfterTrackModuleId: string;
  demonstration: string;
  evidenceTypes: string[];
  evidenceNotes: string;
  remediationPath: string;
  clearanceMode: string;
  clearanceMinBand: string;
};

export const readinessGateSchema = (shape: TrackVariantShape, bands: { min: number; max: number }, mode: 'create' | 'edit') =>
  z
    .object({
      /* Fixed on creation (F-LMS-32-02). */
      gateNumber: mode === 'create' ? wholeNumber(1, shape.readinessGates, `Choose a gate number from 1 to ${shape.readinessGates}.`) : z.string(),
      title: requiredText(3, 120, 'Enter a title.'),
      heldAfterTrackModuleId: selected('Select a track module of this track.'),
      demonstration: requiredRichText(20, 4000, 'Describe the demonstration.'),
      evidenceTypes,
      evidenceNotes: optionalText(2000),
      remediationPath: requiredRichText(10, 2000, 'Describe the remediation path.'),
      clearanceMode: z.string().refine((v) => (GATE_CLEARANCE_MODES as readonly string[]).includes(v), 'Choose how the gate is cleared.'),
      clearanceMinBand: z.string(),
    })
    .superRefine((v, ctx) => {
      /* F-LMS-32-08: 'minimum band' needs a band 1–5; 'assessor decides' has none. */
      if (v.clearanceMode !== 'MINIMUM_BAND') return;
      const b = v.clearanceMinBand.trim();
      const n = Number(b);
      if (!/^\d+$/.test(b) || n < bands.min || n > bands.max) issue(ctx, `Choose a minimum band from ${bands.min} to ${bands.max}.`, ['clearanceMinBand']);
    });

export const readinessGateForm = (row: ApiReadinessGate | null, rows: ApiReadinessGate[], shape: TrackVariantShape): ReadinessGateForm => ({
  gateNumber: row ? String(row.gateNumber) : firstFree(rows.map((r) => r.gateNumber), shape.readinessGates),
  title: row?.title ?? '',
  heldAfterTrackModuleId: row?.heldAfterTrackModuleId ?? '',
  demonstration: row?.demonstration ?? '',
  evidenceTypes: row ? [...row.evidenceTypes] : [],
  evidenceNotes: row?.evidenceNotes ?? '',
  remediationPath: row?.remediationPath ?? '',
  clearanceMode: row?.clearanceMode ?? 'ASSESSOR_DECIDES',
  clearanceMinBand: row?.clearanceMinBand == null ? '' : String(row.clearanceMinBand),
});

export const readinessGatePayload = (v: ReadinessGateForm, mode: 'create' | 'edit') => ({
  ...(mode === 'create' ? { gateNumber: Number(v.gateNumber) } : {}),
  title: v.title.trim(),
  heldAfterTrackModuleId: v.heldAfterTrackModuleId,
  demonstration: v.demonstration.trim(),
  evidenceTypes: evidenceList(v.evidenceTypes),
  evidenceNotes: blankToNull(v.evidenceNotes),
  remediationPath: v.remediationPath.trim(),
  clearanceMode: v.clearanceMode as GateClearanceMode,
  clearanceMinBand: v.clearanceMode === 'MINIMUM_BAND' ? Number(v.clearanceMinBand) : null,
});

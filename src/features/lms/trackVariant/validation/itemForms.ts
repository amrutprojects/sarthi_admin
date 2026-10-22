import type { z } from 'zod';
import {
  EVIDENCE_TYPES, EVIDENCE_TYPE_LABELS, GATE_CLEARANCE_LABELS, GATE_CLEARANCE_MODES, LEARNING_COMPONENT_KINDS, LEARNING_COMPONENT_LABELS,
  SINGLE_LEARNING_COMPONENTS, type ApiAssessmentComponent, type ApiLearningComponent, type ApiOftCard, type ApiPhase, type ApiReadinessGate,
  type ApiTrackModule, type FieldDef, type FieldOption, type ItemFormValues,
} from '../types/trackVariant.types';
import {
  assessmentComponentForm, assessmentComponentPayload, assessmentComponentSchema, learningComponentForm, learningComponentPayload,
  learningComponentSchema, oftCardForm, oftCardPayload, oftCardSchema, phaseForm, phasePayload, phaseSchema, readinessGateForm,
  readinessGatePayload, readinessGateSchema, trackModuleForm, trackModulePayload, trackModuleSchema, type AssessmentComponentForm,
  type LearningComponentForm, type OftCardForm, type PhaseForm, type ReadinessGateForm, type TrackModuleForm,
} from './items.validation';
import { RICH_TEXT_HINT } from './richText';
import type { TrackVariantShape } from './trackVariant.validation';

/*
 * The add / edit dialog of each curriculum collection: its fields, rules, starting values and payload. The
 * dialog itself (components/ItemFormModal.tsx) is the same for all six.
 */
export interface ItemFormContext {
  shape: TrackVariantShape;
  bands: { min: number; max: number };
  /* The variant's track code, e.g. T07 (OFT codes). */
  trackCode: string;
  phases: ApiPhase[];
  trackModules: ApiTrackModule[];
}

export interface ItemFormConfig {
  title: string;
  submitLabel: string;
  intro?: string;
  fields: FieldDef[];
  schema: z.ZodTypeAny;
  defaults: ItemFormValues;
  payload: (values: ItemFormValues) => object;
}

const richHint = (lead: string) => `${lead} ${RICH_TEXT_HINT}`;

/* 1…max, a number used by another row marked and disabled. */
const numberOptions = (max: number, taken: number[], label: (n: number) => string): FieldOption[] =>
  Array.from({ length: max }, (_, i) => i + 1).map((n) => ({
    v: String(n),
    l: taken.includes(n) ? `${label(n)} (already added)` : label(n),
    disabled: taken.includes(n),
  }));

export const phaseLabel = (p: Pick<ApiPhase, 'phaseNumber' | 'title'>) => `Phase ${p.phaseNumber} · ${p.title}`;
export const moduleLabel = (m: Pick<ApiTrackModule, 'code' | 'title'>) => `${m.code} · ${m.title}`;

const phaseOptions = (phases: ApiPhase[]): FieldOption[] =>
  [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber).map((p) => ({ v: p.id, l: phaseLabel(p) }));
const moduleOptions = (modules: ApiTrackModule[]): FieldOption[] =>
  [...modules].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => ({ v: m.id, l: moduleLabel(m) }));
const evidenceOptions: FieldOption[] = EVIDENCE_TYPES.map((t) => ({ v: t, l: EVIDENCE_TYPE_LABELS[t] }));

const others = <R extends { id: string }>(rows: R[], row: R | null) => rows.filter((r) => r.id !== row?.id);

export function phaseFormConfig(ctx: ItemFormContext, rows: ApiPhase[], row: ApiPhase | null): ItemFormConfig {
  return {
    title: row ? `Edit phase ${row.phaseNumber}` : 'Add phase',
    submitLabel: row ? 'Save phase' : 'Add phase',
    fields: [
      {
        type: 'select', name: 'phaseNumber', label: 'Phase Number', required: true, placeholder: 'Select a number',
        options: numberOptions(ctx.shape.phases, others(rows, row).map((r) => r.phaseNumber), (n) => `Phase ${n}`),
        hint: `Phases 1 to ${ctx.shape.phases}, each once per variant. The number is the phase's position.`,
      },
      { type: 'text', name: 'title', label: 'Title', required: true, maxLength: 160, hint: '3 to 160 characters.' },
      { type: 'textarea', name: 'description', label: 'Description', wide: true, rows: 3, maxLength: 3000, hint: richHint('Optional, up to 3,000 characters.') },
    ],
    schema: phaseSchema(ctx.shape),
    defaults: phaseForm(row, rows, ctx.shape),
    payload: (v) => phasePayload(v as PhaseForm),
  };
}

export function trackModuleFormConfig(ctx: ItemFormContext, rows: ApiTrackModule[], row: ApiTrackModule | null): ItemFormConfig {
  return {
    title: row ? `Edit track module ${row.code}` : 'Add track module',
    submitLabel: row ? 'Save track module' : 'Add track module',
    fields: [
      {
        type: 'select', name: 'phaseId', label: 'Phase', required: true, placeholder: 'Select a phase', options: phaseOptions(ctx.phases),
        hint: ctx.phases.length ? 'The phase of this variant the module belongs to.' : 'Add the phases first: every track module belongs to a phase.',
      },
      { type: 'text', name: 'code', label: 'Code', required: true, mono: true, maxLength: 30, hint: 'Capital letters, digits and hyphens, up to 30; unique within the variant.' },
      { type: 'text', name: 'title', label: 'Title', required: true, maxLength: 160, hint: '3 to 160 characters.' },
      {
        type: 'text', name: 'sortOrder', label: 'Position', required: true, inputMode: 'numeric', maxLength: 3,
        hint: 'Order of the module in the track (1 or more), unique. The readiness gates follow this order.',
      },
      { type: 'text', name: 'lectureHours', label: 'Lecture Hours', inputMode: 'decimal', maxLength: 7, hint: 'Optional, 0 or more, at most two decimals.' },
      { type: 'text', name: 'practicalHours', label: 'Practical Hours', inputMode: 'decimal', maxLength: 7, hint: 'Optional, 0 or more, at most two decimals.' },
      { type: 'textarea', name: 'description', label: 'Description', wide: true, rows: 3, maxLength: 3000, hint: richHint('Optional, up to 3,000 characters.') },
    ],
    schema: trackModuleSchema(),
    defaults: trackModuleForm(row, rows),
    payload: (v) => trackModulePayload(v as TrackModuleForm),
  };
}

export function learningComponentFormConfig(ctx: ItemFormContext, rows: ApiLearningComponent[], row: ApiLearningComponent | null): ItemFormConfig {
  const takenSingles = others(rows, row).map((r) => r.kind).filter((k) => SINGLE_LEARNING_COMPONENTS.includes(k));
  return {
    title: row ? `Edit ${LEARNING_COMPONENT_LABELS[row.kind].toLowerCase()}` : 'Add learning component',
    submitLabel: row ? 'Save component' : 'Add component',
    intro: 'The capstone project, business simulation and portfolio are one each per variant; mini and integration projects may be several.',
    fields: [
      {
        type: 'select', name: 'kind', label: 'Kind', required: true, placeholder: 'Select a kind',
        options: LEARNING_COMPONENT_KINDS.map((k) => ({
          v: k,
          l: takenSingles.includes(k) ? `${LEARNING_COMPONENT_LABELS[k]} (already added)` : LEARNING_COMPONENT_LABELS[k],
          disabled: takenSingles.includes(k),
        })),
      },
      { type: 'text', name: 'title', label: 'Title', required: true, maxLength: 150, hint: '3 to 150 characters.' },
      {
        type: 'select', name: 'trackModuleId', label: 'Track Module', placeholder: 'Not linked to a track module', options: moduleOptions(ctx.trackModules),
        hint: 'Optional: the track module of this variant the component belongs to.',
      },
      { type: 'textarea', name: 'description', label: 'Description', wide: true, rows: 3, maxLength: 3000, hint: richHint('Optional, up to 3,000 characters.') },
    ],
    schema: learningComponentSchema(),
    defaults: learningComponentForm(row),
    payload: (v) => learningComponentPayload(v as LearningComponentForm),
  };
}

/* Why a published card's code cannot change (F-LMS-29-01). */
export const OFT_CODE_FROZEN =
  'The OFT code cannot be changed once the card is published: learners’ field work and reports refer to it (F-LMS-29-01).';

export function oftCardFormConfig(ctx: ItemFormContext, rows: ApiOftCard[], row: ApiOftCard | null): ItemFormConfig {
  const frozen = !!row && row.status !== 'DRAFT';
  return {
    title: row ? `Edit OFT card ${row.oftCode}` : 'Add OFT card',
    submitLabel: row ? 'Save OFT card' : 'Add OFT card',
    intro: row?.status === 'PUBLISHED' ? 'This card is published. Changes are saved to the card at once.' : undefined,
    fields: [
      {
        type: 'text', name: 'oftCode', label: 'OFT Code', required: true, mono: true, maxLength: 20, readOnly: frozen,
        hint: frozen ? OFT_CODE_FROZEN : `Pattern OFT-M3-${ctx.trackCode}-{nn}, unique within the module. It is frozen once the card is published.`,
      },
      { type: 'text', name: 'title', label: 'Title', required: true, maxLength: 150, hint: '3 to 150 characters.' },
      { type: 'text', name: 'stage', label: 'Stage', maxLength: 60, hint: 'Optional, as named in the syllabus (up to 60 characters).' },
      {
        type: 'select', name: 'linkedTrackModuleId', label: 'Linked Track Module', placeholder: 'Not linked', options: moduleOptions(ctx.trackModules),
        hint: 'Optional: the track module after which the card is released.',
      },
      { type: 'text', name: 'hoursMin', label: 'Hours (minimum)', required: true, inputMode: 'decimal', maxLength: 7, hint: 'More than 0, at most two decimals.' },
      { type: 'text', name: 'hoursMax', label: 'Hours (maximum)', required: true, inputMode: 'decimal', maxLength: 7, hint: 'Not below the minimum.' },
      { type: 'textarea', name: 'instructions', label: 'Task Instructions', required: true, wide: true, rows: 5, maxLength: 8000, hint: richHint('20 to 8,000 characters.') },
      { type: 'textarea', name: 'deliverable', label: 'Deliverable', required: true, wide: true, rows: 3, maxLength: 1000, hint: '10 to 1,000 characters.' },
      { type: 'checkboxes', name: 'evidenceTypes', label: 'Evidence Types', required: true, wide: true, options: evidenceOptions, hint: 'At least one.' },
      { type: 'textarea', name: 'evidenceNotes', label: 'Evidence Notes', wide: true, rows: 2, maxLength: 2000, hint: 'Optional, up to 2,000 characters.' },
      { type: 'checkbox', name: 'hostVerificationRequired', label: 'Host verification required', wide: true, hint: 'Leave off where the syllabus card does not state it.' },
    ],
    schema: oftCardSchema(ctx.trackCode),
    defaults: oftCardForm(row, rows, ctx.trackCode),
    payload: (v) => oftCardPayload(v as OftCardForm, row),
  };
}

export function assessmentComponentFormConfig(ctx: ItemFormContext, rows: ApiAssessmentComponent[], row: ApiAssessmentComponent | null): ItemFormConfig {
  const n = ctx.shape.assessmentComponents;
  return {
    title: row ? `Edit assessment component ${row.componentCode}` : 'Add assessment component',
    submitLabel: row ? 'Save component' : 'Add component',
    fields: [
      { type: 'text', name: 'componentCode', label: 'Component Code', required: true, mono: true, maxLength: 30, hint: 'Capital letters, digits, hyphens and underscores, up to 30; unique within the variant.' },
      { type: 'text', name: 'label', label: 'Label', required: true, maxLength: 150, hint: '2 to 150 characters.' },
      {
        type: 'select', name: 'sortOrder', label: 'Position', required: true, placeholder: 'Select a position',
        options: numberOptions(n, others(rows, row).map((r) => r.sortOrder), (p) => `Position ${p}`),
        hint: `The ${n} components of the Module 3 assessment framework, positions 1 to ${n}.`,
      },
      {
        type: 'text', name: 'weight', label: 'Weight (%)', inputMode: 'decimal', maxLength: 6,
        hint: `Optional, 0 to 100. Once any weight is entered, all ${n} must be, totalling 100, before the variant can be published.`,
      },
      {
        type: 'text', name: 'source', label: 'Source / Reference', maxLength: 200,
        hint:
          row && row.weight !== null
            ? 'Required when the weight changes: the reference of the prescribing decision (up to 200 characters).'
            : 'Optional: the syllabus, or the reference of the prescribing decision (up to 200 characters).',
      },
      { type: 'checkbox', name: 'indicative', label: 'Indicative weight', hint: 'Syllabus weights are indicative until a decision prescribes them (To Be Confirmed, OQ-013).' },
    ],
    schema: assessmentComponentSchema(ctx.shape, row),
    defaults: assessmentComponentForm(row, rows, ctx.shape),
    payload: (v) => assessmentComponentPayload(v as AssessmentComponentForm),
  };
}

export function readinessGateFormConfig(ctx: ItemFormContext, rows: ApiReadinessGate[], row: ApiReadinessGate | null): ItemFormConfig {
  const mode = row ? 'edit' : 'create';
  const bands = Array.from({ length: ctx.bands.max - ctx.bands.min + 1 }, (_, i) => ctx.bands.min + i);
  const numberField: FieldDef = row
    ? { type: 'text', name: 'gateNumber', label: 'Gate Number', readOnly: true, hint: 'Fixed on creation.' }
    : {
        type: 'select', name: 'gateNumber', label: 'Gate Number', required: true, placeholder: 'Select a number',
        options: numberOptions(ctx.shape.readinessGates, rows.map((r) => r.gateNumber), (g) => `Gate ${g}`),
        hint: `Gates 1 to ${ctx.shape.readinessGates}, each once per track. Fixed on creation.`,
      };
  return {
    title: row ? `Edit readiness gate ${row.gateNumber}` : 'Add readiness gate',
    submitLabel: row ? 'Save gate' : 'Add gate',
    fields: [
      numberField,
      { type: 'text', name: 'title', label: 'Title', required: true, maxLength: 120, hint: '3 to 120 characters.' },
      {
        type: 'select', name: 'heldAfterTrackModuleId', label: 'Held After Track Module', required: true, placeholder: 'Select a track module',
        options: moduleOptions(ctx.trackModules),
        hint: ctx.trackModules.length
          ? 'Gate order follows track-module order: each gate is held after a later module than the gate before it.'
          : 'Add the track modules first: a gate is held after one of them.',
      },
      {
        type: 'select', name: 'clearanceMode', label: 'Clearance', required: true,
        options: GATE_CLEARANCE_MODES.map((m) => ({ v: m, l: GATE_CLEARANCE_LABELS[m] })),
        hint: 'Assessor decides by default. No minimum band is assumed (To Be Confirmed, OQ-013).',
      },
      {
        type: 'select', name: 'clearanceMinBand', label: 'Minimum Band', required: true, placeholder: 'Select a band',
        options: bands.map((b) => ({ v: String(b), l: `Band ${b}` })),
        showIf: (v) => v.clearanceMode === 'MINIMUM_BAND',
        hint: `Competency band ${ctx.bands.min} to ${ctx.bands.max} the learner must reach.`,
      },
      { type: 'textarea', name: 'demonstration', label: 'Demonstration', required: true, wide: true, rows: 4, maxLength: 4000, hint: richHint('20 to 4,000 characters.') },
      { type: 'checkboxes', name: 'evidenceTypes', label: 'Evidence Types', required: true, wide: true, options: evidenceOptions, hint: 'At least one.' },
      { type: 'textarea', name: 'evidenceNotes', label: 'Evidence Notes', wide: true, rows: 2, maxLength: 2000, hint: 'Optional, up to 2,000 characters.' },
      { type: 'textarea', name: 'remediationPath', label: 'Remediation Path', required: true, wide: true, rows: 3, maxLength: 2000, hint: richHint('10 to 2,000 characters.') },
    ],
    schema: readinessGateSchema(ctx.shape, ctx.bands, mode),
    defaults: readinessGateForm(row, rows, ctx.shape),
    payload: (v) => readinessGatePayload(v as ReadinessGateForm, mode),
  };
}

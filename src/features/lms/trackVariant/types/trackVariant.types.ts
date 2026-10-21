/*
 * Track Variant Master (AMRUT_KALASH_03 L-07 / FR-307, UI-317), as /api/v1/lms/track-variants returns and accepts it:
 * one Module 3 variant per (course module, technology track) with its curriculum — phases, track modules, learning
 * components, OFT cards (F-LMS-29), assessment components (F-LMS-18-10) and readiness gates (F-LMS-32).
 */
import type { ReactNode } from 'react';

/* Variant and OFT card lifecycle: DRAFT → PUBLISHED → RETIRED (L-07, F-LMS-29-12). */
export const CURRICULUM_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;
export type CurriculumStatus = (typeof CURRICULUM_STATUSES)[number];
export const CURRICULUM_STATUS_LABELS: Record<CurriculumStatus, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', RETIRED: 'Retired' };

/* The learning components of the Module 3 shape; the capstone, business simulation and portfolio are one each. */
export const LEARNING_COMPONENT_KINDS = ['MINI_PROJECT', 'INTEGRATION_PROJECT', 'CAPSTONE_PROJECT', 'BUSINESS_SIMULATION', 'PORTFOLIO'] as const;
export type LearningComponentKind = (typeof LEARNING_COMPONENT_KINDS)[number];
export const SINGLE_LEARNING_COMPONENTS: readonly LearningComponentKind[] = ['CAPSTONE_PROJECT', 'BUSINESS_SIMULATION', 'PORTFOLIO'];
export const LEARNING_COMPONENT_LABELS: Record<LearningComponentKind, string> = {
  MINI_PROJECT: 'Mini project',
  INTEGRATION_PROJECT: 'Integration project',
  CAPSTONE_PROJECT: 'Capstone project',
  BUSINESS_SIMULATION: 'Business simulation',
  PORTFOLIO: 'Portfolio',
};

/* Evidence types of an OFT card (F-LMS-29-09) and of a readiness gate (F-LMS-32-06). */
export const EVIDENCE_TYPES = ['PHOTOGRAPH', 'FIELD_LOG', 'DOCUMENT', 'LINK', 'HOST_NOTE'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  PHOTOGRAPH: 'Photographs',
  FIELD_LOG: 'Field log',
  DOCUMENT: 'Document',
  LINK: 'Link',
  HOST_NOTE: 'Host note',
};

/* Readiness gate clearance rule (F-LMS-32-08); no minimum band is assumed (OQ-013). */
export const GATE_CLEARANCE_MODES = ['ASSESSOR_DECIDES', 'MINIMUM_BAND'] as const;
export type GateClearanceMode = (typeof GATE_CLEARANCE_MODES)[number];
export const GATE_CLEARANCE_LABELS: Record<GateClearanceMode, string> = { ASSESSOR_DECIDES: 'Assessor decides', MINIMUM_BAND: 'Minimum band' };

/* actual vs required; required null = the per-track count (F-LMS-07-09) is not entered yet. */
export interface CountCheck {
  actual: number;
  required: number | null;
}

export interface CompletenessItem {
  item: string;
  message: string;
}

/* What is missing against the Module 3 shape. `missing` blocks publishing; `warnings` never do. */
export interface TrackVariantCompleteness {
  complete: boolean;
  phases: CountCheck;
  trackModules: CountCheck;
  oftCards: CountCheck & { hoursMin: number; hoursMax: number };
  readinessGates: CountCheck;
  assessmentComponents: CountCheck & { weightTotal: number | null };
  learningComponents: Record<LearningComponentKind, number>;
  missing: CompletenessItem[];
  warnings: CompletenessItem[];
}

/* The Admin Panel's track (read-only). isActive false: deactivated since; the variant is kept (L-07). */
export interface TrackVariantTrack {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface TrackVariantCourseModule {
  id: string;
  moduleNumber: number;
  title: string;
  coreHours: number | null;
  oftHoursMin: number | null;
  oftHoursMax: number | null;
}

export interface TrackVariantCourse {
  id: string;
  code: string;
  title: string;
  entityId: string;
}

/* A track variant (list rows and detail). */
export interface ApiTrackVariant {
  id: string;
  courseModuleId: string;
  trackId: string;
  course: TrackVariantCourse;
  courseModule: TrackVariantCourseModule;
  track: TrackVariantTrack;
  status: CurriculumStatus;
  expectedTrackModules: number | null;
  expectedOftCards: number | null;
  syllabusReference: string | null;
  description: string | null;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  completeness: TrackVariantCompleteness;
}

/* GET /lms/track-variants/form-options. */
export interface TrackVariantFormOptions {
  shape: {
    phases: number;
    readinessGates: number;
    trackModules: { min: number; max: number };
    oftCards: { min: number; max: number };
    assessmentComponents: number;
  };
  statuses: string[];
  learningComponentKinds: string[];
  singleLearningComponentKinds: string[];
  evidenceTypes: string[];
  clearanceModes: string[];
  competencyBands: { min: number; max: number };
}

export interface CreateTrackVariantInput {
  courseModuleId: string;
  trackId: string;
  expectedTrackModules: number | null;
  expectedOftCards: number | null;
  syllabusReference: string | null;
  description: string | null;
  isActive?: boolean;
}

/* The module and track are fixed on creation; status has its own endpoints. */
export interface UpdateTrackVariantInput {
  expectedTrackModules?: number | null;
  expectedOftCards?: number | null;
  syllabusReference?: string | null;
  description?: string | null;
}

/* ---- curriculum items (/track-variants/:id/<path>) ---- */

interface ItemBase {
  id: string;
  trackVariantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPhase extends ItemBase {
  phaseNumber: number;
  title: string;
  description: string | null;
}

export interface ApiTrackModule extends ItemBase {
  phaseId: string;
  code: string;
  title: string;
  sortOrder: number;
  lectureHours: number | null;
  practicalHours: number | null;
  description: string | null;
}

export interface ApiLearningComponent extends ItemBase {
  kind: LearningComponentKind;
  title: string;
  trackModuleId: string | null;
  description: string | null;
}

export interface ApiOftCard extends ItemBase {
  oftCode: string;
  title: string;
  stage: string | null;
  linkedTrackModuleId: string | null;
  instructions: string;
  hoursMin: number;
  hoursMax: number;
  deliverable: string;
  evidenceTypes: EvidenceType[];
  evidenceNotes: string | null;
  hostVerificationRequired: boolean;
  /* Set by publishing the variant and by the card's Retire action only. */
  status: CurriculumStatus;
}

export interface ApiAssessmentComponent extends ItemBase {
  componentCode: string;
  label: string;
  weight: number | null;
  source: string | null;
  indicative: boolean;
  sortOrder: number;
}

export interface ApiReadinessGate extends ItemBase {
  gateNumber: number;
  title: string;
  heldAfterTrackModuleId: string;
  demonstration: string;
  evidenceTypes: EvidenceType[];
  evidenceNotes: string | null;
  remediationPath: string;
  clearanceMode: GateClearanceMode;
  clearanceMinBand: number | null;
}

/* Path segment of each child collection, and the row it returns. */
export interface ItemRowMap {
  phases: ApiPhase;
  'track-modules': ApiTrackModule;
  'learning-components': ApiLearningComponent;
  'oft-cards': ApiOftCard;
  'assessment-components': ApiAssessmentComponent;
  'readiness-gates': ApiReadinessGate;
}
export type ItemPath = keyof ItemRowMap;
export const ITEM_PATHS: readonly ItemPath[] = [
  'phases', 'track-modules', 'learning-components', 'oft-cards', 'assessment-components', 'readiness-gates',
];

/* ---- dropdown feeds ---- */

/* GET /lms/courses/options (active, not retired). */
export interface VariantCourseOption {
  id: string;
  code: string;
  title: string;
  entityId: string;
}

/* GET /lms/course-modules/options?courseId=&moduleNumber=3. */
export interface VariantModuleOption {
  id: string;
  courseId: string;
  moduleNumber: number;
  title: string;
}

export interface VariantTrackOption {
  id: string;
  code: string | null;
  name: string;
}

/* ---- the generic curriculum item form ---- */

/* Every item form keeps its inputs as text (numbers too), booleans and lists of codes. */
export type ItemFormValues = Record<string, string | boolean | string[]>;

export interface FieldOption {
  v: string;
  l: string;
  disabled?: boolean;
}

interface FieldBase {
  name: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  /* Spans both columns of the form grid. */
  wide?: boolean;
  /* Text inputs only: shown, submitted, not editable (a disabled input would drop out of the form values). */
  readOnly?: boolean;
  /* Shown only while this holds for the current values. */
  showIf?: (values: ItemFormValues) => boolean;
}

export type FieldDef =
  | (FieldBase & { type: 'text'; maxLength?: number; mono?: boolean; inputMode?: 'numeric' | 'decimal' })
  | (FieldBase & { type: 'textarea'; maxLength?: number; rows?: number })
  | (FieldBase & { type: 'select'; options: FieldOption[]; placeholder?: string })
  | (FieldBase & { type: 'checkboxes'; options: FieldOption[] })
  | (FieldBase & { type: 'checkbox' });

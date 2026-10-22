/* Programme page DTOs (backend src/cms/programme/programme.service.ts). Every text is a Marathi / English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}
export interface MethodologyRow {
  label: Bilingual;
  value: Bilingual;
}
export interface AssessmentRow {
  component: Bilingual;
  min: number;
  max: number;
}
export interface TrainingMode {
  name: Bilingual;
  description: Bilingual;
}
export interface TrainingModes {
  title: Bilingual;
  modes: TrainingMode[];
  note: Bilingual;
}

/**
 * The fact sheet in the right-hand rail of the public /programme page.
 *
 * Total hours, the module line and the elective count are deliberately absent: the site sums those
 * from the modules, so they cannot contradict the Modules page.
 */
export interface ProgrammeFacts {
  idealMonths: number;
  validityMonths: number;
  securityDeposit: number;
  applyLeadDays: number;
  partnerName: string;
}

export interface UpdateProgrammePageInput {
  intro: Bilingual;
  objectives: Bilingual[];
  methodology: MethodologyRow[];
  assessment: AssessmentRow[];
  assessmentNote: Bilingual;
  certification: Bilingual[];
  trainingModes: TrainingModes;
  facts: ProgrammeFacts;
  isPublished?: boolean;
}

export interface ApiProgrammePage extends Required<UpdateProgrammePageInput> {
  id: string;
  updatedAt: string;
}

/* The tabs of the read-only Programme page view, one per part of the public page, in website order. */
export const PROGRAMME_TABS = [
  { k: 'about', l: 'About the programme' },
  { k: 'methodology', l: 'Learning methodology' },
  { k: 'assessment', l: 'Assessment' },
  { k: 'certification', l: 'Certification' },
  { k: 'facts', l: 'Fact sheet' },
  { k: 'modes', l: 'Training modes' },
] as const;
export type ProgrammeTab = (typeof PROGRAMME_TABS)[number]['k'];

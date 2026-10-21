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

export interface UpdateProgrammePageInput {
  intro: Bilingual;
  objectives: Bilingual[];
  methodology: MethodologyRow[];
  assessment: AssessmentRow[];
  assessmentNote: Bilingual;
  certification: Bilingual[];
  trainingModes: TrainingModes;
  isPublished?: boolean;
}

export interface ApiProgrammePage extends Required<UpdateProgrammePageInput> {
  id: string;
  updatedAt: string;
}

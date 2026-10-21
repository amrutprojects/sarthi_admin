/* Modules Page Management, as /api/v1/cms/modules returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are always required. */
export interface Bilingual {
  mr: string;
  en: string;
}

/*
 * MAIN runs for every candidate; ELECTIVE is one the candidate picks an employment domain within.
 * Offered as a dropdown on each module card.
 */
export const MODULE_KINDS = ['MAIN', 'ELECTIVE'] as const;
export type ModuleKind = (typeof MODULE_KINDS)[number];

export const MODULE_KIND_LABEL: Record<ModuleKind, string> = {
  MAIN: 'Main module',
  ELECTIVE: 'Elective',
};

/** One module's own timetable. Training plus assessment must equal the module total. */
export interface ModuleTimeSplit {
  moduleHours: number;
  trainingHours: number;
  assessmentHours: number;
  weeksPerModule: number;
  daysPerWeek: number;
  hoursPerDay: number;
  weeklyAssessmentHours: number;
}

/** The two shares of the learning-path donut. They must total 100. */
export interface LearningPath {
  sessionLength: Bilingual;
  sessionLabel: Bilingual;
  fixedPathPct: number;
  selfPathPct: number;
}

/** Figures the home page prints that the module lists cannot supply. */
export interface ProgrammeStats {
  districtCount: number;
}

/*
 * One employment domain offered BY ONE MODULE, and the certificate that module awards in it.
 * Each module carries its own list, so editing one leaves the others alone.
 */
export interface ApiElectiveDomain {
  id: string;
  no: number;
  domain: Bilingual;
  certificate: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ApiModule {
  id: string;
  no: number;
  code: string;
  kind: ModuleKind;
  name: Bilingual;
  description: Bilingual;
  /* This module's own timetable. */
  timeSplit: ModuleTimeSplit;
  displayOrder: number;
  /*
   * Whether this module is shown on the website and counted in the programme totals. For an
   * elective this is the "include it" tick box; a module that is off appears nowhere and adds
   * nothing to the hours.
   */
  isActive: boolean;
  electives: ApiElectiveDomain[];
}

export interface ApiModulesPage {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  modules: ApiModule[];
  learningPath: LearningPath;
  stats: ProgrammeStats;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateModulesPageInput {
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  modules: {
    no: number;
    code: string;
    kind: ModuleKind;
    name: Bilingual;
    description: Bilingual;
    timeSplit: ModuleTimeSplit;
    displayOrder: number;
    isActive: boolean;
    electives: {
      no: number;
      domain: Bilingual;
      certificate: string;
      displayOrder: number;
      isActive: boolean;
    }[];
  }[];
  learningPath: LearningPath;
  isPublished: boolean;
}

/*
 * Error keys are built as paths rather than drawn from a fixed list, because the modules and their
 * domains are lists an administrator adds to — "modules.2.timeSplit.moduleHours" names one input.
 */
export type ModulesField = string;

/* Modules Page Management, as /api/v1/cms/modules returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are always required. */
export interface Bilingual {
  mr: string;
  en: string;
}

/*
 * How one module's hours divide. The same split applies to every module, which is why it is one
 * record rather than a field on each card. Training + assessment must equal the module total —
 * that is the programme's own arithmetic, and the database enforces it.
 */
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

export interface ApiModule {
  id: string;
  no: number;
  code: string;
  name: Bilingual;
  description: Bilingual;
  /* True for the modules that carry the employment-domain choice. */
  elective: boolean;
  displayOrder: number;
  isActive: boolean;
  /* This module's own domains. Empty for a core module. */
  electives: ApiElectiveDomain[];
}

/*
 * One employment domain offered BY ONE MODULE, and the certificate that module awards in it.
 *
 * Each elective module carries its own list, so module 3 and module 4 can offer different domains
 * and editing one leaves the other alone. The certificate is single, because it is this module's
 * award in this domain — which module the row belongs to is what makes it the basic or advanced one.
 */
export interface ApiElectiveDomain {
  id: string;
  no: number;
  domain: Bilingual;
  certificate: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ApiModulesPage {
  id: string;
  modules: ApiModule[];
  timeSplit: ModuleTimeSplit;
  learningPath: LearningPath;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateModulesPageInput {
  modules: {
    no: number;
    code: string;
    name: Bilingual;
    description: Bilingual;
    elective: boolean;
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
  timeSplit: ModuleTimeSplit;
  learningPath: LearningPath;
  isPublished: boolean;
}

/*
 * Error keys are built as paths rather than drawn from a fixed list, because the modules and
 * domains are lists an administrator adds to — "modules.2.name.mr" names one input.
 */
export type ModulesField = string;

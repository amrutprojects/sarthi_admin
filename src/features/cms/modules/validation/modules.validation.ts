import type { FieldErrors } from '../../validation';
import type {
  ApiModulesPage,
  Bilingual,
  ModuleKind,
  ModulesField,
  UpdateModulesPageInput,
} from '../types/modules.types';

/*
 * Modules page form rules, deliberately identical to the server rules in
 * backend/src/cms/modules/modules.validator.ts and to the CHECK constraints on the three tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 *
 * Each module carries its OWN timetable and its OWN employment domains, so both are nested inside
 * the module rather than kept as page-wide records.
 */

export interface BilingualValue {
  mr: string;
  en: string;
}

/* Numbers are held as strings while typing, so a half-deleted value does not become 0 or NaN. */
export interface TimeSplitFormValues {
  moduleHours: string;
  trainingHours: string;
  assessmentHours: string;
  weeksPerModule: string;
  daysPerWeek: string;
  hoursPerDay: string;
  weeklyAssessmentHours: string;
}

export interface DomainFormValues {
  no: string;
  domain: BilingualValue;
  certificate: string;
  isActive: boolean;
}

export interface ModuleFormValues {
  no: string;
  code: string;
  kind: ModuleKind;
  name: BilingualValue;
  description: BilingualValue;
  timeSplit: TimeSplitFormValues;
  /* Shown on the website and counted in the totals. For an elective this is the "include" box. */
  isActive: boolean;
  electives: DomainFormValues[];
}

export interface ModulesFormValues {
  pageTitle: BilingualValue;
  pageSubtitle: BilingualValue;
  modules: ModuleFormValues[];
  learningPath: {
    sessionLength: BilingualValue;
    sessionLabel: BilingualValue;
    fixedPathPct: string;
    selfPathPct: string;
  };
  facts: {
    idealMonths: string;
    validityMonths: string;
    securityDeposit: string;
    applyLeadDays: string;
    partnerName: string;
  };
  isPublished: boolean;
}

const pairOf = (v: Bilingual | null | undefined): BilingualValue =>
  v ? { mr: v.mr, en: v.en } : { mr: '', en: '' };

/** A sensible starting timetable for a module an administrator has just added. */
export const emptyTimeSplit = (): TimeSplitFormValues => ({
  moduleHours: '120',
  trainingHours: '99',
  assessmentHours: '21',
  weeksPerModule: '6',
  daysPerWeek: '6',
  hoursPerDay: '3',
  weeklyAssessmentHours: '3.5',
});

export const emptyModule = (): ModuleFormValues => ({
  no: '',
  code: '',
  kind: 'MAIN',
  name: { mr: '', en: '' },
  description: { mr: '', en: '' },
  timeSplit: emptyTimeSplit(),
  isActive: true,
  electives: [],
});

export const emptyDomain = (): DomainFormValues => ({
  no: '',
  domain: { mr: '', en: '' },
  certificate: '',
  isActive: true,
});

export function toFormValues(page: ApiModulesPage): ModulesFormValues {
  return {
    pageTitle: pairOf(page.pageTitle),
    pageSubtitle: pairOf(page.pageSubtitle),
    modules: page.modules.map((m) => ({
      no: String(m.no),
      code: m.code,
      kind: m.kind,
      name: pairOf(m.name),
      description: pairOf(m.description),
      timeSplit: {
        moduleHours: String(m.timeSplit.moduleHours),
        trainingHours: String(m.timeSplit.trainingHours),
        assessmentHours: String(m.timeSplit.assessmentHours),
        weeksPerModule: String(m.timeSplit.weeksPerModule),
        daysPerWeek: String(m.timeSplit.daysPerWeek),
        hoursPerDay: String(m.timeSplit.hoursPerDay),
        weeklyAssessmentHours: String(m.timeSplit.weeklyAssessmentHours),
      },
      isActive: m.isActive,
      electives: m.electives.map((d) => ({
        no: String(d.no),
        domain: pairOf(d.domain),
        certificate: d.certificate,
        isActive: d.isActive,
      })),
    })),
    learningPath: {
      sessionLength: pairOf(page.learningPath.sessionLength),
      sessionLabel: pairOf(page.learningPath.sessionLabel),
      fixedPathPct: String(page.learningPath.fixedPathPct),
      selfPathPct: String(page.learningPath.selfPathPct),
    },
    facts: {
      idealMonths: String(page.facts.idealMonths),
      validityMonths: String(page.facts.validityMonths),
      securityDeposit: String(page.facts.securityDeposit),
      applyLeadDays: String(page.facts.applyLeadDays),
      partnerName: page.facts.partnerName,
    },
    isPublished: page.isPublished,
  };
}

const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });

/** Parses a typed number. NaN here means the field failed validation and will not be submitted. */
export const asNumber = (raw: string): number => Number(raw.trim());

export function toPayload(v: ModulesFormValues): UpdateModulesPageInput {
  return {
    pageTitle: trimPair(v.pageTitle),
    pageSubtitle: trimPair(v.pageSubtitle),
    modules: v.modules.map((m, index) => ({
      no: asNumber(m.no),
      code: m.code.trim().toUpperCase(),
      kind: m.kind,
      name: trimPair(m.name),
      description: trimPair(m.description),
      timeSplit: {
        moduleHours: asNumber(m.timeSplit.moduleHours),
        trainingHours: asNumber(m.timeSplit.trainingHours),
        assessmentHours: asNumber(m.timeSplit.assessmentHours),
        weeksPerModule: asNumber(m.timeSplit.weeksPerModule),
        daysPerWeek: asNumber(m.timeSplit.daysPerWeek),
        hoursPerDay: asNumber(m.timeSplit.hoursPerDay),
        weeklyAssessmentHours: asNumber(m.timeSplit.weeklyAssessmentHours),
      },
      displayOrder: index,
      isActive: m.isActive,
      electives: m.electives.map((d, k) => ({
        no: asNumber(d.no),
        domain: trimPair(d.domain),
        certificate: d.certificate.trim(),
        displayOrder: k,
        isActive: d.isActive,
      })),
    })),
    learningPath: {
      sessionLength: trimPair(v.learningPath.sessionLength),
      sessionLabel: trimPair(v.learningPath.sessionLabel),
      fixedPathPct: asNumber(v.learningPath.fixedPathPct),
      selfPathPct: asNumber(v.learningPath.selfPathPct),
    },
    facts: {
      idealMonths: asNumber(v.facts.idealMonths),
      validityMonths: asNumber(v.facts.validityMonths),
      securityDeposit: asNumber(v.facts.securityDeposit),
      applyLeadDays: asNumber(v.facts.applyLeadDays),
      partnerName: v.facts.partnerName.trim(),
    },
    isPublished: v.isPublished,
  };
}

/* ---------------- rules ---------------- */

const requiredText = (value: string, label: string, max: number): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  return undefined;
};

const requiredNumber = (
  raw: string,
  label: string,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): string | undefined => {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (opts.integer && !Number.isInteger(n)) return `${label} must be a whole number`;
  if (opts.min !== undefined && n < opts.min) return `${label} must be at least ${opts.min}`;
  if (opts.max !== undefined && n > opts.max) return `${label} must be at most ${opts.max}`;
  return undefined;
};

function pairErrors(
  errors: FieldErrors<ModulesField>,
  prefix: string,
  value: BilingualValue,
  label: string,
  max: number,
): void {
  errors[`${prefix}.mr`] = requiredText(value.mr, `${label} (Marathi)`, max);
  errors[`${prefix}.en`] = requiredText(value.en, `${label} (English)`, max);
}

/** One module's timetable. The arithmetic is checked once the three hour fields are each valid. */
function timeSplitErrors(
  errors: FieldErrors<ModulesField>,
  prefix: string,
  t: TimeSplitFormValues,
): void {
  errors[`${prefix}.moduleHours`] = requiredNumber(t.moduleHours, 'Module hours', {
    min: 0,
    integer: true,
  });
  errors[`${prefix}.trainingHours`] = requiredNumber(t.trainingHours, 'Training hours', {
    min: 0,
    integer: true,
  });
  errors[`${prefix}.assessmentHours`] = requiredNumber(t.assessmentHours, 'Assessment hours', {
    min: 0,
    integer: true,
  });
  errors[`${prefix}.weeksPerModule`] = requiredNumber(t.weeksPerModule, 'Weeks', {
    min: 0,
    integer: true,
  });
  errors[`${prefix}.daysPerWeek`] = requiredNumber(t.daysPerWeek, 'Days per week', {
    min: 0,
    max: 7,
    integer: true,
  });
  errors[`${prefix}.hoursPerDay`] = requiredNumber(t.hoursPerDay, 'Hours per day', {
    min: 0,
    max: 24,
    integer: true,
  });
  errors[`${prefix}.weeklyAssessmentHours`] = requiredNumber(
    t.weeklyAssessmentHours,
    'Assessment hours per week',
    { min: 0, max: 168 },
  );

  if (
    !errors[`${prefix}.moduleHours`] &&
    !errors[`${prefix}.trainingHours`] &&
    !errors[`${prefix}.assessmentHours`]
  ) {
    const training = Number(t.trainingHours);
    const assessment = Number(t.assessmentHours);
    const total = Number(t.moduleHours);
    if (training + assessment !== total) {
      errors[`${prefix}.moduleHours`] =
        `Training (${training}) and assessment (${assessment}) add up to ${training + assessment}, not ${total}`;
    }
  }
}

export function validateModulesForm(v: ModulesFormValues): FieldErrors<ModulesField> {
  const errors: FieldErrors<ModulesField> = {};

  pairErrors(errors, 'pageTitle', v.pageTitle, 'Page title', 200);
  pairErrors(errors, 'pageSubtitle', v.pageSubtitle, 'Page subtitle', 500);

  /* ---- module cards ---- */
  if (v.modules.length < 1) errors['modules'] = 'At least one module is required';

  const seenCodes = new Set<string>();
  v.modules.forEach((m, i) => {
    errors[`modules.${i}.no`] = requiredNumber(m.no, 'Module number', {
      min: 0,
      max: 99,
      integer: true,
    });

    const codeError = requiredText(m.code, 'Module code', 32);
    const code = m.code.trim().toUpperCase();
    errors[`modules.${i}.code`] =
      codeError ?? (seenCodes.has(code) ? `Module code ${m.code} is already used` : undefined);
    if (code) seenCodes.add(code);

    pairErrors(errors, `modules.${i}.name`, m.name, 'Module name', 300);
    pairErrors(errors, `modules.${i}.description`, m.description, 'Module description', 600);
    timeSplitErrors(errors, `modules.${i}.timeSplit`, m.timeSplit);

    /* ---- this module's domains ---- */
    const seenNumbers = new Set<number>();
    m.electives.forEach((d, k) => {
      const prefix = `modules.${i}.electives.${k}`;
      const noError = requiredNumber(d.no, 'Domain number', { min: 0, max: 999, integer: true });
      const n = Number(d.no.trim());
      errors[`${prefix}.no`] =
        noError ??
        (seenNumbers.has(n) ? `Domain number ${n} is already used in this module` : undefined);
      if (!noError) seenNumbers.add(n);

      pairErrors(errors, `${prefix}.domain`, d.domain, 'Domain name', 200);
      errors[`${prefix}.certificate`] = requiredText(d.certificate, 'Certificate', 300);
    });
  });

  /* ---- learning path ---- */
  pairErrors(
    errors,
    'learningPath.sessionLength',
    v.learningPath.sessionLength,
    'Session length',
    40,
  );
  pairErrors(errors, 'learningPath.sessionLabel', v.learningPath.sessionLabel, 'Session label', 80);
  errors['learningPath.fixedPathPct'] = requiredNumber(
    v.learningPath.fixedPathPct,
    'Fixed-path share',
    { min: 0, max: 100, integer: true },
  );
  errors['learningPath.selfPathPct'] = requiredNumber(
    v.learningPath.selfPathPct,
    'Self-path share',
    { min: 0, max: 100, integer: true },
  );

  /* A donut whose shares do not total 100 draws a chart that misstates the split. */
  if (!errors['learningPath.fixedPathPct'] && !errors['learningPath.selfPathPct']) {
    const sum = Number(v.learningPath.fixedPathPct) + Number(v.learningPath.selfPathPct);
    if (sum !== 100) {
      errors['learningPath.fixedPathPct'] = `The two shares add up to ${sum}, not 100`;
    }
  }

  /* ---- the /programme fact sheet ---- */
  errors['facts.idealMonths'] = requiredNumber(v.facts.idealMonths, 'Ideal duration', {
    min: 0,
    max: 120,
    integer: true,
  });
  errors['facts.validityMonths'] = requiredNumber(v.facts.validityMonths, 'Validity', {
    min: 0,
    max: 240,
    integer: true,
  });
  errors['facts.securityDeposit'] = requiredNumber(v.facts.securityDeposit, 'Security deposit', {
    min: 0,
    max: 10_000_000,
    integer: true,
  });
  errors['facts.applyLeadDays'] = requiredNumber(v.facts.applyLeadDays, 'Apply before', {
    min: 0,
    max: 365,
    integer: true,
  });
  errors['facts.partnerName'] = requiredText(v.facts.partnerName, 'Partner name', 150);

  return errors;
}

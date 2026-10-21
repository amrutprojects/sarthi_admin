import type { FieldErrors } from '../../validation';
import type { ApiModulesPage, Bilingual, ModulesField, UpdateModulesPageInput } from '../types/modules.types';

/*
 * Modules page form rules, deliberately identical to the server rules in
 * backend/src/cms/modules/modules.validator.ts and to the CHECK constraints on the three tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 *
 * Employment domains belong to a MODULE: every module carries its own list, so they are nested
 * inside the module rather than kept as one page-wide list.
 */

export interface BilingualValue {
  mr: string;
  en: string;
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
  name: BilingualValue;
  description: BilingualValue;
  elective: boolean;
  isActive: boolean;
  /* This module's own domains. Empty when the module offers none. */
  electives: DomainFormValues[];
}

/* Numbers are held as strings while typing, so a half-deleted value does not become 0 or NaN. */
export interface ModulesFormValues {
  modules: ModuleFormValues[];
  timeSplit: {
    moduleHours: string;
    trainingHours: string;
    assessmentHours: string;
    weeksPerModule: string;
    daysPerWeek: string;
    hoursPerDay: string;
    weeklyAssessmentHours: string;
  };
  learningPath: {
    sessionLength: BilingualValue;
    sessionLabel: BilingualValue;
    fixedPathPct: string;
    selfPathPct: string;
  };
  isPublished: boolean;
}

const pairOf = (v: Bilingual | null | undefined): BilingualValue => (v ? { mr: v.mr, en: v.en } : { mr: '', en: '' });

export const emptyModule = (): ModuleFormValues => ({
  no: '',
  code: '',
  name: { mr: '', en: '' },
  description: { mr: '', en: '' },
  elective: false,
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
    modules: page.modules.map((m) => ({
      no: String(m.no),
      code: m.code,
      name: pairOf(m.name),
      description: pairOf(m.description),
      elective: m.elective,
      isActive: m.isActive,
      electives: m.electives.map((d) => ({
        no: String(d.no),
        domain: pairOf(d.domain),
        certificate: d.certificate,
        isActive: d.isActive,
      })),
    })),
    timeSplit: {
      moduleHours: String(page.timeSplit.moduleHours),
      trainingHours: String(page.timeSplit.trainingHours),
      assessmentHours: String(page.timeSplit.assessmentHours),
      weeksPerModule: String(page.timeSplit.weeksPerModule),
      daysPerWeek: String(page.timeSplit.daysPerWeek),
      hoursPerDay: String(page.timeSplit.hoursPerDay),
      weeklyAssessmentHours: String(page.timeSplit.weeklyAssessmentHours),
    },
    learningPath: {
      sessionLength: pairOf(page.learningPath.sessionLength),
      sessionLabel: pairOf(page.learningPath.sessionLabel),
      fixedPathPct: String(page.learningPath.fixedPathPct),
      selfPathPct: String(page.learningPath.selfPathPct),
    },
    isPublished: page.isPublished,
  };
}

const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });

/** Parses a typed number. NaN here means the field failed validation and will not be submitted. */
export const asNumber = (raw: string): number => Number(raw.trim());

export function toPayload(v: ModulesFormValues): UpdateModulesPageInput {
  return {
    modules: v.modules.map((m, index) => ({
      no: asNumber(m.no),
      code: m.code.trim().toUpperCase(),
      name: trimPair(m.name),
      description: trimPair(m.description),
      elective: m.elective,
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
    timeSplit: {
      moduleHours: asNumber(v.timeSplit.moduleHours),
      trainingHours: asNumber(v.timeSplit.trainingHours),
      assessmentHours: asNumber(v.timeSplit.assessmentHours),
      weeksPerModule: asNumber(v.timeSplit.weeksPerModule),
      daysPerWeek: asNumber(v.timeSplit.daysPerWeek),
      hoursPerDay: asNumber(v.timeSplit.hoursPerDay),
      weeklyAssessmentHours: asNumber(v.timeSplit.weeklyAssessmentHours),
    },
    learningPath: {
      sessionLength: trimPair(v.learningPath.sessionLength),
      sessionLabel: trimPair(v.learningPath.sessionLabel),
      fixedPathPct: asNumber(v.learningPath.fixedPathPct),
      selfPathPct: asNumber(v.learningPath.selfPathPct),
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

const requiredNumber = (raw: string, label: string, opts: { min?: number; max?: number; integer?: boolean } = {}): string | undefined => {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (opts.integer && !Number.isInteger(n)) return `${label} must be a whole number`;
  if (opts.min !== undefined && n < opts.min) return `${label} must be at least ${opts.min}`;
  if (opts.max !== undefined && n > opts.max) return `${label} must be at most ${opts.max}`;
  return undefined;
};

function pairErrors(errors: FieldErrors<ModulesField>, prefix: string, value: BilingualValue, label: string, max: number): void {
  errors[`${prefix}.mr`] = requiredText(value.mr, `${label} (Marathi)`, max);
  errors[`${prefix}.en`] = requiredText(value.en, `${label} (English)`, max);
}

export function validateModulesForm(v: ModulesFormValues): FieldErrors<ModulesField> {
  const errors: FieldErrors<ModulesField> = {};

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
    errors[`modules.${i}.code`] = codeError ?? (seenCodes.has(code) ? `Module code ${m.code} is already used` : undefined);
    if (code) seenCodes.add(code);

    pairErrors(errors, `modules.${i}.name`, m.name, 'Module name', 300);
    pairErrors(errors, `modules.${i}.description`, m.description, 'Module description', 600);

    /* ---- this module's domains ---- */
    const seenNumbers = new Set<number>();
    m.electives.forEach((d, k) => {
      const prefix = `modules.${i}.electives.${k}`;
      const noError = requiredNumber(d.no, 'Domain number', { min: 0, max: 999, integer: true });
      const n = Number(d.no.trim());
      errors[`${prefix}.no`] = noError ?? (seenNumbers.has(n) ? `Domain number ${n} is already used in this module` : undefined);
      if (!noError) seenNumbers.add(n);

      pairErrors(errors, `${prefix}.domain`, d.domain, 'Domain name', 200);
      errors[`${prefix}.certificate`] = requiredText(d.certificate, 'Certificate', 300);
    });
  });

  /* ---- hours ---- */
  const t = v.timeSplit;
  errors['timeSplit.moduleHours'] = requiredNumber(t.moduleHours, 'Module hours', {
    min: 0,
    integer: true,
  });
  errors['timeSplit.trainingHours'] = requiredNumber(t.trainingHours, 'Training hours', {
    min: 0,
    integer: true,
  });
  errors['timeSplit.assessmentHours'] = requiredNumber(t.assessmentHours, 'Assessment hours', {
    min: 0,
    integer: true,
  });
  errors['timeSplit.weeksPerModule'] = requiredNumber(t.weeksPerModule, 'Weeks per module', {
    min: 0,
    integer: true,
  });
  errors['timeSplit.daysPerWeek'] = requiredNumber(t.daysPerWeek, 'Days per week', {
    min: 0,
    max: 7,
    integer: true,
  });
  errors['timeSplit.hoursPerDay'] = requiredNumber(t.hoursPerDay, 'Hours per day', {
    min: 0,
    max: 24,
    integer: true,
  });
  errors['timeSplit.weeklyAssessmentHours'] = requiredNumber(t.weeklyAssessmentHours, 'Weekly assessment hours', { min: 0, max: 168 });

  /* The programme's arithmetic. Only checked once the three fields are individually valid. */
  if (!errors['timeSplit.moduleHours'] && !errors['timeSplit.trainingHours'] && !errors['timeSplit.assessmentHours']) {
    const training = Number(t.trainingHours);
    const assessment = Number(t.assessmentHours);
    const total = Number(t.moduleHours);
    if (training + assessment !== total) {
      errors['timeSplit.moduleHours'] =
        `Training (${training}) and assessment (${assessment}) add up to ${training + assessment}, not ${total}`;
    }
  }

  /* ---- learning path ---- */
  pairErrors(errors, 'learningPath.sessionLength', v.learningPath.sessionLength, 'Session length', 40);
  pairErrors(errors, 'learningPath.sessionLabel', v.learningPath.sessionLabel, 'Session label', 80);
  errors['learningPath.fixedPathPct'] = requiredNumber(v.learningPath.fixedPathPct, 'Fixed-path share', {
    min: 0,
    max: 100,
    integer: true,
  });
  errors['learningPath.selfPathPct'] = requiredNumber(v.learningPath.selfPathPct, 'Self-path share', { min: 0, max: 100, integer: true });

  /* A donut whose shares do not total 100 draws a chart that misstates the split. */
  if (!errors['learningPath.fixedPathPct'] && !errors['learningPath.selfPathPct']) {
    const sum = Number(v.learningPath.fixedPathPct) + Number(v.learningPath.selfPathPct);
    if (sum !== 100) {
      errors['learningPath.fixedPathPct'] = `The two shares add up to ${sum}, not 100`;
    }
  }

  return errors;
}

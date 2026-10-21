import { describe, expect, it } from 'vitest';
import type { ApiModule, ApiModulesPage } from './types/modules.types';
import { emptyModule, toFormValues, toPayload, validateModulesForm } from './validation/modules.validation';

const pair = (mr: string, en: string) => ({ mr, en });

const timeSplit = {
  moduleHours: 120,
  trainingHours: 99,
  assessmentHours: 21,
  weeksPerModule: 6,
  daysPerWeek: 6,
  hoursPerDay: 3,
  weeklyAssessmentHours: 3.5,
};

const page: ApiModulesPage = {
  id: 'm1',
  pageTitle: pair('मॉड्यूल्स', 'Modules'),
  pageSubtitle: pair('उपशीर्षक', 'Subtitle'),
  modules: [
    {
      id: 'mod1',
      no: 1,
      code: 'ECS',
      kind: 'MAIN',
      name: pair('नाव', 'Name'),
      description: pair('वर्णन', 'Description'),
      timeSplit,
      displayOrder: 0,
      isActive: true,
      showElectiveLabel: true,
      electives: [],
    },
    {
      id: 'mod2',
      no: 2,
      code: 'DS',
      kind: 'ELECTIVE',
      name: pair('ऐच्छिक', 'Domain skills'),
      description: pair('वर्णन', 'Description'),
      timeSplit,
      displayOrder: 1,
      isActive: true,
      showElectiveLabel: false,
      electives: [],
    },
  ],
  learningPath: { sessionLength: pair('१ तास', '1 hr'), sessionLabel: pair('सत्र', 'Session'), fixedPathPct: 60, selfPathPct: 40 },
  stats: { districtCount: 36 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

/* The fact sheet moved to the Programme page: the Modules PUT is .strict() and rejects a "facts" key. */
describe('Modules page payload', () => {
  it('never sends a fact sheet, even if an older server still returns one', () => {
    const legacy = { ...page, facts: { idealMonths: 6, validityMonths: 12, securityDeposit: 2000, applyLeadDays: 30, partnerName: 'X' } };
    const values = toFormValues(legacy);
    expect(values).not.toHaveProperty('facts');
    expect(toPayload(values)).not.toHaveProperty('facts');
  });

  it('validates without any facts.* rule', () => {
    const errors = validateModulesForm(toFormValues(page));
    expect(Object.keys(errors).filter((k) => k.startsWith('facts.'))).toEqual([]);
    expect(Object.values(errors).filter(Boolean)).toEqual([]);
  });

  /* The publish switch is gone: the PUT is .strict() and now rejects an "isPublished" key. */
  it('never sends isPublished, even though the server may still return it', () => {
    const legacy = { ...page, isPublished: false };
    const values = toFormValues(legacy);
    expect(values).not.toHaveProperty('isPublished');
    const body = toPayload(values);
    expect(body).not.toHaveProperty('isPublished');
    expect(Object.keys(body).sort()).toEqual(['learningPath', 'modules', 'pageSubtitle', 'pageTitle']);
  });
});

describe("Modules page 'Elective' label setting", () => {
  it('prefills each module from the server', () => {
    expect(toFormValues(page).modules.map((m) => m.showElectiveLabel)).toEqual([true, false]);
  });

  it('sends showElectiveLabel on every module, Main ones included', () => {
    const body = toPayload(toFormValues(page));
    expect(body.modules.map((m) => m.showElectiveLabel)).toEqual([true, false]);
  });

  it('keeps an unticked value when the module is switched to Main', () => {
    const values = toFormValues(page);
    const switched = { ...values, modules: values.modules.map((m) => ({ ...m, kind: 'MAIN' as const })) };
    expect(toPayload(switched).modules[1]!.showElectiveLabel).toBe(false);
  });

  it('treats a module from an older server without the setting as showing the label', () => {
    const { showElectiveLabel: _dropped, ...older } = page.modules[1]!;
    const values = toFormValues({ ...page, modules: [older as ApiModule] });
    expect(values.modules[0]!.showElectiveLabel).toBe(true);
  });

  it('shows the label on a newly added module', () => {
    expect(emptyModule().showElectiveLabel).toBe(true);
  });
});

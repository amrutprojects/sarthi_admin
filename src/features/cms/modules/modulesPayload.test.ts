import { describe, expect, it } from 'vitest';
import type { ApiModulesPage } from './types/modules.types';
import { toFormValues, toPayload, validateModulesForm } from './validation/modules.validation';

const pair = (mr: string, en: string) => ({ mr, en });

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
      timeSplit: {
        moduleHours: 120,
        trainingHours: 99,
        assessmentHours: 21,
        weeksPerModule: 6,
        daysPerWeek: 6,
        hoursPerDay: 3,
        weeklyAssessmentHours: 3.5,
      },
      displayOrder: 0,
      isActive: true,
      electives: [],
    },
  ],
  learningPath: { sessionLength: pair('१ तास', '1 hr'), sessionLabel: pair('सत्र', 'Session'), fixedPathPct: 60, selfPathPct: 40 },
  stats: { districtCount: 36 },
  isPublished: true,
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
});

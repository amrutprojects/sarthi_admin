import { describe, expect, it } from 'vitest';
import { emptyLmsEntityForm, lmsEntityFormFrom, normalizeLmsEntityForm, validateLmsEntityForm } from '../validation/entity.validation';
import { entity } from './fixtures';

const valid = { ...emptyLmsEntityForm('Asia/Kolkata'), name: 'Amrut Kalash', code: 'AMK-01', defaultLanguage: 'en' };

describe('Entity form rules (F-LMS-03)', () => {
  it('accepts a complete form', () => {
    expect(Object.values(validateLmsEntityForm(valid)).filter(Boolean)).toEqual([]);
  });

  it('applies the name, code, description, language and time zone rules', () => {
    expect(validateLmsEntityForm({ ...valid, name: '  ' }).name).toBe('Enter an entity name.');
    expect(validateLmsEntityForm({ ...valid, name: 'Ab' }).name).toMatch(/at least 3/);
    expect(validateLmsEntityForm({ ...valid, name: 'x'.repeat(121) }).name).toMatch(/at most 120/);
    expect(validateLmsEntityForm({ ...valid, code: '' }).code).toBe('Enter an entity code.');
    expect(validateLmsEntityForm({ ...valid, code: 'A' }).code).toMatch(/at least 2/);
    expect(validateLmsEntityForm({ ...valid, code: 'A'.repeat(21) }).code).toMatch(/at most 20/);
    expect(validateLmsEntityForm({ ...valid, code: 'AB_1' }).code).toBe('Use capital letters, digits and hyphens.');
    /* Lower case is accepted: it is upper-cased before sending. */
    expect(validateLmsEntityForm({ ...valid, code: 'amk-1' }).code).toBeUndefined();
    expect(validateLmsEntityForm({ ...valid, description: 'x'.repeat(501) }).description).toMatch(/Shorten the description/);
    expect(validateLmsEntityForm({ ...valid, defaultLanguage: '' }).defaultLanguage).toBe('Select a language.');
    expect(validateLmsEntityForm({ ...valid, timeZone: '' }).timeZone).toBe('Select a time zone.');
  });

  it('normalises what is sent and reads an entity back into the form', () => {
    expect(normalizeLmsEntityForm({ ...valid, name: '  Amrut   Kalash ', code: ' amk-01 ', description: '   ' })).toMatchObject({
      name: 'Amrut Kalash', code: 'AMK-01', description: null,
    });
    expect(lmsEntityFormFrom(entity())).toMatchObject({ code: 'AMK', centreIds: ['c1', 'c2'], trackIds: ['t1'], defaultLanguage: 'mr' });
  });
});

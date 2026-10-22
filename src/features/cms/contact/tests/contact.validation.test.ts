import { describe, expect, it } from 'vitest';
import {
  emptyCoordinator,
  emptyOffice,
  validateCoordinatorPhone,
  validatePhone,
  validateSections,
  type ContactFormValues,
} from '../validation/contact.validation';

/*
 * Phone rules, mirroring backend contact.validator.ts: a coordinator's phone may keep digits masked
 * with X ("+91 98XXX 41201", as the public site has always shown them); every other phone may not.
 */
describe('validateCoordinatorPhone', () => {
  it('accepts the masked numbers the website shows, and plain numbers', () => {
    for (const phone of ['+91 98XXX 41201', '+91 98xxx 41205', '  +91 98XXX 41201  ', '+91 98000 41201', '(020) 2567-8901']) {
      expect({ phone, error: validateCoordinatorPhone(phone, 'Phone') }).toEqual({ phone, error: undefined });
    }
  });

  it('rejects letters other than X', () => {
    for (const phone of ['+91 98ABC 41201', '+91 98YYY 41201', '+91 98XXX 4120O', 'call 98XXX 41201']) {
      expect(validateCoordinatorPhone(phone, 'Phone')).toMatch(/may use digits \(or X for a masked digit\)/);
    }
  });

  it('counts X as a digit for the 6–20 digit rule', () => {
    expect(validateCoordinatorPhone('98XXX', 'Phone')).toBe('Phone must contain between 6 and 20 digits');
    expect(validateCoordinatorPhone('98XXXX', 'Phone')).toBeUndefined();
    expect(validateCoordinatorPhone(`+91 ${'X'.repeat(18)}`, 'Phone')).toBeUndefined();
    expect(validateCoordinatorPhone(`+91 ${'X'.repeat(19)}`, 'Phone')).toBe('Phone must contain between 6 and 20 digits');
  });

  it('requires a value and caps the length at 32 characters', () => {
    expect(validateCoordinatorPhone('   ', 'Phone')).toBe('Phone is required');
    expect(validateCoordinatorPhone(`+91 ${'9'.repeat(5)} ${' '.repeat(24)}1`, 'Phone')).toBe('Phone must be at most 32 characters');
  });
});

describe('organisation and district office phones', () => {
  it('validatePhone still rejects a masked X', () => {
    expect(validatePhone('+91 97XXX 51450', 'Phone')).toMatch(/may use digits, spaces, brackets and hyphens/);
    expect(validatePhone('+91 97301 51450', 'Phone')).toBeUndefined();
  });

  it('validateSections allows X in a coordinator phone but not in an office phone', () => {
    const coordinator = { ...emptyCoordinator(), name: 'Rajesh Kulkarni', phone: '+91 98XXX 41201' };
    const office = { ...emptyOffice({ id: 'd1', name: 'Pune', code: 'PUN' }), phone: '+91 20XXX 12345' };
    const values = { coordinators: [coordinator], offices: [office] } as unknown as ContactFormValues;

    const errors = validateSections(values);
    expect(errors[`coord.${coordinator.key}.phone`]).toBeUndefined();
    expect(errors[`office.${office.key}.phone`]).toMatch(/Official phone may use digits, spaces, brackets and hyphens/);
  });
});

import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, NAV, isNavGroup } from '../../../constants/navigation';
import { canDo, canOpen } from '../../../modules/auth/permissions';
import {
  emptyCentreForm, normalizeCentreForm, sameTechnologySet, validateCentreForm, validateContactPerson, type CentreFormValues,
} from './validation/centre.validation';

const valid: CentreFormValues = {
  ...emptyCentreForm('s-mh', 'd-pun'),
  name: 'Pune  Skill Centre',
  code: 'pun-01',
  contactPerson: ' Asha  Patil ',
  contactNumber: '98765 43210',
  email: 'Office@Centre.ORG',
  technologyCodes: ['T03', 'T05', 'T03'],
};

describe('validateCentreForm', () => {
  it('accepts a complete form and leaves the optionals optional', () => {
    expect(Object.values(validateCentreForm(valid)).filter(Boolean)).toEqual([]);
    const minimal = { ...emptyCentreForm('s-mh', 'd-pun'), name: 'Pune Centre', code: 'PUN' };
    expect(Object.values(validateCentreForm(minimal)).filter(Boolean)).toEqual([]);
  });

  it('requires state, district, name and code', () => {
    const errors = validateCentreForm(emptyCentreForm());
    expect(errors.stateId).toBe('State is required');
    expect(errors.districtId).toBe('District is required');
    expect(errors.name).toBe('Center name is required');
    expect(errors.code).toBe('Center code is required');
  });

  it('checks the contact person as a person name of up to 120 characters', () => {
    expect(validateContactPerson('')).toBeUndefined();
    expect(validateContactPerson("D'Souza R. Patil-Kale")).toBeUndefined();
    expect(validateContactPerson('Asha 2')).toMatch(/only letters, spaces/);
    expect(validateContactPerson('A'.repeat(121))).toBe('Contact person must be at most 120 characters');
  });

  it('allows at most 50 distinct technologies', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `T${i}`);
    expect(validateCentreForm({ ...valid, technologyCodes: ids }).technologyCodes).toMatch(/at most 50/);
    expect(validateCentreForm({ ...valid, technologyCodes: ids.slice(0, 50) }).technologyCodes).toBeUndefined();
  });
});

describe('normalizeCentreForm', () => {
  it('trims, upper-cases the code, nulls empty optionals and de-duplicates technologies', () => {
    const p = normalizeCentreForm(valid);
    expect(p).toMatchObject({
      name: 'Pune Skill Centre',
      code: 'PUN-01',
      contactPerson: 'Asha Patil',
      contactNumber: '9876543210',
      email: 'office@centre.org',
      talukaId: null,
      address: null,
      pinCode: null,
      technologyCodes: ['T03', 'T05'],
    });
  });

  it('compares allocations as sets, so re-ordering is not a change', () => {
    expect(sameTechnologySet(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameTechnologySet(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('Center Master menu', () => {
  it('sits right after College Master and routes list, create, edit and view under cms-centres', () => {
    const items = NAV.filter((n) => !isNavGroup(n)).map((n) => (isNavGroup(n) ? '' : n.k));
    expect(items[items.indexOf('cms-colleges') + 1]).toBe('cms-centres');
    expect(ADMIN_ROUTES.filter((r) => r[2] === 'cms-centres')).toEqual([
      ['/cms/centres', 'cmsCentreList', 'cms-centres'],
      ['/cms/centres/create', 'cmsCentreCreate', 'cms-centres'],
      ['/cms/centres/:id/edit', 'cmsCentreEdit', 'cms-centres'],
      ['/cms/centres/:id', 'cmsCentreView', 'cms-centres'],
    ]);
    expect(matchPath('/cms/centres/:id', '/cms/centres/abc')).not.toBeNull();
  });

  it('opens with cms-centres.view and gates the actions on their own codes', () => {
    expect(canOpen(new Set(['cms-centres.view']), 'cms-centres')).toBe(true);
    expect(canOpen(new Set(['cms-colleges.view']), 'cms-centres')).toBe(false);
    expect(canDo(new Set(['cms-centres.delete']), 'deleteCentre')).toBe(true);
    expect(canDo(new Set(['cms-centres.view']), 'updateCentre')).toBe(false);
  });
});

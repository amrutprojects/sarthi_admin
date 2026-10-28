import {
  normalizeCode, normalizeName, optionalValue, requireSelection, validateCode, validateEmail, validateEntityName, validatePhone,
  validatePinCode, validateText, type FieldErrors,
} from '../../validation';
import type { CentreField } from '../types/centre.types';

export interface CentreFormValues {
  stateId: string;
  districtId: string;
  talukaId: string;
  name: string;
  code: string;
  address: string;
  pinCode: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  /* Allocated technology track codes, in the order they were ticked. */
  technologyCodes: string[];
  isActive: boolean;
}

export const MAX_CENTRE_TECHNOLOGIES = 50;

export const emptyCentreForm = (stateId = '', districtId = ''): CentreFormValues => ({
  stateId,
  districtId,
  talukaId: '',
  name: '',
  code: '',
  address: '',
  pinCode: '',
  contactPerson: '',
  contactNumber: '',
  email: '',
  technologyCodes: [],
  isActive: true,
});

/* What is actually sent to the API: empty optionals become null, so the server stores "not recorded". */
export interface CentrePayload {
  stateId: string;
  districtId: string;
  talukaId: string | null;
  name: string;
  code: string;
  address: string | null;
  pinCode: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  technologyCodes: string[];
  isActive: boolean;
}

export const normalizeCentreForm = (v: CentreFormValues): CentrePayload => ({
  stateId: v.stateId,
  districtId: v.districtId,
  talukaId: v.talukaId || null,
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  address: optionalValue(v.address),
  pinCode: optionalValue(v.pinCode),
  contactPerson: optionalValue(normalizeName(v.contactPerson)),
  /* The server drops spaces from phone numbers before checking them; send the same canonical form. */
  contactNumber: optionalValue(v.contactNumber.replace(/\s+/g, '')),
  email: optionalValue(v.email)?.toLowerCase() ?? null,
  technologyCodes: [...new Set(v.technologyCodes)],
  isActive: v.isActive,
});

/* Same rule as the backend's personName: letters, spaces and . ' - , starting with a letter. */
const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export function validateContactPerson(raw: string): string | undefined {
  const value = normalizeName(raw);
  if (!value) return undefined;
  if (value.length > 120) return 'Contact person must be at most 120 characters';
  if (!PERSON_NAME_RE.test(value)) return "Contact person may contain only letters, spaces and . ' -";
  return undefined;
}

/* True when the two allocations hold the same technologies, whatever the order. */
export const sameTechnologySet = (a: readonly string[], b: readonly string[]): boolean => {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((id) => y.has(id));
};

export function validateCentreForm(v: CentreFormValues): FieldErrors<CentreField> {
  return {
    stateId: requireSelection(v.stateId, 'State'),
    districtId: requireSelection(v.districtId, 'District'),
    /* Optional; the dropdown only offers talukas of the chosen district, and the server re-checks that. */
    talukaId: undefined,
    name: validateEntityName(v.name, 'Center name', { max: 150 }),
    code: validateCode(v.code, { label: 'Center code', max: 20, hyphen: true }),
    address: validateText(v.address, 'Address', { max: 300 }),
    pinCode: validatePinCode(v.pinCode),
    contactPerson: validateContactPerson(v.contactPerson),
    contactNumber: validatePhone(v.contactNumber),
    email: validateEmail(v.email),
    technologyCodes:
      new Set(v.technologyCodes).size > MAX_CENTRE_TECHNOLOGIES
        ? `Select at most ${MAX_CENTRE_TECHNOLOGIES} technologies`
        : undefined,
  };
}

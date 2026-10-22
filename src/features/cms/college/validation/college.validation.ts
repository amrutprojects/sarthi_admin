import {
  normalizeCode, normalizeName, optionalValue, requireSelection, validateCode, validateEmail, validateEntityName, validatePhone,
  validatePinCode, validateText, type FieldErrors,
} from '../../validation';
import type { CollegeField } from '../types/college.types';

export interface CollegeFormValues {
  stateId: string;
  districtId: string;
  talukaId: string;
  name: string;
  code: string;
  address: string;
  pinCode: string;
  contactNumber: string;
  email: string;
  isActive: boolean;
}

export const emptyCollegeForm = (stateId = '', districtId = ''): CollegeFormValues => ({
  stateId,
  districtId,
  talukaId: '',
  name: '',
  code: '',
  address: '',
  pinCode: '',
  contactNumber: '',
  email: '',
  isActive: true,
});

/* What is actually sent to the API: empty optionals become null, so the server stores "not recorded". */
export interface CollegePayload {
  stateId: string;
  districtId: string;
  talukaId: string | null;
  name: string;
  code: string;
  address: string | null;
  pinCode: string | null;
  contactNumber: string | null;
  email: string | null;
  isActive: boolean;
}

export const normalizeCollegeForm = (v: CollegeFormValues): CollegePayload => ({
  stateId: v.stateId,
  districtId: v.districtId,
  talukaId: v.talukaId || null,
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  address: optionalValue(v.address),
  pinCode: optionalValue(v.pinCode),
  /* The server drops spaces from phone numbers before checking them; send the same canonical form. */
  contactNumber: optionalValue(v.contactNumber.replace(/\s+/g, '')),
  email: optionalValue(v.email)?.toLowerCase() ?? null,
  isActive: v.isActive,
});

export function validateCollegeForm(v: CollegeFormValues): FieldErrors<CollegeField> {
  return {
    stateId: requireSelection(v.stateId, 'State'),
    districtId: requireSelection(v.districtId, 'District'),
    /* Optional; the dropdown only offers talukas of the chosen district, and the server re-checks that. */
    talukaId: undefined,
    name: validateEntityName(v.name, 'College name', { max: 150 }),
    code: validateCode(v.code, { label: 'College code', max: 20, hyphen: true }),
    address: validateText(v.address, 'Address', { max: 300 }),
    pinCode: validatePinCode(v.pinCode),
    contactNumber: validatePhone(v.contactNumber),
    email: validateEmail(v.email),
  };
}

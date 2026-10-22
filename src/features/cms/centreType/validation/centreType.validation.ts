import { normalizeCode, normalizeName, optionalValue, validateCode, validateEntityName, validateText, type FieldErrors } from '../../validation';
import type { CentreTypeField } from '../types/centreType.types';

export interface CentreTypeFormValues {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export const emptyCentreTypeForm = (): CentreTypeFormValues => ({ name: '', code: '', description: '', isActive: true });

/* The values actually sent to the API: trimmed name with collapsed spaces, upper-cased code, null for an empty description. */
export const normalizeCentreTypeForm = (v: CentreTypeFormValues) => ({
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  description: optionalValue(v.description),
  isActive: v.isActive,
});

export function validateCentreTypeForm(v: CentreTypeFormValues): FieldErrors<CentreTypeField> {
  return {
    name: validateEntityName(v.name, 'Centre type name', { max: 100 }),
    code: validateCode(v.code, { label: 'Centre type code', max: 20, hyphen: true }),
    description: validateText(v.description, 'Description', { max: 500 }),
  };
}

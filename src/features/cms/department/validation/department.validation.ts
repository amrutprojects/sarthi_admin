import { normalizeCode, normalizeName, optionalValue, validateCode, validateEntityName, validateText, type FieldErrors } from '../../validation';
import type { DepartmentField } from '../types/department.types';

export interface DepartmentFormValues {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export const emptyDepartmentForm = (): DepartmentFormValues => ({ name: '', code: '', description: '', isActive: true });

/* The values actually sent to the API: trimmed name with collapsed spaces, upper-cased code, null for an empty description. */
export const normalizeDepartmentForm = (v: DepartmentFormValues) => ({
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  description: optionalValue(v.description),
  isActive: v.isActive,
});

export function validateDepartmentForm(v: DepartmentFormValues): FieldErrors<DepartmentField> {
  return {
    name: validateEntityName(v.name, 'Department name', { max: 100 }),
    code: validateCode(v.code, { label: 'Department code', max: 20, hyphen: true }),
    description: validateText(v.description, 'Description', { max: 500 }),
  };
}

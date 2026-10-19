import { normalizeCode, normalizeName, validateCode, validateName, type FieldErrors } from '../../validation';
import type { StateField } from '../types/state.types';

export interface StateFormValues {
  name: string;
  code: string;
  isActive: boolean;
}

export const emptyStateForm = (): StateFormValues => ({ name: '', code: '', isActive: true });

/* The values actually sent to the API: trimmed name with collapsed spaces, upper-cased code. */
export const normalizeStateForm = (v: StateFormValues) => ({
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  isActive: v.isActive,
});

export function validateStateForm(v: StateFormValues): FieldErrors<StateField> {
  return {
    name: validateName(v.name, 'State name'),
    code: validateCode(v.code, { label: 'State code', max: 10 }),
  };
}

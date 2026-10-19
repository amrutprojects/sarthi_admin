import { normalizeCode, normalizeName, requireSelection, validateCode, validateName, type FieldErrors } from '../../validation';
import type { DistrictField } from '../types/district.types';

export interface DistrictFormValues {
  stateId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export const emptyDistrictForm = (stateId = ''): DistrictFormValues => ({ stateId, name: '', code: '', isActive: true });

export const normalizeDistrictForm = (v: DistrictFormValues) => ({
  stateId: v.stateId,
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  isActive: v.isActive,
});

export function validateDistrictForm(v: DistrictFormValues): FieldErrors<DistrictField> {
  return {
    stateId: requireSelection(v.stateId, 'State'),
    name: validateName(v.name, 'District name'),
    code: validateCode(v.code, { label: 'District code', max: 20, hyphen: true }),
  };
}

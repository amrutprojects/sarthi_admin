import { normalizeCode, normalizeName, requireSelection, validateCode, validateName, type FieldErrors } from '../../validation';
import type { TalukaField } from '../types/taluka.types';

export interface TalukaFormValues {
  stateId: string;
  districtId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export const emptyTalukaForm = (stateId = '', districtId = ''): TalukaFormValues => ({
  stateId,
  districtId,
  name: '',
  code: '',
  isActive: true,
});

/* What is actually sent to the API. The code differs from the form value: "" becomes null. */
export interface TalukaPayload {
  stateId: string;
  districtId: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

/* An empty code is submitted as null: the column is nullable and "" is not a valid code. */
export const normalizeTalukaForm = (v: TalukaFormValues): TalukaPayload => ({
  stateId: v.stateId,
  districtId: v.districtId,
  name: normalizeName(v.name),
  code: normalizeCode(v.code) || null,
  isActive: v.isActive,
});

export function validateTalukaForm(v: TalukaFormValues): FieldErrors<TalukaField> {
  return {
    stateId: requireSelection(v.stateId, 'State'),
    districtId: requireSelection(v.districtId, 'District'),
    name: validateName(v.name, 'Taluka name'),
    /* Optional, but still shape-checked when something was typed. */
    code: validateCode(v.code, { label: 'Taluka code', max: 20, hyphen: true, optional: true }),
  };
}

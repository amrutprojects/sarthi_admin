import {
  normalizeCode, normalizeName, optionalValue, requireSelection, validateCode, validateEmail, validateEntityName, validateMobile,
  validatePhone, validateText, type FieldErrors,
} from '../../validation';
import type { TrainingCentreField } from '../types/trainingCentre.types';

export interface TrainingCentreFormValues {
  /* A · Basic information */
  name: string;
  code: string;
  centreTypeId: string;
  stateId: string;
  districtId: string;
  talukaId: string;
  contactNumber: string;
  email: string;
  /* B · Centre management */
  pocName: string;
  pocMobile: string;
  centreHead: string;
  alternativeContact: string;
  coordinator1: string;
  coordinator2: string;
  isActive: boolean;
}

/* Prefill from a filtered listing (?centreTypeId= / ?stateId= / ?districtId=). */
export const emptyTrainingCentreForm = (prefill: { centreTypeId?: string; stateId?: string; districtId?: string } = {}): TrainingCentreFormValues => ({
  name: '',
  code: '',
  centreTypeId: prefill.centreTypeId ?? '',
  stateId: prefill.stateId ?? '',
  districtId: prefill.stateId ? (prefill.districtId ?? '') : '',
  talukaId: '',
  contactNumber: '',
  email: '',
  pocName: '',
  pocMobile: '',
  centreHead: '',
  alternativeContact: '',
  coordinator1: '',
  coordinator2: '',
  isActive: true,
});

/* What is actually sent to the API: trimmed values, an upper-cased code, null for every empty optional. */
export interface TrainingCentrePayload {
  stateId: string;
  districtId: string;
  name: string;
  /* null = let the server generate one (create only). */
  code: string | null;
  centreTypeId: string | null;
  talukaId: string | null;
  contactNumber: string | null;
  email: string | null;
  pocName: string | null;
  pocMobile: string | null;
  centreHead: string | null;
  alternativeContact: string | null;
  coordinator1: string | null;
  coordinator2: string | null;
  isActive: boolean;
}

export const normalizeTrainingCentreForm = (v: TrainingCentreFormValues): TrainingCentrePayload => ({
  stateId: v.stateId,
  districtId: v.districtId,
  name: normalizeName(v.name),
  code: normalizeCode(v.code) || null,
  centreTypeId: v.centreTypeId || null,
  talukaId: v.talukaId || null,
  /* Spaces are dropped, as the server does before checking the shape. */
  contactNumber: optionalValue(v.contactNumber.replace(/\s+/g, '')),
  email: optionalValue(v.email.toLowerCase()),
  pocName: optionalValue(v.pocName),
  pocMobile: optionalValue(v.pocMobile),
  centreHead: optionalValue(v.centreHead),
  alternativeContact: optionalValue(v.alternativeContact),
  coordinator1: optionalValue(v.coordinator1),
  coordinator2: optionalValue(v.coordinator2),
  isActive: v.isActive,
});

/*
 * Same rules as the backend validator. The code is optional on create (blank = generated) but cannot be
 * blanked once the centre exists, so Edit passes codeRequired.
 */
export function validateTrainingCentreForm(v: TrainingCentreFormValues, { codeRequired = false } = {}): FieldErrors<TrainingCentreField> {
  return {
    name: validateEntityName(v.name, 'Centre name', { min: 3, max: 150 }),
    code: validateCode(v.code, { label: 'Centre code', max: 10, optional: !codeRequired }),
    stateId: requireSelection(v.stateId, 'State'),
    districtId: requireSelection(v.districtId, 'District'),
    contactNumber: validatePhone(v.contactNumber),
    email: validateEmail(v.email),
    pocName: validateText(v.pocName, 'POC name', { max: 120 }),
    pocMobile: validateMobile(v.pocMobile),
    centreHead: validateText(v.centreHead, 'Centre head', { max: 120 }),
    alternativeContact: validateText(v.alternativeContact, 'Alternative contact', { max: 160 }),
    coordinator1: validateText(v.coordinator1, 'Coordinator 1', { max: 160 }),
    coordinator2: validateText(v.coordinator2, 'Coordinator 2', { max: 160 }),
  };
}

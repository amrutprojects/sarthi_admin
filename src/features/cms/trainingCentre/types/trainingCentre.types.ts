/* Training Centre Master, as /api/v1/cms/training-centres returns and accepts it (Table 32, sections A–B). */

/* Only on the single-record response: the records that hang off the centre. */
export interface TrainingCentreRelated {
  hasLocation: boolean;
  hasInfrastructure: boolean;
  /* Non-deleted batches. While above zero the centre code is locked. */
  batchCount: number;
  documentCount: number;
}

export interface ApiTrainingCentre {
  id: string;
  name: string;
  code: string;
  centreTypeId: string | null;
  centreTypeName: string | null;
  centreTypeCode: string | null;
  centreTypeIsActive: boolean | null;
  /* Derived from the district on the server; a centre stores no state of its own. */
  stateId: string;
  stateName: string;
  stateCode: string;
  stateIsActive: boolean;
  districtId: string;
  districtName: string;
  districtCode: string;
  districtIsActive: boolean;
  talukaId: string | null;
  talukaName: string | null;
  talukaCode: string | null;
  talukaIsActive: boolean | null;
  contactNumber: string | null;
  email: string | null;
  pocName: string | null;
  pocMobile: string | null;
  centreHead: string | null;
  alternativeContact: string | null;
  coordinator1: string | null;
  coordinator2: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  related?: TrainingCentreRelated;
}

/* Optional columns: null clears the value. */
interface TrainingCentreOptionalInput {
  centreTypeId?: string | null;
  talukaId?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  pocName?: string | null;
  pocMobile?: string | null;
  centreHead?: string | null;
  alternativeContact?: string | null;
  coordinator1?: string | null;
  coordinator2?: string | null;
}

export interface CreateTrainingCentreInput extends TrainingCentreOptionalInput {
  /* Sent so the server can reject a district that does not belong to the selected state. */
  stateId?: string;
  districtId: string;
  name: string;
  /* null = generate (TC0001…). */
  code?: string | null;
  isActive?: boolean;
}

export interface UpdateTrainingCentreInput extends TrainingCentreOptionalInput {
  stateId?: string;
  districtId?: string;
  name?: string;
  /* Cannot be blanked; refused once a batch uses the centre. */
  code?: string;
}

/*
 * GET /cms/training-centres/code-suggestions item: a student-import course centre, e.g. NAS / Nashik.
 * A student's preferred centre (students.centreCode) is always one of these codes.
 */
export interface CentreCodeSuggestion {
  code: string;
  name: string;
}

/* Field names of the training centre form, used to key validation messages. */
export const TRAINING_CENTRE_FIELDS = [
  'name', 'code', 'centreTypeId', 'stateId', 'districtId', 'talukaId', 'contactNumber', 'email',
  'pocName', 'pocMobile', 'centreHead', 'alternativeContact', 'coordinator1', 'coordinator2',
] as const;
export type TrainingCentreField = (typeof TRAINING_CENTRE_FIELDS)[number];

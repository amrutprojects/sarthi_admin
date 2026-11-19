import type { Bilingual, DistrictRef } from './contact.types';

/*
 * One approved training centre, shown in the "Approved training centres" card of its district's District
 * Office page on the website. A district has any number of them, listed by displayOrder. Only the district
 * and the name are required; the website leaves out whatever else is blank.
 */
export interface ApiTrainingCentre {
  id: string;
  district: DistrictRef;
  name: Bilingual;
  address: Bilingual | null;
  managerName: Bilingual | null;
  phone: string | null;
  email: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingCentreInput {
  districtId: string;
  name: Bilingual;
  address: Bilingual | null;
  managerName: Bilingual | null;
  phone: string | null;
  email: string | null;
  /* Left out: the centre goes to the end of its district's list. */
  displayOrder?: number;
  isActive?: boolean;
}

/* Any subset of the create fields; status has its own endpoint. */
export type UpdateTrainingCentreInput = Partial<Omit<CreateTrainingCentreInput, 'isActive'>>;

/* Field names of the centre form, as the API reports them ("body.name.mr", "districtId"). */
export const CENTRE_FIELDS = [
  'districtId', 'name.mr', 'name.en', 'address.mr', 'address.en', 'managerName.mr', 'managerName.en', 'phone', 'email', 'displayOrder',
] as const;
export type CentreField = (typeof CENTRE_FIELDS)[number];

export const CENTRE_NAME_MAX = 200;
export const CENTRE_ADDRESS_MAX = 500;
export const CENTRE_MANAGER_MAX = 150;

/* Where the training centre pages live (the list is the Contact Page Management tab). */
export const centrePath = (id: string, edit = false): string => `/cms/contact/centres/${id}${edit ? '/edit' : ''}`;

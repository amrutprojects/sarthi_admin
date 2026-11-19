import { validateWholeNumber, type FieldErrors } from '../../validation';
import type { Bilingual } from '../types/contact.types';
import {
  CENTRE_ADDRESS_MAX,
  CENTRE_MANAGER_MAX,
  CENTRE_NAME_MAX,
  type ApiTrainingCentre,
  type CentreField,
  type CreateTrainingCentreInput,
} from '../types/trainingCentre.types';
import { validateCoordinatorPhone, validateEmail, type BilingualValue } from './contact.validation';

/*
 * Training centre form rules, identical to the server's (backend contact.validator.ts, trainingCentre):
 * the district and the name in both languages are required; address and centre manager are all-or-nothing
 * pairs; phone (masked digits allowed) and email are optional.
 */

export interface CentreFormValues {
  districtId: string;
  name: BilingualValue;
  address: BilingualValue;
  managerName: BilingualValue;
  phone: string;
  email: string;
  /* Typed as text so the box can be left empty: an empty order puts a new centre at the end of its district. */
  displayOrder: string;
  isActive: boolean;
}

const emptyPair = (): BilingualValue => ({ mr: '', en: '' });
const pairOf = (value: Bilingual | null): BilingualValue => (value ? { mr: value.mr, en: value.en } : emptyPair());
const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });
const pairToNull = (p: BilingualValue): Bilingual | null => (p.mr.trim() && p.en.trim() ? trimPair(p) : null);
const blankToNull = (s: string): string | null => (s.trim() ? s.trim() : null);

export const emptyCentreForm = (districtId = ''): CentreFormValues => ({
  districtId,
  name: emptyPair(),
  address: emptyPair(),
  managerName: emptyPair(),
  phone: '',
  email: '',
  displayOrder: '',
  isActive: true,
});

export const toCentreFormValues = (c: ApiTrainingCentre): CentreFormValues => ({
  districtId: c.district.id,
  name: pairOf(c.name),
  address: pairOf(c.address),
  managerName: pairOf(c.managerName),
  phone: c.phone ?? '',
  email: c.email ?? '',
  displayOrder: String(c.displayOrder),
  isActive: c.isActive,
});

/* The values sent to the API: trimmed, blanks as null, and no order at all when the box is empty. */
export const normalizeCentreForm = (v: CentreFormValues): CreateTrainingCentreInput => ({
  districtId: v.districtId,
  name: trimPair(v.name),
  address: pairToNull(v.address),
  managerName: pairToNull(v.managerName),
  phone: blankToNull(v.phone),
  email: blankToNull(v.email),
  ...(v.displayOrder.trim() ? { displayOrder: Number(v.displayOrder.trim()) } : {}),
  isActive: v.isActive,
});

const requiredHalf = (value: string, label: string, max: number): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  return v.length > max ? `${label} must be at most ${max} characters` : undefined;
};

/* An optional pair is all-or-nothing: one half without the other would show a blank line in one language. */
const optionalPair = (value: BilingualValue, label: string, max: number): { mr?: string; en?: string } => {
  const mr = value.mr.trim();
  const en = value.en.trim();
  if (!mr && !en) return {};
  return {
    mr: !mr ? `${label} (Marathi) is required when English is given` : mr.length > max ? `${label} (Marathi) must be at most ${max} characters` : undefined,
    en: !en ? `${label} (English) is required when Marathi is given` : en.length > max ? `${label} (English) must be at most ${max} characters` : undefined,
  };
};

export function validateCentreForm(v: CentreFormValues, { orderRequired = false } = {}): FieldErrors<CentreField> {
  const address = optionalPair(v.address, 'Address', CENTRE_ADDRESS_MAX);
  const manager = optionalPair(v.managerName, 'Centre manager', CENTRE_MANAGER_MAX);
  return {
    districtId: v.districtId ? undefined : 'District is required',
    'name.mr': requiredHalf(v.name.mr, 'Centre name (Marathi)', CENTRE_NAME_MAX),
    'name.en': requiredHalf(v.name.en, 'Centre name (English)', CENTRE_NAME_MAX),
    'address.mr': address.mr,
    'address.en': address.en,
    'managerName.mr': manager.mr,
    'managerName.en': manager.en,
    phone: v.phone.trim() ? validateCoordinatorPhone(v.phone, 'Phone') : undefined,
    email: v.email.trim() ? validateEmail(v.email, 'Email') : undefined,
    displayOrder: validateWholeNumber(v.displayOrder, 'Display order', { min: 0, max: 999, required: orderRequired }),
  };
}

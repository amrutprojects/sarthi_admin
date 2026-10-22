import {
  optionalValue, requireSelection, validateHttpsUrl, validatePinCode, validateText, type FieldErrors,
} from '../../validation';
import type { CentreLocationField, ParkingOption } from '../types/centreLocation.types';

export interface CentreLocationFormValues {
  centreId: string;
  address: string;
  pinCode: string;
  locationUrl: string;
  nearestLandmark: string;
  nearestStation: string;
  publicTransport: string;
  /* '' = not recorded. */
  parking: '' | ParkingOption;
  remarks: string;
  isActive: boolean;
}

export const emptyCentreLocationForm = (centreId = ''): CentreLocationFormValues => ({
  centreId,
  address: '',
  pinCode: '',
  locationUrl: '',
  nearestLandmark: '',
  nearestStation: '',
  publicTransport: '',
  parking: '',
  remarks: '',
  isActive: true,
});

/* The values actually sent to the API: trimmed text, and null for every optional field left empty. */
export const normalizeCentreLocationForm = (v: CentreLocationFormValues) => ({
  centreId: v.centreId,
  address: v.address.trim(),
  pinCode: optionalValue(v.pinCode),
  locationUrl: optionalValue(v.locationUrl),
  nearestLandmark: optionalValue(v.nearestLandmark),
  nearestStation: optionalValue(v.nearestStation),
  publicTransport: optionalValue(v.publicTransport),
  parking: v.parking || null,
  remarks: optionalValue(v.remarks),
  isActive: v.isActive,
});

/* Mirrors the backend rules in centre-location.validator.ts. */
export function validateCentreLocationForm(v: CentreLocationFormValues): FieldErrors<CentreLocationField> {
  return {
    centreId: requireSelection(v.centreId, 'Training centre'),
    address: validateText(v.address, 'Address', { min: 5, max: 300, required: true }),
    pinCode: validatePinCode(v.pinCode),
    locationUrl: validateHttpsUrl(v.locationUrl, 500),
    nearestLandmark: validateText(v.nearestLandmark, 'Nearest landmark', { max: 200 }),
    nearestStation: validateText(v.nearestStation, 'Nearest railway station / bus stand', { max: 200 }),
    publicTransport: validateText(v.publicTransport, 'Public transport availability', { max: 200 }),
    remarks: validateText(v.remarks, 'Remarks', { max: 500 }),
  };
}

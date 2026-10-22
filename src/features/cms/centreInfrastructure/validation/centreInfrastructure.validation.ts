import {
  optionalNumber, optionalValue, requireSelection, serverFieldErrors, validateText, validateWholeNumber, type FieldErrors,
} from '../../validation';
import {
  CENTRE_INFRASTRUCTURE_FIELDS, FACILITY_CODES, type CentreInfrastructureField, type FacilityAvailability, type FacilityCode,
  type FacilityMap,
} from '../types/centreInfrastructure.types';

/* A Yes / No / Not recorded select: '' = not recorded (null), 'true', 'false'. */
export type TriState = '' | 'true' | 'false';

/* One row of the facilities table. '' = not recorded (the row is not sent). */
export interface FacilityRow {
  availability: '' | FacilityAvailability;
  remarks: string;
}

export type FacilityRows = Record<FacilityCode, FacilityRow>;

export interface CentreInfrastructureFormValues {
  centreId: string;
  maxSeatingCapacity: string;
  numberOfFloors: string;
  trainingRooms: string;
  computerSystems: string;
  internetType: string;
  internetSpeed: string;
  hasLift: TriState;
  hasAc: TriState;
  hasWashroom: TriState;
  hasDrinkingWater: TriState;
  powerBackup: string;
  facilities: FacilityRows;
  isActive: boolean;
}

/* Error keys: the form fields, plus one per facility row (its remarks). */
export type CentreInfrastructureErrorKey = CentreInfrastructureField | `facility.${FacilityCode}`;
export const facilityKey = (code: FacilityCode): CentreInfrastructureErrorKey => `facility.${code}`;

export const triFromApi = (v: boolean | null): TriState => (v === null ? '' : v ? 'true' : 'false');
const triToApi = (v: TriState): boolean | null => (v === '' ? null : v === 'true');

/* Every facility as a table row, filled from the saved map (missing codes are "not recorded"). */
export const facilityRows = (map: FacilityMap = {}): FacilityRows =>
  Object.fromEntries(
    FACILITY_CODES.map((code) => [code, { availability: map[code]?.availability ?? '', remarks: map[code]?.remarks ?? '' }]),
  ) as FacilityRows;

export const emptyCentreInfrastructureForm = (centreId = ''): CentreInfrastructureFormValues => ({
  centreId,
  maxSeatingCapacity: '',
  numberOfFloors: '',
  trainingRooms: '',
  computerSystems: '',
  internetType: '',
  internetSpeed: '',
  hasLift: '',
  hasAc: '',
  hasWashroom: '',
  hasDrinkingWater: '',
  powerBackup: '',
  facilities: facilityRows(),
  isActive: true,
});

/*
 * The values actually sent to the API: numbers, null for every optional field left empty, and only the
 * facilities that have an availability (the map always replaces the saved one as a whole).
 */
export const normalizeCentreInfrastructureForm = (v: CentreInfrastructureFormValues) => {
  const facilities: FacilityMap = {};
  for (const code of FACILITY_CODES) {
    const row = v.facilities[code];
    if (row.availability) facilities[code] = { availability: row.availability, remarks: optionalValue(row.remarks) };
  }
  return {
    centreId: v.centreId,
    maxSeatingCapacity: Number(v.maxSeatingCapacity.trim()),
    numberOfFloors: optionalNumber(v.numberOfFloors),
    trainingRooms: optionalNumber(v.trainingRooms),
    computerSystems: optionalNumber(v.computerSystems),
    internetType: optionalValue(v.internetType),
    internetSpeed: optionalValue(v.internetSpeed),
    hasLift: triToApi(v.hasLift),
    hasAc: triToApi(v.hasAc),
    hasWashroom: triToApi(v.hasWashroom),
    hasDrinkingWater: triToApi(v.hasDrinkingWater),
    powerBackup: optionalValue(v.powerBackup),
    facilities,
    isActive: v.isActive,
  };
};

/* Mirrors the backend rules in centre-infrastructure.validator.ts. */
export function validateCentreInfrastructureForm(v: CentreInfrastructureFormValues): FieldErrors<CentreInfrastructureErrorKey> {
  const errors: FieldErrors<CentreInfrastructureErrorKey> = {
    centreId: requireSelection(v.centreId, 'Training centre'),
    maxSeatingCapacity: validateWholeNumber(v.maxSeatingCapacity, 'Maximum seating capacity', { min: 1, max: 100000, required: true }),
    numberOfFloors: validateWholeNumber(v.numberOfFloors, 'Number of floors', { min: 0, max: 200 }),
    trainingRooms: validateWholeNumber(v.trainingRooms, 'Training rooms', { min: 0, max: 1000 }),
    computerSystems: validateWholeNumber(v.computerSystems, 'Computer systems', { min: 0, max: 100000 }),
    internetType: validateText(v.internetType, 'Internet type', { max: 60 }),
    internetSpeed: validateText(v.internetSpeed, 'Internet speed', { max: 60 }),
    powerBackup: validateText(v.powerBackup, 'Power backup', { max: 200 }),
  };
  for (const code of FACILITY_CODES) {
    const row = v.facilities[code];
    errors[facilityKey(code)] = row.availability ? validateText(row.remarks, 'Remarks', { max: 200 }) : undefined;
  }
  return errors;
}

/*
 * Server field messages mapped onto the form. Facility messages arrive as body.facilities.<CODE>.<x>
 * and land on that row; everything else goes through the shared last-segment mapping.
 */
export function infrastructureServerErrors(details: { field?: string; message: string }[]): FieldErrors<CentreInfrastructureErrorKey> {
  const rowPath = /facilities\.([A-Z_]+)/;
  const out: FieldErrors<CentreInfrastructureErrorKey> = serverFieldErrors(
    details.filter((d) => !rowPath.test(d.field ?? '')),
    CENTRE_INFRASTRUCTURE_FIELDS,
  );
  for (const d of details) {
    const code = rowPath.exec(d.field ?? '')?.[1] as FacilityCode | undefined;
    if (code && FACILITY_CODES.includes(code) && !out[facilityKey(code)]) out[facilityKey(code)] = d.message;
  }
  return out;
}

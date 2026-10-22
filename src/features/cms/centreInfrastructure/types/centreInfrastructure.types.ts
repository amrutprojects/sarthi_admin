/* Capacity & Infrastructure, as /api/v1/cms/centre-infrastructure returns and accepts it. One record per training centre. */

/* The 20 facilities of the checklist, in display order. Same codes as the backend FACILITY_CODES. */
export const FACILITY_CODES = [
  'TRAINING_CLASSROOMS', 'COMPUTER_LAB', 'INTERNET', 'WIFI', 'AIR_CONDITIONING', 'POWER_BACKUP_UPS', 'GENERATOR',
  'LIFT', 'WASHROOMS', 'DRINKING_WATER', 'RECEPTION', 'WAITING_AREA', 'PROJECTOR_DISPLAY', 'AUDIO_SYSTEM', 'SEATING',
  'COMPUTER_SYSTEMS', 'PRINTING_SCANNING', 'CCTV_SECURITY', 'FIRST_AID', 'ACCESSIBILITY',
] as const;
export type FacilityCode = (typeof FACILITY_CODES)[number];

export const FACILITY_LABELS: Record<FacilityCode, string> = {
  TRAINING_CLASSROOMS: 'Training Classrooms',
  COMPUTER_LAB: 'Computer Lab',
  INTERNET: 'Internet Facility',
  WIFI: 'Wi-Fi',
  AIR_CONDITIONING: 'Air Conditioning',
  POWER_BACKUP_UPS: 'Power Backup / UPS',
  GENERATOR: 'Generator',
  LIFT: 'Lift Facility',
  WASHROOMS: 'Washrooms',
  DRINKING_WATER: 'Drinking Water',
  RECEPTION: 'Reception / Help Desk',
  WAITING_AREA: 'Waiting Area',
  PROJECTOR_DISPLAY: 'Projector / Display',
  AUDIO_SYSTEM: 'Audio System',
  SEATING: 'Seating Capacity',
  COMPUTER_SYSTEMS: 'Computer Systems',
  PRINTING_SCANNING: 'Printing / Scanning Facility',
  CCTV_SECURITY: 'CCTV / Security',
  FIRST_AID: 'First Aid Facility',
  ACCESSIBILITY: 'Accessibility / Basic Access',
};

export const FACILITY_AVAILABILITY = ['YES', 'NO', 'TBC'] as const;
export type FacilityAvailability = (typeof FACILITY_AVAILABILITY)[number];

export const FACILITY_AVAILABILITY_LABELS: Record<FacilityAvailability, string> = { YES: 'Yes', NO: 'No', TBC: 'To be confirmed' };

export interface FacilityEntry {
  availability: FacilityAvailability;
  remarks: string | null;
}

/* Only assessed facilities are present; a missing code means "not recorded". */
export type FacilityMap = Partial<Record<FacilityCode, FacilityEntry>>;

export interface ApiCentreInfrastructure {
  id: string;
  centreId: string;
  centreName: string;
  centreCode: string;
  /* False when the training centre has been deactivated; the record can still be edited. */
  centreIsActive: boolean;
  maxSeatingCapacity: number;
  numberOfFloors: number | null;
  trainingRooms: number | null;
  computerSystems: number | null;
  internetType: string | null;
  internetSpeed: string | null;
  /* true / false, or null when not recorded. */
  hasLift: boolean | null;
  hasAc: boolean | null;
  hasWashroom: boolean | null;
  hasDrinkingWater: boolean | null;
  powerBackup: string | null;
  facilities: FacilityMap;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* GET /cms/centre-infrastructure/summary — the listing KPIs. */
export interface CentreInfrastructureSummary {
  total: number;
  active: number;
  inactive: number;
  activeSeatingCapacity: number;
}

export interface CreateCentreInfrastructureInput {
  centreId: string;
  maxSeatingCapacity: number;
  numberOfFloors: number | null;
  trainingRooms: number | null;
  computerSystems: number | null;
  internetType: string | null;
  internetSpeed: string | null;
  hasLift: boolean | null;
  hasAc: boolean | null;
  hasWashroom: boolean | null;
  hasDrinkingWater: boolean | null;
  powerBackup: string | null;
  /* Replaces the whole checklist. */
  facilities: FacilityMap;
  isActive?: boolean;
}

/* The centre cannot be changed once the record exists, so it is not part of an update. */
export type UpdateCentreInfrastructureInput = Partial<Omit<CreateCentreInfrastructureInput, 'centreId' | 'isActive'>>;

/* Field names of the form, used to key validation messages. */
export const CENTRE_INFRASTRUCTURE_FIELDS = [
  'centreId', 'maxSeatingCapacity', 'numberOfFloors', 'trainingRooms', 'computerSystems', 'internetType', 'internetSpeed',
  'hasLift', 'hasAc', 'hasWashroom', 'hasDrinkingWater', 'powerBackup', 'facilities',
] as const;
export type CentreInfrastructureField = (typeof CENTRE_INFRASTRUCTURE_FIELDS)[number];

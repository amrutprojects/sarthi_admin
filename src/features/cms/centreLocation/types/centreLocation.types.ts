/* Location Information, as /api/v1/cms/centre-locations returns and accepts it. One record per training centre. */

export const PARKING_OPTIONS = ['YES', 'NO', 'LIMITED'] as const;
export type ParkingOption = (typeof PARKING_OPTIONS)[number];

export const PARKING_LABELS: Record<ParkingOption, string> = { YES: 'Yes', NO: 'No', LIMITED: 'Limited' };

export interface ApiCentreLocation {
  id: string;
  centreId: string;
  centreName: string;
  centreCode: string;
  /* False when the training centre has been deactivated; the record can still be edited. */
  centreIsActive: boolean;
  address: string;
  pinCode: string | null;
  locationUrl: string | null;
  nearestLandmark: string | null;
  nearestStation: string | null;
  publicTransport: string | null;
  parking: ParkingOption | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCentreLocationInput {
  centreId: string;
  address: string;
  pinCode: string | null;
  locationUrl: string | null;
  nearestLandmark: string | null;
  nearestStation: string | null;
  publicTransport: string | null;
  parking: ParkingOption | null;
  remarks: string | null;
  isActive?: boolean;
}

/* The centre cannot be changed once the record exists, so it is not part of an update. */
export type UpdateCentreLocationInput = Partial<Omit<CreateCentreLocationInput, 'centreId' | 'isActive'>>;

/* Field names of the form, used to key validation messages. */
export const CENTRE_LOCATION_FIELDS = [
  'centreId', 'address', 'pinCode', 'locationUrl', 'nearestLandmark', 'nearestStation', 'publicTransport', 'parking', 'remarks',
] as const;
export type CentreLocationField = (typeof CENTRE_LOCATION_FIELDS)[number];

/* Training Centre Type Master, as /api/v1/cms/centre-types returns and accepts it. */

export interface ApiCentreType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /* Only on the single-record response: training centres of this type (non-deleted). */
  centreCount?: number;
}

export interface CreateCentreTypeInput {
  name: string;
  code: string;
  description: string | null;
  isActive?: boolean;
}

export interface UpdateCentreTypeInput {
  name?: string;
  code?: string;
  description?: string | null;
}

/* Field names of the centre type form, used to key validation messages. */
export const CENTRE_TYPE_FIELDS = ['name', 'code', 'description'] as const;
export type CentreTypeField = (typeof CENTRE_TYPE_FIELDS)[number];

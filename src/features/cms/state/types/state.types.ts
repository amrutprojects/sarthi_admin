/* State Master, as /api/v1/cms/states returns and accepts it. */

export interface ApiState {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /* Only on the single-record response: districts currently attached to this state. */
  districtCount?: number;
}

export interface CreateStateInput {
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UpdateStateInput {
  name?: string;
  code?: string;
}

/* Field names of the state form, used to key validation messages. */
export const STATE_FIELDS = ['name', 'code'] as const;
export type StateField = (typeof STATE_FIELDS)[number];

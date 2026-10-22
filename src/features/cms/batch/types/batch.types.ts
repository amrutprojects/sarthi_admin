/* Batch Master, as /api/v1/cms/batches returns and accepts it. */

export const DELIVERY_MODES = ['OFFLINE', 'ONLINE', 'BLENDED'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

/* Batch lifecycle. Separate from isActive, which only controls whether the batch is offered in dropdowns. */
export const BATCH_STATUSES = ['PLANNED', 'OPEN', 'FULL', 'CLOSED', 'CANCELLED'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  OFFLINE: 'Offline (classroom)',
  ONLINE: 'Online',
  BLENDED: 'Blended',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  PLANNED: 'Planned',
  OPEN: 'Open',
  FULL: 'Full',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/* Pill colour of each lifecycle status (Badge tones). */
export const BATCH_STATUS_TONES: Record<BatchStatus, string> = {
  PLANNED: 'blue',
  OPEN: 'green',
  FULL: 'amber',
  CLOSED: 'grey',
  CANCELLED: 'red',
};

export interface ApiBatch {
  id: string;
  centreId: string;
  centreName: string;
  centreCode: string;
  /* False when the centre has been deactivated after the batch was created. */
  centreIsActive: boolean;
  name: string;
  code: string;
  trackName: string | null;
  capacity: number;
  /* 'YYYY-MM-DD' */
  startDate: string;
  endDate: string | null;
  deliveryMode: DeliveryMode;
  batchStatus: BatchStatus;
  /* Students holding a seat (active assignments). Drives the seat display, the capacity floor and the cancel rule. */
  assignedCount: number;
  /*
   * Every non-deleted assignment, active or inactive. While it is above 0 the server keeps the centre and
   * code fixed and refuses to delete the batch, so the UI bases those locks on this count.
   */
  assignmentCount: number;
  seatsLeft: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/*
 * One row of GET /cms/batches/options. centreCode is the code of the batch's training centre (Assign Batch
 * compares it with the student's preferred centre).
 */
export interface BatchOption {
  id: string;
  name: string;
  code: string;
  centreCode: string;
}

export interface CreateBatchInput {
  centreId: string;
  name: string;
  /* null = let the server generate AMK-B-{centreCode}-{NNN}. */
  code: string | null;
  trackName: string | null;
  capacity: number;
  startDate: string;
  endDate: string | null;
  deliveryMode: DeliveryMode;
  batchStatus: BatchStatus;
  isActive?: boolean;
}

export type UpdateBatchInput = Partial<Omit<CreateBatchInput, 'isActive'>>;

/* Field names of the batch form, used to key validation messages. */
export const BATCH_FIELDS = [
  'centreId', 'name', 'code', 'trackName', 'deliveryMode', 'startDate', 'endDate', 'capacity', 'batchStatus',
] as const;
export type BatchField = (typeof BATCH_FIELDS)[number];

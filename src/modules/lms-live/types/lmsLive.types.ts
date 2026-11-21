import type { PageMeta } from '../../../services/api-client';

/*
 * G-2 "Show live LMS data" (amrut-kalash-api docs/mt-g2-live-data-setting.md, docs/lms-reads/README.md).
 * Shapes of GET /lms-reads/live-data and of the live reads the screens use.
 */
export type LiveDataBlocker = 'MASTER_SWITCH_OFF' | 'LMS_NOT_CONFIGURED';

export interface LiveDataState {
  /* What an administrator chose (default false). */
  setting: boolean;
  /* Server master switch LMS_READS_ENABLED. */
  masterSwitch: boolean;
  /* LMS API host, tenant key and tenant code entered on the server. */
  configured: boolean;
  canEnable: boolean;
  blocker: LiveDataBlocker | null;
  /* Names of the missing server variables (never values). */
  missing: string[];
  /* The screens show live data. */
  live: boolean;
  source: 'live' | 'local';
  updatedAt: string | null;
  updatedByUserId: string | null;
}

/* One live answer: always one source, with the instant the LMS produced it. */
export interface LiveResult<T> {
  data: T;
  meta?: PageMeta;
  source: 'live';
  fetchedAt: string | null;
}

type Ts = string | null;

export interface LmsCentre {
  code: string;
  name: string;
  districtCode: string | null;
  districtName: string | null;
  centreTypeName: string | null;
  status: string;
  isActive: boolean;
  sourceUpdatedAt: Ts;
}

export interface LmsBatch {
  id: string;
  code: string;
  entityCode: string;
  courseCode: string;
  centreCode: string;
  centreName: string;
  trackCode: string | null;
  startDate: string | null;
  endDate: string | null;
  deliveryMode: string | null;
  status: string;
  capacity: number | null;
  learnersEnrolled: number;
  learnersActive: number;
  learnersCompleted: number;
  learnersWithdrawn: number;
  updatedAt: Ts;
}

export interface LmsSession {
  id: string;
  batchCode: string;
  centreCode: string;
  entityCode: string;
  title: string | null;
  moduleNo: number | null;
  startsAt: Ts;
  endsAt: Ts;
  deliveryMode: string | null;
  attendanceMode: string | null;
  status: string;
  trainerCode: string | null;
  attendance: { present: number; late: number; absent: number; excused: number };
  updatedAt: Ts;
}

export interface LmsLiveSession {
  id: string;
  batchCode: string;
  centreCode: string;
  deliveryMode: string | null;
  trainerCode: string | null;
  trainerName: string | null;
  topic: string | null;
  startsAt: Ts;
  endsAt: Ts;
  status: string;
  inProgress: boolean;
  enrolled: number;
  present: number;
  late: number;
}
export interface LmsLiveSessions {
  asOf: Ts;
  date: string | null;
  items: LmsLiveSession[];
}

export interface LmsTrainer {
  id: string;
  code: string;
  displayName: string;
  status: string;
  entityCode: string;
  centreCodes: string[];
  batchCodes: string[];
  updatedAt: Ts;
}

export type AttendanceGroupBy = 'district' | 'division' | 'centre' | 'batch';
export interface LmsAttendanceRow {
  code: string;
  batches: number;
  sessionsHeld: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  selfCheckIns: number;
  geoCheckIns: number;
  selfies: number;
  groupPhotos: number;
}
export interface LmsAttendance {
  groupBy: string;
  dateFrom: string | null;
  dateTo: string | null;
  items: LmsAttendanceRow[];
}

/*
 * Learning configuration of an entity (L-05 learning-configuration tab, F-LMS-05-07; UI-313), as
 * /api/v1/lms/calendars/learning-config returns and accepts it. The key catalogue lives on the server
 * (learning-config.constants.ts); the screen only renders what it sends.
 */

export const LEARNING_CONFIG_MODES = ['OFFLINE', 'ONLINE'] as const;
export type LearningConfigMode = (typeof LEARNING_CONFIG_MODES)[number];

export const LEARNING_CONFIG_MODE_LABELS: Record<LearningConfigMode, string> = { OFFLINE: 'Offline', ONLINE: 'Online' };

export type LearningConfigType = 'integer' | 'percentage' | 'duration' | 'range' | 'enum' | 'enum-list' | 'labels' | 'text';
export type LearningConfigUnit = 'hours' | 'minutes' | 'days' | 'sessions' | 'attempts' | 'percent';
/* SYLLABUS: seeded from the final syllabus documents (OQ-012). PRESCRIBED: no value until the competent authority sets one. */
export type LearningConfigKind = 'SYLLABUS' | 'PRESCRIBED';

export interface RangeValue {
  min: number;
  max: number;
}
export type LearningConfigValue = number | string | string[] | RangeValue;

/* SYLLABUS: the syllabus value is shown (nothing saved yet) · CONFIGURED: saved by a user · null: To Be Confirmed. */
export type LearningConfigSource = 'SYLLABUS' | 'CONFIGURED' | null;

/* One key (and, for a mode-specific key, one delivery mode). */
export interface ApiLearningConfigValue {
  key: string;
  label: string;
  group: string;
  type: LearningConfigType;
  unit: LearningConfigUnit | null;
  min: number | null;
  options: string[] | null;
  length: number | null;
  kind: LearningConfigKind;
  /* null for keys that do not differ by delivery mode. */
  mode: LearningConfigMode | null;
  value: LearningConfigValue | null;
  valueSource: LearningConfigSource;
  syllabusValue: LearningConfigValue | null;
  sourceNote: string | null;
  toBeConfirmed: boolean;
  openQuestions: string[];
  /* The reason given with the current saved value. */
  reason: string | null;
  updatedAt: string | null;
}

export interface LearningConfigView {
  entityId: string;
  keys: ApiLearningConfigValue[];
}

/* PUT/PATCH /lms/calendars/learning-config/:key. mode omitted on a mode-specific key = both modes alike (OQ-042). */
export interface UpdateLearningConfigInput {
  entityId: string;
  mode?: LearningConfigMode;
  /* null empties a PRESCRIBED key (back to To Be Confirmed); a SYLLABUS key cannot be emptied. */
  value: LearningConfigValue | null;
  reason: string;
}

/* Stable id of one row: key plus mode. */
export const configRowId = (r: Pick<ApiLearningConfigValue, 'key' | 'mode'>) => `${r.key}|${r.mode ?? ''}`;

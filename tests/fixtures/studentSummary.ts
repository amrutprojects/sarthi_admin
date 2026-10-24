import type { StudentSummary } from '../../src/modules/students';

/* A /students/summary response; `empty` is today's state (nothing finalised into the register yet). */
export function summaryFixture(empty = false): StudentSummary {
  const n = (v: number) => (empty ? 0 : v);
  return {
    asOf: '2026-10-23T05:00:00.000Z',
    totals: {
      applications: n(15000),
      pending: n(12),
      eligible: n(14950),
      enrolled: n(0),
      awaitingBatch: n(14950),
      inactive: n(38),
    },
    bySource: [
      { source: 'IMPORT', count: n(14988) },
      { source: 'PUBLIC_REGISTRATION', count: n(12) },
    ],
    byCentre: [
      { code: 'NAG', name: 'Nagpur', applications: n(448), eligible: n(440), enrolled: 0 },
      { code: 'PUN', name: 'Pune', applications: n(411), eligible: n(410), enrolled: 0 },
      { code: 'THA', name: 'Thane', applications: n(380), eligible: n(379), enrolled: 0 },
    ],
    byTrack: [
      { code: 'T07', name: 'Data Analytics', applications: n(1294), eligible: n(1290), enrolled: 0 },
      { code: 'T12', name: 'Cloud', applications: n(1203), eligible: n(1200), enrolled: 0 },
      { code: null, name: 'To be confirmed', applications: 0, eligible: 0, enrolled: 0 },
    ],
    byCaste: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Maratha', count: n(15000) }],
    byEducation: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Graduate', count: n(15000) }],
    byMonth: [
      { month: '2026-09', applications: n(1637), enrolled: 0 },
      { month: '2026-10', applications: n(984), enrolled: 0 },
    ],
  };
}

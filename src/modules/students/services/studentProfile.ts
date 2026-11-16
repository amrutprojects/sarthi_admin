/*
 * Profile and source details of an imported application (import row values and the student detail), as label / value
 * pairs grouped the way the screens show them. Pairs without a value are left out, so rows and students imported before
 * these fields existed show nothing extra. Alternate contacts arrive masked from the server and are shown as received.
 */
import { fmtDate } from '../components/importUi';
import type { StudentProfileFields, StudentSource } from './importApi';

export type ProfilePair = [string, string];
export interface ProfileGroups {
  /* Gender, marital status, disability. */
  profile: ProfilePair[];
  /* Alternate mobile and email (masked). */
  contact: ProfilePair[];
  address: ProfilePair[];
  qualification: ProfilePair[];
  /* Scheme, the source's submission / last-update date-times and remarks. */
  source: ProfilePair[];
  /* The file's other columns (and values that could not be stored), by header as written. */
  extra: ProfilePair[];
}

const keep = (rows: [string, string | null | undefined][]): ProfilePair[] =>
  rows.filter((r): r is ProfilePair => typeof r[1] === 'string' && r[1].trim() !== '');

/* "78.50%" for a percentage, "8.00 / 10 CGPA" (or "8.00 CGPA" without a scale) for a CGPA. */
export function scoreLabel(p: Pick<StudentProfileFields, 'score' | 'gradingType' | 'cgpaScale'>): string | null {
  if (p.score === null || p.score === undefined || p.score === '') return null;
  if (p.gradingType === 'PERCENTAGE') return `${p.score}%`;
  if (p.gradingType === 'CGPA') return p.cgpaScale ? `${p.score} / ${p.cgpaScale} CGPA` : `${p.score} CGPA`;
  return p.score;
}

const yesNo = (v: boolean | null | undefined) => (v === true ? 'Yes' : v === false ? 'No' : null);
const dateTime = (iso: string | null | undefined) => (iso ? fmtDate(iso) : null);

export function profileGroups(p: StudentProfileFields): ProfileGroups {
  return {
    profile: keep([
      ['Gender', p.gender],
      ['Marital status', p.maritalStatus],
      ['Disability', yesNo(p.disabilityStatus)],
      ['Disability type', p.disabilityType],
      ['Disability certificate no.', p.disabilityCertificateNumber],
    ]),
    contact: keep([
      ['Alternate mobile', p.alternateMobile],
      ['Alternate email', p.alternateEmail],
    ]),
    address: keep([
      ['Permanent address', p.permanentAddress],
      ['Landmark', p.landmark],
      ['District', p.districtName],
      ['Taluka', p.talukaName],
      ['Division', p.division],
      ['PIN code', p.pinCode],
    ]),
    qualification: keep([
      ['Qualification', p.qualificationName],
      ['Subject / stream / branch', p.qualificationStream],
      ['Board / university', p.qualificationBoard],
      ['Completed on', p.qualificationCompletedOn],
      ['Score', scoreLabel(p)],
      ['Class', p.qualificationClass],
    ]),
    source: keep([
      ['Scheme', p.schemeName],
      ['Submitted at the source', dateTime(p.sourceSubmittedAt)],
      ['Last updated at the source', dateTime(p.sourceUpdatedAt)],
      ['Source remarks', p.sourceRemarks],
    ]),
    extra: keep(Object.entries(p.sourceExtra ?? {})),
  };
}

/*
 * Register status label and badge tone. REGISTRATION_PENDING is a public registration awaiting verification, or an
 * imported application the source had not approved yet (a reviewer accepted NOT_APPROVED): that one is pending approval.
 */
export function studentStatusLabel(s: { status: string; source?: StudentSource }): [string, string] {
  if (s.status === 'RECEIVED') return ['Received', 'green'];
  if (s.status === 'REGISTRATION_PENDING') return s.source === 'IMPORT' ? ['Pending approval', 'amber'] : ['Pending verification', 'amber'];
  return [s.status, 'grey'];
}

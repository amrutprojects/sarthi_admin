import { z } from 'zod';
import { OFFICER_DISTRICTS_MAX } from '../types/ippApprovals.types';

/* Form rules, the same as the API's: a rejection and an approval each need a reason; an officer has 0–200 districts. */
export const REASON_MIN = 3;
export const REASON_MAX = 500;

const reason = (what: string) =>
  z
    .string()
    .trim()
    .min(REASON_MIN, `Enter ${what} of at least ${REASON_MIN} characters`)
    .max(REASON_MAX, `The reason can have at most ${REASON_MAX} characters`);

export const rejectSchema = z.object({ reason: reason('a reason') });
export type RejectForm = z.infer<typeof rejectSchema>;

export const approveSchema = z.object({ reason: reason('an approval reason') });
export type ApproveForm = z.infer<typeof approveSchema>;

export const officerDistrictsSchema = z.object({
  districtIds: z.array(z.string()).max(OFFICER_DISTRICTS_MAX, `Choose at most ${OFFICER_DISTRICTS_MAX} districts`),
});
export type OfficerDistrictsForm = z.infer<typeof officerDistrictsSchema>;

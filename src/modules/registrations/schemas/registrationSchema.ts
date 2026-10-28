import { z } from 'zod';

/*
 * Registration form rules, mirroring the backend (students/registration/registration.validation.ts) so users see the
 * same messages before submitting. The backend validates every request again.
 */
const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const personName = (label: string, max: number) =>
  text(label, max).refine((v) => !v || NAME_RE.test(v), `${label} may contain only letters, spaces and . ' -`);
const pick = (label: string) => z.string().min(1, `${label} is required`);

/* Verhoeff checksum, as the backend checks Aadhaar numbers. */
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
export function verhoeffValid(num: string): boolean {
  let c = 0;
  [...num].reverse().forEach((ch, i) => (c = D[c][P[i % 8][+ch]]));
  return c === 0;
}

function dobIssue(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return 'Date of birth is required';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) return 'Date of birth is not a real date';
  const now = new Date();
  if (d > now) return 'Date of birth cannot be in the future';
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age < 14 || age > 100 ? 'Applicant must be between 14 and 100 years old' : null;
}

export const basicSchema = z.object({
  first_name: personName('First name', 100),
  last_name: personName('Last name', 100),
  father_name: personName('Father name', 150),
  mother_name: personName('Mother name', 150),
  email: text('Email', 254).email('Email address is not valid'),
  date_of_birth: z.string().superRefine((v, ctx) => {
    const issue = dobIssue(v);
    if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
  }),
  current_address: text('Current address', 500),
  aadhaar_number: text('Aadhaar number', 20).refine((v) => {
    const d = v.replace(/[\s-]/g, '');
    return /^[2-9]\d{11}$/.test(d) && verhoeffValid(d);
  }, 'Aadhaar number must be 12 digits with a valid checksum'),
  mobile_number: text('Mobile number', 20).refine(
    (v) =>
      /^[6-9]\d{9}$/.test(
        v
          .replace(/[\s()-]/g, '')
          .replace(/^\+?91(?=\d{10}$)/, '')
          .replace(/^0(?=\d{10}$)/, ''),
      ),
    'Mobile number must be a 10-digit Indian number starting 6–9',
  ),
  religion: pick('Religion'),
  caste_id: pick('Caste'),
});

export const mainSchema = z.object({
  region_id: pick('Course district'),
  technology: pick('Technology'),
  education_id: pick('Education qualification'),
});

/*
 * Certificate barcode numbers (Income / EWS, Domicile): exactly 18 digits (backend BARCODE_RE). An empty value means
 * none given; the page asks for a required barcode only when its document is uploaded.
 */
export const BARCODE_RE = /^\d{18}$/;
const barcodeMap = z.record(
  z
    .string()
    .trim()
    .refine((v) => v === '' || BARCODE_RE.test(v), 'Barcode must be exactly 18 digits (numbers only, no spaces, letters or symbols)'),
);

export const registrationFormSchema = basicSchema.merge(mainSchema).extend({
  barcodes: barcodeMap,
  declaration_accepted: z.literal(true, { errorMap: () => ({ message: 'The declaration must be accepted' }) }),
});

export type RegistrationFormValues = z.input<typeof registrationFormSchema>;
/* Editing a student: all three steps; the declaration is not asked again. */
export const editFormSchema = basicSchema.merge(mainSchema).extend({
  barcodes: barcodeMap,
});
export const STEP_FIELDS = [Object.keys(basicSchema.shape), Object.keys(mainSchema.shape)] as const;

/*
 * File rules (backend registration-upload.middleware.ts / file-type.ts): PDF / JPG / JPEG / PNG up to 5 MB, except the
 * video types (Applicant Video with Aadhaar): an MP4 up to 50 MB.
 */
export const MAX_FILE_MB = 5;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const VIDEO_DOCUMENT_TYPES: readonly string[] = ['APPLICANT_VIDEO'];
export const VIDEO_MAX_FILE_MB = 50;
export const VIDEO_ACCEPT = '.mp4,video/mp4';
export const isVideoDocumentType = (code?: string) => !!code && VIDEO_DOCUMENT_TYPES.includes(code.toUpperCase());
export const acceptFor = (code?: string) => (isVideoDocumentType(code) ? VIDEO_ACCEPT : ACCEPT);
export function fileIssue(f: File, code?: string): string | null {
  if (isVideoDocumentType(code)) {
    if (!/\.mp4$/i.test(f.name)) return 'Only MP4 videos are accepted';
    if (f.size > VIDEO_MAX_FILE_MB * 1024 * 1024) return `File is larger than ${VIDEO_MAX_FILE_MB} MB`;
    return null;
  }
  if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return 'Only PDF, JPG, JPEG or PNG files are accepted';
  if (f.size > MAX_FILE_MB * 1024 * 1024) return `File is larger than ${MAX_FILE_MB} MB`;
  return null;
}

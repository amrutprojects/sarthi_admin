import type { FieldErrors } from '../../validation';
import type {
  ApiBoardMember,
  ApiBoardSection,
  Bilingual,
  BoardField,
  BoardMemberInput,
  UpdateBoardSectionInput,
} from '../types/board.types';

/*
 * Board Members form rules, deliberately identical to the server rules in
 * backend/src/cms/board/board.validator.ts and to the CHECK constraints on board_members and
 * board_section.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export const PHOTO_MAX_MB = 5;
export const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export interface MemberFormValues {
  name: string;
  /** Ticked while the officeholder's name is still to be supplied: the website prints its placeholder. */
  namePending: boolean;
  category: Bilingual;
  designation: Bilingual;
  description: Bilingual;
  subtitle: Bilingual;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SectionFormValues {
  heading: Bilingual;
  subtitle: Bilingual;
  noticeTitle: Bilingual;
  noticeBody: Bilingual;
  showNotice: boolean;
}

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptyMemberForm = (): MemberFormValues => ({
  name: '',
  namePending: false,
  category: blank(),
  designation: blank(),
  description: blank(),
  subtitle: blank(),
  displayOrder: '',
  isActive: true,
});

export const memberToForm = (m: ApiBoardMember): MemberFormValues => ({
  name: m.name ?? '',
  namePending: m.name === null,
  category: { ...m.category },
  designation: { ...m.designation },
  description: { ...m.description },
  subtitle: { ...m.subtitle },
  displayOrder: String(m.displayOrder),
  isActive: m.isActive,
});

export const sectionToForm = (s: ApiBoardSection): SectionFormValues => ({
  heading: { ...s.heading },
  subtitle: { ...s.subtitle },
  noticeTitle: { ...s.noticeTitle },
  noticeBody: { ...s.noticeBody },
  showNotice: s.showNotice,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const para = (v: string) =>
  v
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const pairOf = (p: Bilingual, multiline = false): Bilingual => {
  const f = multiline ? para : line;
  return { mr: f(p.mr), en: f(p.en) };
};
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* Every field of the form, as the API takes it. */
export function memberPayload(v: MemberFormValues): BoardMemberInput {
  const order = v.displayOrder.trim();
  return {
    name: v.namePending ? null : line(v.name),
    category: pairOf(v.category),
    designation: pairOf(v.designation),
    description: pairOf(v.description, true),
    subtitle: pairOf(v.subtitle),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function memberChanges(initial: ApiBoardMember, v: MemberFormValues): BoardMemberInput {
  const next = memberPayload(v);
  const out: BoardMemberInput = { expectedUpdatedAt: initial.updatedAt };
  if (next.name !== initial.name) out.name = next.name;
  if (!samePair(next.category!, initial.category)) out.category = next.category;
  if (!samePair(next.designation!, initial.designation)) out.designation = next.designation;
  if (!samePair(next.description!, initial.description)) out.description = next.description;
  if (!samePair(next.subtitle!, initial.subtitle)) out.subtitle = next.subtitle;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateBoardSectionInput {
  return {
    heading: pairOf(v.heading),
    subtitle: pairOf(v.subtitle),
    noticeTitle: pairOf(v.noticeTitle),
    noticeBody: pairOf(v.noticeBody, true),
    showNotice: v.showNotice,
    expectedUpdatedAt,
  };
}

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .,'’()/&-]*$/u;

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

/* Both halves required: the public site defaults to Marathi and has no language fallback. */
function requiredPair(errors: FieldErrors<BoardField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

/* Optional text: blank in both languages, or filled in both. */
function optionalPair(errors: FieldErrors<BoardField>, key: string, p: Bilingual, label: string, max: number, multiline = false) {
  const v = pairOf(p, multiline);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateMemberForm(v: MemberFormValues): FieldErrors<BoardField> {
  const errors: FieldErrors<BoardField> = {};
  if (!v.namePending) {
    const name = line(v.name);
    errors.name = !name
      ? 'Name is required — or tick "Name not yet available"'
      : name.length > 120
        ? 'Name must be at most 120 characters'
        : NAME_RE.test(name)
          ? undefined
          : "Name may use letters, digits, spaces and . , ' ( ) - / & only, starting with a letter";
  }
  requiredPair(errors, 'category', v.category, 'Category', 60);
  requiredPair(errors, 'designation', v.designation, 'Designation', 250);
  optionalPair(errors, 'description', v.description, 'Description', 500, true);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', 150);

  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<BoardField> {
  const errors: FieldErrors<BoardField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', 150);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', 300);
  optionalPair(errors, 'noticeTitle', v.noticeTitle, 'Notice heading', 150);
  optionalPair(errors, 'noticeBody', v.noticeBody, 'Notice text', 1000, true);
  if (v.showNotice) {
    const body = pairOf(v.noticeBody, true);
    if (!body.mr) errors['noticeBody.mr'] ??= 'Notice text (Marathi) is required while the notice is shown';
    if (!body.en) errors['noticeBody.en'] ??= 'Notice text (English) is required while the notice is shown';
  }
  return errors;
}

/*
 * The image type from the file's first bytes — the same check the server makes. Catching a renamed
 * or unsupported file here means the administrator hears about it before the upload, not after.
 */
export async function checkPhoto(file: File): Promise<string | null> {
  if (file.size === 0) return 'The photo file is empty';
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) return `The photo is larger than ${PHOTO_MAX_MB} MB`;
  const head = new Uint8Array(await readBytes(file.slice(0, 12)));
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  const type =
    head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
      ? 'jpg'
      : [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b)
        ? 'png'
        : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
          ? 'webp'
          : null;
  if (!type) return 'The photo must be a JPEG, PNG or WebP image';
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const allowed = type === 'jpg' ? ['jpg', 'jpeg'] : [type];
  if (!allowed.includes(ext)) {
    return `The file name does not match its content: this is a ${type.toUpperCase()} image, so name it ${allowed.map((e) => '.' + e).join(' or ')}`;
  }
  return null;
}

/* Blob.arrayBuffer() where the browser has it, FileReader otherwise. */
function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsArrayBuffer(blob);
  });
}

/* Server 422 details ("body.category.mr", "photo") onto this form's keys ("category.mr", "photo"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<BoardField> {
  const out: FieldErrors<BoardField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}

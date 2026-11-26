import type { FieldErrors } from '../../validation';
import { PROFILE_LIST_LABELS } from '../constants';
import {
  PROFILE_LISTS,
  type AdvisoryField,
  type AdvisoryGroupInput,
  type AdvisoryMemberInput,
  type ApiAdvisoryGroup,
  type ApiAdvisoryMember,
  type ApiAdvisorySection,
  type Bilingual,
  type BilingualList,
  type ProfileListKey,
  type UpdateAdvisorySectionInput,
} from '../types/advisory.types';

/*
 * Advisory Committee form rules, deliberately identical to the server rules for advisory_members and
 * advisory_section (the shared contract), which follow Board Members Management's.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

/*
 * The photo rules (JPEG, PNG or WebP up to 5 MB, the extension matching the bytes) and the mapping of a
 * server 422 onto the section settings form are the same as Board Members Management's, so they are
 * shared, not copied. The member form has its own mapping (memberServerErrors, below) for the list items.
 */
export { PHOTO_ACCEPT, PHOTO_MAX_MB, checkPhoto, serverErrors } from '../../board/validation/board.validation';

export interface MemberFormValues {
  name: Bilingual;
  /* "Position" on the form and on the website. */
  designation: Bilingual;
  experience: Bilingual;
  /* The five profile lists as typed: one text block per language, one item per line. */
  administrativeRoles: Bilingual;
  keyAchievements: Bilingual;
  majorContributions: Bilingual;
  researchLeadership: Bilingual;
  education: Bilingual;
  /* The group's id, or '' for no group (the select's value). */
  groupId: string;
  isActive: boolean;
}

export interface SectionFormValues {
  heading: Bilingual;
  subtitle: Bilingual;
}

export interface GroupFormValues {
  name: Bilingual;
  isActive: boolean;
}

/* Field limits, per language, as in the contract and the CHECK constraints. */
export const MAX = {
  name: 120,
  designation: 300,
  experience: 1000,
  /* Per profile list, per language. */
  listItems: 30,
  listItem: 400,
  heading: 150,
  subtitle: 300,
  groupName: 200,
} as const;

const blank = (): Bilingual => ({ mr: '', en: '' });

/* The same thing for each of the five profile lists, keyed by list. */
const eachList = <T>(f: (key: ProfileListKey) => T): Record<ProfileListKey, T> => ({
  administrativeRoles: f('administrativeRoles'),
  keyAchievements: f('keyAchievements'),
  majorContributions: f('majorContributions'),
  researchLeadership: f('researchLeadership'),
  education: f('education'),
});

/* A saved list as the form edits it: one item per line. */
const linesOf = (l: BilingualList): Bilingual => ({ mr: l.mr.join('\n'), en: l.en.join('\n') });

export const emptyMemberForm = (): MemberFormValues => ({
  name: blank(),
  designation: blank(),
  experience: blank(),
  ...eachList(blank),
  groupId: '',
  isActive: true,
});

export const memberToForm = (m: ApiAdvisoryMember): MemberFormValues => ({
  name: { ...m.name },
  designation: { ...m.designation },
  experience: { ...m.experience },
  ...eachList((key) => linesOf(m[key])),
  groupId: m.groupId ?? '',
  isActive: m.isActive,
});

export const emptyGroupForm = (): GroupFormValues => ({ name: blank(), isActive: true });

export const groupToForm = (g: ApiAdvisoryGroup): GroupFormValues => ({ name: { ...g.name }, isActive: g.isActive });

export const sectionToForm = (s: ApiAdvisorySection): SectionFormValues => ({
  heading: { ...s.heading },
  subtitle: { ...s.subtitle },
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/*
 * A profile list is typed (or pasted) as one item per line. Like the server: each line trimmed, one leading
 * bullet marker (• - * – or "1." / "1)" numbering, in Western or Marathi digits: "१." / "१)") stripped, blank
 * lines dropped. Every marker but "•" needs a space after it, so an item that merely starts with one — "-5 °C",
 * "1.5 lakh trainees", "१.५ लाख" — is kept whole. Each item remembers its line in the textarea, so a message
 * about it can say where it is.
 */
const BULLET_RE = /^(?:•|[-*–](?=\s|$)|[0-9०-९]{1,3}[.)](?=\s|$))\s*/u;
const itemsOf = (text: string): { item: string; line: number }[] =>
  text.split(/\r\n?|\n/).flatMap((raw, i) => {
    const item = line(raw).replace(BULLET_RE, '');
    return item ? [{ item, line: i + 1 }] : [];
  });
export const toItems = (text: string): string[] => itemsOf(text).map((x) => x.item);
const listOf = (p: Bilingual): BilingualList => ({ mr: toItems(p.mr), en: toItems(p.en) });
const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameList = (a: BilingualList, b: BilingualList) => sameItems(a.mr, b.mr) && sameItems(a.en, b.en);

/*
 * Every field of the form, as the API takes it. A new Advisory Committee member goes to the end of the list. No group is the
 * server's default, so groupId is only sent when one is chosen.
 */
export function memberPayload(v: MemberFormValues): AdvisoryMemberInput {
  return {
    name: pairOf(v.name),
    designation: pairOf(v.designation),
    experience: pairOf(v.experience),
    ...eachList((key) => listOf(v[key])),
    ...(v.groupId ? { groupId: v.groupId } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function memberChanges(initial: ApiAdvisoryMember, v: MemberFormValues): AdvisoryMemberInput {
  const next = memberPayload(v);
  const out: AdvisoryMemberInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.name!, initial.name)) out.name = next.name;
  if (!samePair(next.designation!, initial.designation)) out.designation = next.designation;
  if (!samePair(next.experience!, initial.experience)) out.experience = next.experience;
  for (const key of PROFILE_LISTS) if (!sameList(next[key]!, initial[key])) out[key] = next[key];
  /* null clears the group; `?? null` also reads a record from before groups existed as "no group". */
  const groupId = v.groupId || null;
  if (groupId !== (initial.groupId ?? null)) out.groupId = groupId;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateAdvisorySectionInput {
  return {
    heading: pairOf(v.heading),
    subtitle: pairOf(v.subtitle),
    expectedUpdatedAt,
  };
}

/* A new group: its name, and whether the website shows it. It goes to the end of the groups. */
export const groupPayload = (v: GroupFormValues): AdvisoryGroupInput => ({ name: pairOf(v.name), isActive: v.isActive });

/* Only what changed since the form was opened, plus the version it was opened at (as memberChanges). */
export function groupChanges(initial: ApiAdvisoryGroup, v: GroupFormValues): AdvisoryGroupInput {
  const out: AdvisoryGroupInput = { expectedUpdatedAt: initial.updatedAt };
  const name = pairOf(v.name);
  if (!samePair(name, initial.name)) out.name = name;
  if (v.isActive !== initial.isActive) out.isActive = v.isActive;
  return out;
}

/* Zero-width joiners are allowed: Marathi keyboards use them for forms such as the eyelash र. */
const NAME_RE = /^[\p{L}\p{M}](?:[\p{L}\p{M}\p{N} .,'’()/&-]|‌|‍)*$/u;

const HALVES = [
  ['mr', 'Marathi'],
  ['en', 'English'],
] as const;

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

/* Both halves required: the public site defaults to Marathi and has no language fallback for these. */
function requiredPair(errors: FieldErrors<AdvisoryField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of HALVES) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

/* Optional text: blank in both languages, or filled in both. */
function optionalPair(errors: FieldErrors<AdvisoryField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

/*
 * Profile text: Marathi, English, both or neither — long biographies are often written in one language
 * only, and the website falls back to the other language. Only the length is checked.
 */
function profileText(errors: FieldErrors<AdvisoryField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of HALVES) errors[`${key}.${half}`] = tooLong(line(p[half]), `${label} (${lang})`, max);
}

/* A profile list, per language and in any language: at most MAX.listItems items of at most MAX.listItem characters. */
function profileList(errors: FieldErrors<AdvisoryField>, key: ProfileListKey, p: Bilingual) {
  for (const [half, lang] of HALVES) {
    const label = `${PROFILE_LIST_LABELS[key]} (${lang})`;
    const items = itemsOf(p[half]);
    const long = items.find((x) => x.item.length > MAX.listItem);
    errors[`${key}.${half}`] =
      items.length > MAX.listItems
        ? `${label} may have at most ${MAX.listItems} items, one per line (it has ${items.length})`
        : long
          ? `${label}, line ${long.line}: an item must be at most ${MAX.listItem} characters`
          : undefined;
  }
}

export function validateMemberForm(v: MemberFormValues): FieldErrors<AdvisoryField> {
  const errors: FieldErrors<AdvisoryField> = {};
  requiredPair(errors, 'name', v.name, 'Name', MAX.name);
  for (const [half, lang] of HALVES) {
    const name = line(v.name[half]);
    if (!errors[`name.${half}`] && !NAME_RE.test(name)) {
      errors[`name.${half}`] = `Name (${lang}) may use letters, digits, spaces and . , ' ( ) - / & only, starting with a letter`;
    }
  }
  optionalPair(errors, 'designation', v.designation, 'Position', MAX.designation);
  profileText(errors, 'experience', v.experience, 'Experience', MAX.experience);
  for (const key of PROFILE_LISTS) profileList(errors, key, v[key]);
  return errors;
}

/*
 * A server 422 mapped onto the member form. A list item's path carries its position among the items sent
 * ("body.keyAchievements.en.3"), so its message is shown on that list's textarea, naming the line the
 * item is on. A path with no field on this form (or none at all) is left out, so the form falls back to
 * showing the server's message as a toast instead of swallowing it.
 */
const MEMBER_FIELDS: ReadonlySet<string> = new Set(['photo', 'name', 'designation', 'experience', 'groupId', ...PROFILE_LISTS]);
const isListKey = (key: string): key is ProfileListKey => (PROFILE_LISTS as readonly string[]).includes(key);

export function memberServerErrors(details: { field?: string; message: string }[], sent: MemberFormValues): FieldErrors<AdvisoryField> {
  const out: FieldErrors<AdvisoryField> = {};
  for (const d of details) {
    const [key = '', half, index] = (d.field ?? '').replace(/^body\.?/, '').split('.');
    if (!MEMBER_FIELDS.has(key)) continue;
    let field = key;
    let message = d.message;
    if (half === 'mr' || half === 'en') {
      field = `${key}.${half}`;
      if (isListKey(key) && index !== undefined && /^\d+$/.test(index)) {
        const at = itemsOf(sent[key][half])[Number(index)];
        message = at ? `Line ${at.line}: ${d.message}` : `Item ${Number(index) + 1}: ${d.message}`;
      }
    }
    out[field] ??= message;
  }
  return out;
}

export const PROFILE_TOO_LONG = 'The profile is too long to save; shorten the lists.';
const TOO_BIG_RE = /too (?:large|long|big)|larger than|exceed/i;

/*
 * A save refused as a whole rather than for one field, for a message on the form itself instead of a toast
 * that is gone before it is read. The usual cause is size: a 413 from the server's body limit, or a 400/422
 * saying the body — or the multipart "data" field holding the whole Advisory Committee member — is too large. Only long
 * profile lists get an Advisory Committee member that big, hence the advice. Any other message on "data" is shown as worded.
 * undefined = not a whole-form error (field messages and the toast handle it).
 */
export function memberFormError(status: number, message: string, details: { field?: string; message: string }[]): string | undefined {
  if (status === 413) return PROFILE_TOO_LONG;
  if (status !== 400 && status !== 422) return undefined;
  /* Messages about no one field: the request, the body, or its "data" field. A field's own "too long" stays on the field. */
  const whole = details.filter((d) => !d.field || d.field === 'body' || d.field === 'body.data');
  if ([message, ...whole.map((d) => d.message)].some((m) => TOO_BIG_RE.test(m))) return PROFILE_TOO_LONG;
  return details.find((d) => d.field === 'body.data')?.message;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<AdvisoryField> {
  const errors: FieldErrors<AdvisoryField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', MAX.heading);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', MAX.subtitle);
  return errors;
}

/*
 * A group name, required in both languages because the website prints it as a heading in the visitor's
 * language. Any characters: it is often an organisation's full name, "ACADEMY OF … (SARTHI)".
 */
export function validateGroupForm(v: GroupFormValues): FieldErrors<AdvisoryField> {
  const errors: FieldErrors<AdvisoryField> = {};
  requiredPair(errors, 'name', v.name, 'Group name', MAX.groupName);
  return errors;
}

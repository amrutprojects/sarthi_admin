import { z } from 'zod';
import type { FieldPath } from 'react-hook-form';
import type { ErrorDetail } from '../../../../services/api-client';
import {
  DEFAULT_LOGO_RULES, DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, LOGO_MAX_FILE_MB, LOGO_MIME_TYPE, SUPPORT_EMAIL_MAX, SUPPORT_HOURS_MAX,
  type ApiBranding, type BrandingColours, type BrandingKey, type BrandingSetting, type LogoRules, type UpdateBrandingInput,
} from '../types/branding.types';
import { HEX_COLOUR_RE } from './contrast';

/*
 * Branding and Settings form rules — the backend validator (branding.validator.ts, F-LMS-04 Table 29) with the
 * same limits and messages. Not a security boundary: the server validates every request again.
 *
 * The form keeps every value as text; an empty box means "not set / reset to the default" (the API's null),
 * except for a required key with no default (support email), which cannot be emptied once set.
 */
export interface BrandingFormValues {
  display_name: string;
  colours: { primary: string; accent: string };
  support_email: string;
  support_phone: string;
  /* One box per platform language code. */
  support_hours: Record<string, string>;
  languages: string[];
}

export type BrandingFieldPath = FieldPath<BrandingFormValues>;

export interface BrandingFormContext {
  defaultLanguage: string;
  /* "Marathi", for the default-language message. */
  defaultLanguageLabel: string;
  /* The platform language codes, in platform order. */
  platformCodes: string[];
  /* Required keys without a default that hold a value: they cannot be emptied (support_email). */
  cannotEmpty: BrandingKey[];
}

/* F-LMS-04-01: trimmed, inner whitespace collapsed. */
export const normalizeDisplayName = (s: string) => s.trim().replace(/\s+/g, ' ');

/* Control and invisible format characters (bidi overrides…) are refused; ZWNJ / ZWJ stay (Devanagari needs them). */
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const JOINERS = ['\u200C', '\u200D'];
const hasUnsafeChar = (s: string) => Array.from(s).some((c) => INVISIBLE.test(c) && !JOINERS.includes(c));

/* F-LMS-04-05: spaces and hyphens typed for readability are dropped. */
export const normalizePhone = (s: string) => s.replace(/[\s-]+/g, '');
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export const normalizeEmail = (s: string) => s.trim().toLowerCase();
const emailShape = z.string().email().max(SUPPORT_EMAIL_MAX);

export const normalizeColour = (s: string) => s.trim().toUpperCase();

/* Platform-language order, so equal selections compare (and are stored) identically. */
export const inPlatformOrder = (codes: string[], platformCodes: string[]) => [
  ...platformCodes.filter((c) => codes.includes(c)),
  ...codes.filter((c) => !platformCodes.includes(c)),
];

export const brandingFormSchema = (ctx: BrandingFormContext) =>
  z.object({
    display_name: z.string().superRefine((raw, issue) => {
      const v = normalizeDisplayName(raw);
      if (!v) return;
      if (v.length < DISPLAY_NAME_MIN) issue.addIssue({ code: 'custom', message: `Enter a display name of at least ${DISPLAY_NAME_MIN} characters.` });
      else if (v.length > DISPLAY_NAME_MAX) issue.addIssue({ code: 'custom', message: `Enter a display name of at most ${DISPLAY_NAME_MAX} characters.` });
      else if (hasUnsafeChar(v)) issue.addIssue({ code: 'custom', message: 'Enter a display name.' });
    }),
    colours: z.object({
      primary: z.string().refine((v) => !v.trim() || HEX_COLOUR_RE.test(v.trim()), 'Enter a valid colour.'),
      accent: z.string().refine((v) => !v.trim() || HEX_COLOUR_RE.test(v.trim()), 'Enter a valid colour.'),
    }),
    support_email: z.string().superRefine((raw, issue) => {
      const v = normalizeEmail(raw);
      if (!v ? ctx.cannotEmpty.includes('support_email') : !emailShape.safeParse(v).success) {
        issue.addIssue({ code: 'custom', message: 'Enter a valid email address.' });
      }
    }),
    support_phone: z.string().superRefine((raw, issue) => {
      const v = normalizePhone(raw);
      if (!v ? ctx.cannotEmpty.includes('support_phone') : !PHONE_RE.test(v)) {
        issue.addIssue({ code: 'custom', message: 'Enter a valid phone number.' });
      }
    }),
    support_hours: z.record(z.string().refine((v) => v.trim().length <= SUPPORT_HOURS_MAX, 'Shorten the text.')),
    languages: z.array(z.string()).superRefine((codes, issue) => {
      if (!codes.length) issue.addIssue({ code: 'custom', message: 'Keep at least the default language.' });
      else if (new Set(codes).size !== codes.length) issue.addIssue({ code: 'custom', message: 'Each language can be selected only once' });
      else if (codes.some((c) => !ctx.platformCodes.includes(c))) issue.addIssue({ code: 'custom', message: 'Select a platform language.' });
      else if (!codes.includes(ctx.defaultLanguage)) {
        issue.addIssue({ code: 'custom', message: `${ctx.defaultLanguageLabel} is the entity's default language and cannot be removed.` });
      }
    }),
  });

export const settingOf = (b: { settings: BrandingSetting[] }, key: BrandingKey): BrandingSetting | undefined =>
  b.settings.find((s) => s.key === key);

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/* Form values from the API view. Unset keys start empty; the languages start from the effective list (default kept). */
export function brandingFormFrom(b: ApiBranding, platformCodes: string[]): BrandingFormValues {
  const colours = (settingOf(b, 'colours')?.value ?? null) as BrandingColours | null;
  const hours = (settingOf(b, 'support_hours')?.value ?? {}) as Record<string, string>;
  const effective = settingOf(b, 'languages')?.effectiveValue;
  const languages = Array.isArray(effective) ? (effective as string[]) : [];
  const hourCodes = [...platformCodes, ...Object.keys(hours).filter((c) => !platformCodes.includes(c))];
  return {
    display_name: str(settingOf(b, 'display_name')?.value),
    colours: { primary: colours?.primary ?? '', accent: colours?.accent ?? '' },
    support_email: str(settingOf(b, 'support_email')?.value),
    support_phone: str(settingOf(b, 'support_phone')?.value),
    support_hours: Object.fromEntries(hourCodes.map((c) => [c, hours[c] ?? ''])),
    /* F-LMS-04-07: the default language is always enabled, whatever the stored list says. */
    languages: inPlatformOrder([...new Set([...languages, b.entity.defaultLanguage])], platformCodes),
  };
}

export const brandingFormContext = (b: ApiBranding, platform: { code: string; label: string }[]): BrandingFormContext => ({
  defaultLanguage: b.entity.defaultLanguage,
  defaultLanguageLabel: platform.find((l) => l.code === b.entity.defaultLanguage)?.label ?? b.entity.defaultLanguage,
  platformCodes: platform.map((l) => l.code),
  cannotEmpty: b.settings.filter((s) => s.required && s.fallback === 'none' && s.hasValue).map((s) => s.key),
});

const cleanHours = (r: Record<string, string>) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.trim()] as const).filter(([, v]) => v));

const sameRecord = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/*
 * The PATCH body: only the keys whose (normalised) value changed, so an untouched setting is never rewritten
 * and its audit trail stays clean. Empty = reset to the default (null); colours are sent as a pair.
 */
export function brandingPayload(values: BrandingFormValues, initial: BrandingFormValues, platformCodes: string[]): UpdateBrandingInput {
  const out: UpdateBrandingInput = {};

  const name = normalizeDisplayName(values.display_name);
  if (name !== normalizeDisplayName(initial.display_name)) out.display_name = name || null;

  const primary = normalizeColour(values.colours.primary);
  const accent = normalizeColour(values.colours.accent);
  if (primary !== normalizeColour(initial.colours.primary) || accent !== normalizeColour(initial.colours.accent)) {
    out.colours = { primary: primary || null, accent: accent || null };
  }

  const email = normalizeEmail(values.support_email);
  if (email && email !== normalizeEmail(initial.support_email)) out.support_email = email;

  const phone = normalizePhone(values.support_phone);
  if (phone !== normalizePhone(initial.support_phone)) out.support_phone = phone || null;

  const hours = cleanHours(values.support_hours);
  if (!sameRecord(hours, cleanHours(initial.support_hours))) out.support_hours = Object.keys(hours).length ? hours : null;

  const languages = inPlatformOrder(values.languages, platformCodes);
  if (languages.join(',') !== inPlatformOrder(initial.languages, platformCodes).join(',')) out.languages = languages;

  return out;
}

/*
 * Server answers to form fields: "body.colours.primary" → colours.primary, "body.languages.1" → languages,
 * "languages" (the default-language rule) → languages. Details that name no form field are returned apart
 * (the caller toasts them).
 */
export function brandingServerErrors(details: ErrorDetail[], values: BrandingFormValues) {
  const fields: { path: BrandingFieldPath; message: string }[] = [];
  const other: ErrorDetail[] = [];
  for (const d of details) {
    const parts = (d.field ?? '').replace(/^body\./, '').split('.');
    let path: BrandingFieldPath | null = null;
    switch (parts[0]) {
      case 'display_name':
      case 'support_email':
      case 'support_phone':
      case 'languages':
        path = parts[0];
        break;
      case 'colours':
        path = parts[1] === 'accent' ? 'colours.accent' : 'colours.primary';
        break;
      case 'support_hours': {
        /* A detail on the whole record (no language named) goes on the first language box. */
        const code = parts[1] && parts[1] in values.support_hours ? parts[1] : Object.keys(values.support_hours)[0];
        path = code ? `support_hours.${code}` : null;
        break;
      }
    }
    if (path && !fields.some((f) => f.path === path)) fields.push({ path, message: d.message });
    else if (!path) other.push(d);
  }
  return { fields, other };
}

/* F-LMS-04-02, the server's own message, with the size limit in force. */
export const logoRule = (maxFileMb: number = LOGO_MAX_FILE_MB) => `Upload a PNG image within the size limit (at most ${maxFileMb} MB).`;
export const LOGO_RULE = logoRule();

/* Client check before the upload (type by MIME or extension, size); the server checks the content again. */
export function logoFileError(file: File, rules: LogoRules = DEFAULT_LOGO_RULES): string | undefined {
  const png = file.type ? file.type === LOGO_MIME_TYPE : /\.png$/i.test(file.name);
  if (!png || file.size === 0 || file.size > rules.maxFileMb * 1024 * 1024) return logoRule(rules.maxFileMb);
  return undefined;
}

type LogoDimensionLimits = Pick<LogoRules, 'maxWidthPx' | 'maxHeightPx'>;

/* "512 × 256 pixels" / "512 pixels wide" / "256 pixels high"; null when no dimension limit is configured (backend logoDimensionRule). */
export function logoDimensionRule(r: LogoDimensionLimits): string | null {
  if (r.maxWidthPx !== null && r.maxHeightPx !== null) return `${r.maxWidthPx} × ${r.maxHeightPx} pixels`;
  if (r.maxWidthPx !== null) return `${r.maxWidthPx} pixels wide`;
  if (r.maxHeightPx !== null) return `${r.maxHeightPx} pixels high`;
  return null;
}

/* A logo over the configured dimensions: the server's message word for word (backend logoDimensionError). */
export function logoDimensionError(size: { width: number; height: number }, r: LogoDimensionLimits): string | undefined {
  const tooWide = r.maxWidthPx !== null && size.width > r.maxWidthPx;
  const tooHigh = r.maxHeightPx !== null && size.height > r.maxHeightPx;
  if (!tooWide && !tooHigh) return undefined;
  return `Upload a PNG image of at most ${logoDimensionRule(r)}; this one is ${size.width} × ${size.height} pixels.`;
}

/* The upload hint: "Accepted: PNG, at most 5 MB, at most 512 × 256 pixels." */
export function logoRulesText(r: LogoRules): string {
  const types = r.types.map((t) => t.replace(/^image\//, '').toUpperCase()).join(' or ') || 'PNG';
  const dims = logoDimensionRule(r);
  return `Accepted: ${types}, at most ${r.maxFileMb} MB, ${dims ? `at most ${dims}` : 'any dimensions'}.`;
}

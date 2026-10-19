import type { FieldErrors } from '../../validation';
import type { ApiContactPage, Bilingual, ContactField, OrgType, UpdateContactPageInput } from '../types/contact.types';

/*
 * Contact page form rules, deliberately identical to the server rules in
 * backend/src/cms/contact/contact.validator.ts and to the CHECK constraints on the two tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface BilingualValue {
  mr: string;
  en: string;
}

export interface OrgFormValues {
  orgType: OrgType;
  name: BilingualValue;
  role: BilingualValue;
  address: BilingualValue;
  email: string;
  phone: string;
  websiteUrl: string;
  helpdeskHours: BilingualValue;
  displayOrder: number;
  isActive: boolean;
}

export interface ContactFormValues {
  pageTitle: BilingualValue;
  pageSubtitle: BilingualValue;
  isPublished: boolean;
  amrut: OrgFormValues;
  partner: OrgFormValues;
}

const emptyPair = (): BilingualValue => ({ mr: '', en: '' });

const pairOf = (value: Bilingual | null): BilingualValue => (value ? { mr: value.mr, en: value.en } : emptyPair());

/* The API shape flattened into the two cards the form edits, so inputs bind to plain strings. */
export function toFormValues(page: ApiContactPage): ContactFormValues {
  const find = (type: OrgType) => page.organizations.find((o) => o.orgType === type);
  const card = (type: OrgType, order: number): OrgFormValues => {
    const o = find(type);
    return {
      orgType: type,
      name: pairOf(o?.name ?? null),
      role: pairOf(o?.role ?? null),
      address: pairOf(o?.address ?? null),
      email: o?.email ?? '',
      phone: o?.phone ?? '',
      websiteUrl: o?.websiteUrl ?? '',
      helpdeskHours: pairOf(o?.helpdeskHours ?? null),
      displayOrder: o?.displayOrder ?? order,
      isActive: o?.isActive ?? true,
    };
  };
  return {
    pageTitle: pairOf(page.pageTitle),
    pageSubtitle: pairOf(page.pageSubtitle),
    isPublished: page.isPublished,
    amrut: card('AMRUT', 0),
    partner: card('IMPLEMENTATION_PARTNER', 1),
  };
}

const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });
const blankToNull = (s: string): string | null => (s.trim() ? s.trim() : null);
const pairToNull = (p: BilingualValue): Bilingual | null => (p.mr.trim() && p.en.trim() ? trimPair(p) : null);

/*
 * The request body. Every value is trimmed, and a field that does not apply to a card is sent as
 * null rather than an empty string — the column is nullable and "" is not a valid value for it.
 */
export function toPayload(v: ContactFormValues): UpdateContactPageInput {
  return {
    pageTitle: trimPair(v.pageTitle),
    pageSubtitle: trimPair(v.pageSubtitle),
    isPublished: v.isPublished,
    organizations: [
      {
        orgType: 'AMRUT',
        name: trimPair(v.amrut.name),
        address: pairToNull(v.amrut.address),
        email: blankToNull(v.amrut.email),
        phone: blankToNull(v.amrut.phone),
        websiteUrl: blankToNull(v.amrut.websiteUrl),
        role: null,
        helpdeskHours: null,
        displayOrder: v.amrut.displayOrder,
        isActive: v.amrut.isActive,
      },
      {
        orgType: 'IMPLEMENTATION_PARTNER',
        name: trimPair(v.partner.name),
        role: pairToNull(v.partner.role),
        email: blankToNull(v.partner.email),
        helpdeskHours: pairToNull(v.partner.helpdeskHours),
        address: null,
        phone: null,
        websiteUrl: null,
        displayOrder: v.partner.displayOrder,
        isActive: v.partner.isActive,
      },
    ],
  };
}

/* ---------------- rules ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ()-]+$/;

const required = (value: string, label: string, max: number): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  return undefined;
};

export const validateEmail = (value: string, label: string): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > 255) return `${label} must be at most 255 characters`;
  if (!EMAIL_RE.test(v)) return `${label} must be a valid email address`;
  return undefined;
};

export const validatePhone = (value: string, label: string): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > 32) return `${label} must be at most 32 characters`;
  if (!PHONE_RE.test(v)) return `${label} may use digits, spaces, brackets and hyphens, optionally starting with +`;
  const digits = v.replace(/\D/g, '').length;
  if (digits < 6 || digits > 20) return `${label} must contain between 6 and 20 digits`;
  return undefined;
};

/* Optional, but an absolute http(s) URL when given — never a relative or javascript: URL. */
export const validateUrl = (value: string, label: string): string | undefined => {
  const v = value.trim();
  if (!v) return undefined;
  if (v.length > 255) return `${label} must be at most 255 characters`;
  try {
    if (!['http:', 'https:'].includes(new URL(v).protocol)) return `${label} must start with http:// or https://`;
  } catch {
    return `${label} must be an absolute http:// or https:// URL`;
  }
  return undefined;
};

/*
 * Both halves of every managed string are required. A page where only one language was filled in
 * would render blank for half the visitors, and Marathi is the default.
 */
function pairErrors(
  errors: FieldErrors<ContactField>,
  prefix: string,
  value: BilingualValue,
  label: string,
  max: number,
): void {
  errors[`${prefix}.mr` as ContactField] = required(value.mr, `${label} (Marathi)`, max);
  errors[`${prefix}.en` as ContactField] = required(value.en, `${label} (English)`, max);
}

export function validateContactForm(v: ContactFormValues): FieldErrors<ContactField> {
  const errors: FieldErrors<ContactField> = {};

  pairErrors(errors, 'pageTitle', v.pageTitle, 'Page title', 150);
  pairErrors(errors, 'pageSubtitle', v.pageSubtitle, 'Page subtitle', 300);

  pairErrors(errors, 'AMRUT.name', v.amrut.name, 'Organisation name', 150);
  pairErrors(errors, 'AMRUT.address', v.amrut.address, 'Address', 500);
  errors['AMRUT.email'] = validateEmail(v.amrut.email, 'Email');
  errors['AMRUT.phone'] = validatePhone(v.amrut.phone, 'Phone');
  errors['AMRUT.websiteUrl'] = validateUrl(v.amrut.websiteUrl, 'Website');

  pairErrors(errors, 'IMPLEMENTATION_PARTNER.name', v.partner.name, 'Organisation name', 150);
  pairErrors(errors, 'IMPLEMENTATION_PARTNER.role', v.partner.role, 'Role', 200);
  errors['IMPLEMENTATION_PARTNER.email'] = validateEmail(v.partner.email, 'Programme desk email');
  pairErrors(errors, 'IMPLEMENTATION_PARTNER.helpdeskHours', v.partner.helpdeskHours, 'Helpdesk hours', 120);

  return errors;
}

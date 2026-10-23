import { validateWholeNumber, type FieldErrors } from '../../validation';
import {
  ORG_TYPES,
  SECTION_ORG,
  type ApiContactOrganization,
  type ApiContactPage,
  type ApiCoordinator,
  type ApiDistrictOffice,
  type Bilingual,
  type ContactField,
  type ContactOrganizationInput,
  type ContactSection,
  type CoordinatorField,
  type CreateCoordinatorInput,
  type CreateDistrictOfficeInput,
  type DistrictRef,
  type OfficeField,
  type OrgType,
  type UpdateContactPageInput,
} from '../types/contact.types';

/*
 * Contact page form rules, deliberately identical to the server rules in
 * backend/src/cms/contact/contact.validator.ts and to the CHECK constraints on the tables.
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

/* The banner and both cards, flattened so inputs bind to plain strings. Each Edit page changes one part. */
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

/* A saved card sent back exactly as it is (the PUT is strict, so only the fields it accepts). */
const savedCard = (o: ApiContactOrganization): ContactOrganizationInput => ({
  orgType: o.orgType,
  name: { mr: o.name.mr, en: o.name.en },
  role: o.role ? { mr: o.role.mr, en: o.role.en } : null,
  address: o.address ? { mr: o.address.mr, en: o.address.en } : null,
  email: o.email,
  phone: o.phone,
  websiteUrl: o.websiteUrl,
  helpdeskHours: o.helpdeskHours ? { mr: o.helpdeskHours.mr, en: o.helpdeskHours.en } : null,
  displayOrder: o.displayOrder,
  isActive: o.isActive,
});

/*
 * The PUT body for one section's Edit page: the page as it was loaded, with only that section
 * changed. A card the PUT leaves out is retired, so the other card is sent back unchanged — and a
 * card that is not configured stays absent rather than being created empty. The coordinators and
 * district offices are not sent at all, so the backend leaves them as they are.
 */
export function toSectionPayload(page: ApiContactPage, section: ContactSection, v: ContactFormValues): UpdateContactPageInput {
  const edited = toPayload(v);
  const card = (type: OrgType): ContactOrganizationInput | undefined => {
    if (section !== 'page' && SECTION_ORG[section] === type) return edited.organizations.find((o) => o.orgType === type);
    const saved = page.organizations.find((o) => o.orgType === type);
    return saved ? savedCard(saved) : undefined;
  };
  return {
    pageTitle: section === 'page' ? edited.pageTitle : { mr: page.pageTitle.mr, en: page.pageTitle.en },
    pageSubtitle: section === 'page' ? edited.pageSubtitle : { mr: page.pageSubtitle.mr, en: page.pageSubtitle.en },
    isPublished: section === 'page' ? edited.isPublished : page.isPublished,
    organizations: ORG_TYPES.map(card).filter((o): o is ContactOrganizationInput => Boolean(o)),
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

/* Only the fields of the section being edited: the rest of the page is sent back as it was loaded. */
export function validateContactSection(section: ContactSection, v: ContactFormValues): FieldErrors<ContactField> {
  const errors: FieldErrors<ContactField> = {};

  if (section === 'page') {
    pairErrors(errors, 'pageTitle', v.pageTitle, 'Page title', 150);
    pairErrors(errors, 'pageSubtitle', v.pageSubtitle, 'Page subtitle', 300);
  }

  if (section === 'amrut') {
    pairErrors(errors, 'AMRUT.name', v.amrut.name, 'Organisation name', 150);
    pairErrors(errors, 'AMRUT.address', v.amrut.address, 'Address', 500);
    errors['AMRUT.email'] = validateEmail(v.amrut.email, 'Email');
    errors['AMRUT.phone'] = validatePhone(v.amrut.phone, 'Phone');
    errors['AMRUT.websiteUrl'] = validateUrl(v.amrut.websiteUrl, 'Website');
  }

  if (section === 'partner') {
    pairErrors(errors, 'IMPLEMENTATION_PARTNER.name', v.partner.name, 'Organisation name', 150);
    pairErrors(errors, 'IMPLEMENTATION_PARTNER.role', v.partner.role, 'Role', 200);
    errors['IMPLEMENTATION_PARTNER.email'] = validateEmail(v.partner.email, 'Programme desk email');
    pairErrors(errors, 'IMPLEMENTATION_PARTNER.helpdeskHours', v.partner.helpdeskHours, 'Helpdesk hours', 120);
  }

  return errors;
}

/* ---------------- coordinators & district offices ---------------- */

const optional = (fn: (v: string, label: string) => string | undefined) => (value: string, label: string) =>
  value.trim() ? fn(value, label) : undefined;

/* An optional pair is all-or-nothing: one half without the other would show a blank line. */
const optionalPair = (value: BilingualValue, label: string, max: number): { mr?: string; en?: string } => {
  const mr = value.mr.trim();
  const en = value.en.trim();
  if (!mr && !en) return {};
  return {
    mr: !mr ? `${label} (Marathi) is required when English is given` : mr.length > max ? `${label} (Marathi) must be at most ${max} characters` : undefined,
    en: !en ? `${label} (English) is required when Marathi is given` : en.length > max ? `${label} (English) must be at most ${max} characters` : undefined,
  };
};

/* Like validatePhone, but X may mask a digit ("+91 98XXX 41201"), as the public site shows coordinators. */
export const validateCoordinatorPhone = (value: string, label: string): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > 32) return `${label} must be at most 32 characters`;
  if (!/^\+?[0-9Xx ()-]+$/.test(v)) return `${label} may use digits (or X for a masked digit), spaces, brackets and hyphens, optionally starting with +`;
  const digits = v.replace(/[^0-9Xx]/g, '').length;
  if (digits < 6 || digits > 20) return `${label} must contain between 6 and 20 digits`;
  return undefined;
};

export const COORDINATOR_NAME_MAX = 120;
export const COLLECTOR_NAME_MAX = 150;
export const OFFICE_ADDRESS_MAX = 500;
export const OFFICE_HOURS_MAX = 120;

export interface CoordinatorFormValues {
  name: string;
  phone: string;
  email: string;
  /* In the order the website lists them, lead district first. */
  districts: DistrictRef[];
  /* Typed as text so the box can be left empty: an empty order puts a new coordinator at the end. */
  displayOrder: string;
  isActive: boolean;
}

export const emptyCoordinatorForm = (): CoordinatorFormValues => ({
  name: '',
  phone: '',
  email: '',
  districts: [],
  displayOrder: '',
  isActive: true,
});

export const toCoordinatorFormValues = (c: ApiCoordinator): CoordinatorFormValues => ({
  name: c.name,
  phone: c.phone,
  email: c.email ?? '',
  districts: c.districts.map(({ id, name, code }) => ({ id, name, code })),
  displayOrder: String(c.displayOrder),
  isActive: c.isActive,
});

/* The values actually sent to the API: trimmed, a blank email as null, and no order at all when the box is empty. */
export const normalizeCoordinatorForm = (v: CoordinatorFormValues): CreateCoordinatorInput => ({
  name: v.name.trim(),
  phone: v.phone.trim(),
  email: blankToNull(v.email),
  districtIds: v.districts.map((d) => d.id),
  ...(v.displayOrder.trim() ? { displayOrder: Number(v.displayOrder.trim()) } : {}),
  isActive: v.isActive,
});

export function validateCoordinatorForm(v: CoordinatorFormValues, { orderRequired = false } = {}): FieldErrors<CoordinatorField> {
  return {
    name: required(v.name, 'Coordinator name', COORDINATOR_NAME_MAX),
    phone: validateCoordinatorPhone(v.phone, 'Phone'),
    email: optional(validateEmail)(v.email, 'Email'),
    displayOrder: validateWholeNumber(v.displayOrder, 'Display order', { min: 0, max: 999, required: orderRequired }),
  };
}

export interface OfficeFormValues {
  districtId: string;
  collectorName: string;
  address: BilingualValue;
  phone: string;
  email: string;
  officeHours: BilingualValue;
  isActive: boolean;
}

export const emptyOfficeForm = (): OfficeFormValues => ({
  districtId: '',
  collectorName: '',
  address: emptyPair(),
  phone: '',
  email: '',
  officeHours: emptyPair(),
  isActive: true,
});

export const toOfficeFormValues = (o: ApiDistrictOffice): OfficeFormValues => ({
  districtId: o.district.id,
  collectorName: o.collectorName ?? '',
  address: pairOf(o.address),
  phone: o.phone ?? '',
  email: o.email ?? '',
  officeHours: pairOf(o.officeHours),
  isActive: o.isActive,
});

/* Every Collectorate field is optional: a blank one is sent as null and the website shows "to be supplied". */
export const normalizeOfficeForm = (v: OfficeFormValues): CreateDistrictOfficeInput => ({
  districtId: v.districtId,
  collectorName: blankToNull(v.collectorName),
  address: pairToNull(v.address),
  phone: blankToNull(v.phone),
  email: blankToNull(v.email),
  officeHours: pairToNull(v.officeHours),
  isActive: v.isActive,
});

export function validateOfficeForm(v: OfficeFormValues): FieldErrors<OfficeField> {
  const address = optionalPair(v.address, 'Office address', OFFICE_ADDRESS_MAX);
  const hours = optionalPair(v.officeHours, 'Office hours', OFFICE_HOURS_MAX);
  return {
    districtId: v.districtId ? undefined : 'District is required',
    collectorName:
      v.collectorName.trim().length > COLLECTOR_NAME_MAX ? `Collector name must be at most ${COLLECTOR_NAME_MAX} characters` : undefined,
    'address.mr': address.mr,
    'address.en': address.en,
    phone: optional(validatePhone)(v.phone, 'Official phone'),
    email: optional(validateEmail)(v.email, 'Official email'),
    'officeHours.mr': hours.mr,
    'officeHours.en': hours.en,
  };
}

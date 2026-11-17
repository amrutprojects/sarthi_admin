import type { FieldErrors } from '../../validation';
import type {
  ApiFooter,
  ApiFooterLink,
  Bilingual,
  FooterField,
  FooterLinkKind,
  UpdateFooterInput,
  UpdateFooterLinkInput,
} from '../types/footer.types';
import { LINKING_KINDS, MAX_LINK_COLUMNS } from '../types/footer.types';

/*
 * Footer form rules, deliberately identical to the server rules in
 * backend/src/cms/footer/footer.validator.ts and to the CHECK constraints on the three tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface BilingualValue {
  mr: string;
  en: string;
}

export interface LinkFormValues {
  kind: FooterLinkKind;
  label: BilingualValue;
  href: string;
  isActive: boolean;
}

export interface ColumnFormValues {
  heading: BilingualValue;
  isActive: boolean;
  links: LinkFormValues[];
}

export interface FooterFormValues {
  about: {
    heading: BilingualValue;
    body: BilingualValue;
    partnerLabel: BilingualValue;
    partnerName: BilingualValue;
  };
  linkColumns: ColumnFormValues[];
  contact: {
    heading: BilingualValue;
    address: BilingualValue;
    email: string;
    phone: string;
    links: LinkFormValues[];
  };
  bottom: {
    copyright: BilingualValue;
    disclaimer: BilingualValue;
  };
  isPublished: boolean;
}

const pairOf = (value: Bilingual | null | undefined): BilingualValue =>
  value ? { mr: value.mr, en: value.en } : { mr: '', en: '' };

const linkOf = (l: ApiFooterLink): LinkFormValues => ({
  kind: l.kind,
  label: pairOf(l.label),
  href: l.href ?? '',
  isActive: l.isActive,
});

export const emptyLink = (): LinkFormValues => ({
  kind: 'INTERNAL',
  label: { mr: '', en: '' },
  href: '',
  isActive: true,
});

export const emptyColumn = (): ColumnFormValues => ({
  heading: { mr: '', en: '' },
  isActive: true,
  links: [],
});

/* The API shape flattened into what the form edits, so inputs bind to plain strings. */
export function toFormValues(footer: ApiFooter): FooterFormValues {
  return {
    about: {
      heading: pairOf(footer.about.heading),
      body: pairOf(footer.about.body),
      partnerLabel: pairOf(footer.about.partnerLabel),
      partnerName: pairOf(footer.about.partnerName),
    },
    linkColumns: footer.linkColumns.map((c) => ({
      heading: pairOf(c.heading),
      isActive: c.isActive,
      links: c.links.map(linkOf),
    })),
    contact: {
      heading: pairOf(footer.contact.heading),
      address: pairOf(footer.contact.address),
      email: footer.contact.email,
      phone: footer.contact.phone,
      links: footer.contact.links.map(linkOf),
    },
    bottom: {
      copyright: pairOf(footer.bottom.copyright),
      disclaimer: pairOf(footer.bottom.disclaimer),
    },
    isPublished: footer.isPublished,
  };
}

const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });

/*
 * One line, as the request carries it.
 *
 * `href` is sent only for the two linking kinds. A TEXT or UNAVAILABLE row sends null rather than
 * the string the administrator may have typed before switching the kind — the column rejects a
 * stray href, and sending one would also let a destination be parked on a row and activated later
 * by changing nothing but the kind.
 */
const toLinkPayload = (l: LinkFormValues, index: number): UpdateFooterLinkInput => ({
  kind: l.kind,
  label: trimPair(l.label),
  href: LINKING_KINDS.includes(l.kind) ? l.href.trim() : null,
  displayOrder: index,
  isActive: l.isActive,
});

/* The request body. Every value is trimmed, and order is taken from position in the list. */
export function toPayload(v: FooterFormValues): UpdateFooterInput {
  return {
    about: {
      heading: trimPair(v.about.heading),
      body: trimPair(v.about.body),
      partnerLabel: trimPair(v.about.partnerLabel),
      partnerName: trimPair(v.about.partnerName),
    },
    linkColumns: v.linkColumns.map((c, index) => ({
      heading: trimPair(c.heading),
      displayOrder: index,
      isActive: c.isActive,
      links: c.links.map(toLinkPayload),
    })),
    contact: {
      heading: trimPair(v.contact.heading),
      address: trimPair(v.contact.address),
      email: v.contact.email.trim().toLowerCase(),
      phone: v.contact.phone.trim(),
      links: v.contact.links.map(toLinkPayload),
    },
    bottom: {
      copyright: trimPair(v.bottom.copyright),
      disclaimer: trimPair(v.bottom.disclaimer),
    },
    isPublished: v.isPublished,
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
  if (!PHONE_RE.test(v))
    return `${label} may use digits, spaces, brackets and hyphens, optionally starting with +`;
  const digits = v.replace(/\D/g, '').length;
  if (digits < 6 || digits > 20) return `${label} must contain between 6 and 20 digits`;
  return undefined;
};

/*
 * A link's destination, by kind.
 *
 * These values become href attributes on every page of the public site, so the two non-linking
 * kinds must carry nothing at all, an internal link must stay on this site — "//host" is excluded
 * because the browser reads it as protocol-relative and would leave — and an external link must be
 * absolute http(s), which is what rules out javascript: and data:.
 */
export function validateHref(kind: FooterLinkKind, raw: string): string | undefined {
  const v = raw.trim();

  if (!LINKING_KINDS.includes(kind)) {
    return v ? 'This kind of line has no destination, so leave the link empty' : undefined;
  }
  if (!v) return 'A destination is required';
  if (v.length > 500) return 'Link must be at most 500 characters';

  if (kind === 'INTERNAL') {
    if (!v.startsWith('/') || v.startsWith('//')) {
      return 'Use a path on this site, such as /apply';
    }
    return undefined;
  }

  try {
    if (!['http:', 'https:'].includes(new URL(v).protocol)) {
      return 'Must start with http:// or https://';
    }
  } catch {
    return 'Must be an absolute http:// or https:// URL';
  }
  return undefined;
}

/*
 * Both halves of every managed string are required. A footer where only one language was filled in
 * would render blank for half the visitors, and Marathi is the default.
 */
function pairErrors(
  errors: FieldErrors<FooterField>,
  prefix: string,
  value: BilingualValue,
  label: string,
  max: number,
): void {
  errors[`${prefix}.mr`] = required(value.mr, `${label} (Marathi)`, max);
  errors[`${prefix}.en`] = required(value.en, `${label} (English)`, max);
}

function linkErrors(
  errors: FieldErrors<FooterField>,
  prefix: string,
  links: LinkFormValues[],
): void {
  links.forEach((link, index) => {
    pairErrors(errors, `${prefix}.${index}.label`, link.label, 'Link label', 150);
    errors[`${prefix}.${index}.href`] = validateHref(link.kind, link.href);
  });
}

export function validateFooterForm(v: FooterFormValues): FieldErrors<FooterField> {
  const errors: FieldErrors<FooterField> = {};

  pairErrors(errors, 'about.heading', v.about.heading, 'About heading', 200);
  pairErrors(errors, 'about.body', v.about.body, 'About text', 2000);
  pairErrors(errors, 'about.partnerLabel', v.about.partnerLabel, 'Partner label', 120);
  pairErrors(errors, 'about.partnerName', v.about.partnerName, 'Partner name', 150);

  /* The cap is the layout, not a data limit — see MAX_LINK_COLUMNS. */
  if (v.linkColumns.length < 1) {
    errors['linkColumns'] = 'At least one link column is required';
  } else if (v.linkColumns.length > MAX_LINK_COLUMNS) {
    errors['linkColumns'] = `The footer layout holds at most ${MAX_LINK_COLUMNS} link columns`;
  }

  v.linkColumns.forEach((column, index) => {
    pairErrors(errors, `linkColumns.${index}.heading`, column.heading, 'Column heading', 200);
    linkErrors(errors, `linkColumns.${index}.links`, column.links);
  });

  pairErrors(errors, 'contact.heading', v.contact.heading, 'Contact heading', 200);
  pairErrors(errors, 'contact.address', v.contact.address, 'Address', 500);
  errors['contact.email'] = validateEmail(v.contact.email, 'Email');
  errors['contact.phone'] = validatePhone(v.contact.phone, 'Phone');
  linkErrors(errors, 'contact.links', v.contact.links);

  pairErrors(errors, 'bottom.copyright', v.bottom.copyright, 'Copyright line', 300);
  pairErrors(errors, 'bottom.disclaimer', v.bottom.disclaimer, 'Disclaimer', 400);

  return errors;
}

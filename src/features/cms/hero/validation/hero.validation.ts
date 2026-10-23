import type { FieldErrors } from '../../validation';
import type { ApiHomeHero, Bilingual, HeroField, UpdateHomeHeroInput } from '../types/hero.types';

/*
 * Home hero form rules, deliberately identical to the server rules in
 * backend/src/cms/hero/hero.validator.ts and to the CHECK constraints on home_hero and
 * home_hero_slides.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface BilingualValue {
  mr: string;
  en: string;
}

export interface SlideFormValues {
  tag: BilingualValue;
  title: BilingualValue;
  description: BilingualValue;
  ctaLabel: BilingualValue;
  ctaLink: string;
  isActive: boolean;
}

export interface HeroFormValues {
  readMoreLabel: BilingualValue;
  checkStatusLabel: BilingualValue;
  slides: SlideFormValues[];
  isPublished: boolean;
  /* The glance card's district count as typed; null when the card is not configured, so there is nothing to enter. */
  districtCount: string | null;
}

export const MAX_SLIDES = 10;

/*
 * The pages a slide's button can open. A select rather than free text, so a typo cannot send the
 * visitors of the busiest page on the site to a "page not found".
 */
export const HERO_LINK_PAGES: { path: string; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/programme', label: 'Programme' },
  { path: '/modules', label: 'Modules' },
  { path: '/eligibility', label: 'Eligibility' },
  { path: '/apply', label: 'Apply' },
  { path: '/faq', label: 'FAQ' },
  { path: '/contact', label: 'Contact' },
  { path: '/track', label: 'Track application' },
  { path: '/verify', label: 'Verify certificate' },
];

/* The page name for a stored link; a path that is not one of the pages above is shown as it is. */
export const linkLabel = (path: string): string => HERO_LINK_PAGES.find((p) => p.path === path)?.label ?? path;

export const emptySlide = (): SlideFormValues => ({
  tag: { mr: '', en: '' },
  title: { mr: '', en: '' },
  description: { mr: '', en: '' },
  ctaLabel: { mr: '', en: '' },
  ctaLink: '',
  isActive: true,
});

const pairOf = (v: Bilingual | null | undefined): BilingualValue => (v ? { mr: v.mr, en: v.en } : { mr: '', en: '' });
const trimPair = (p: BilingualValue): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });

export function toFormValues(hero: ApiHomeHero): HeroFormValues {
  return {
    readMoreLabel: pairOf(hero.readMoreLabel),
    checkStatusLabel: pairOf(hero.checkStatusLabel),
    slides: hero.slides.map((s) => ({
      tag: pairOf(s.tag),
      title: pairOf(s.title),
      description: pairOf(s.description),
      ctaLabel: pairOf(s.ctaLabel),
      ctaLink: s.ctaLink,
      isActive: s.isActive,
    })),
    isPublished: hero.isPublished,
    districtCount: hero.glance ? String(hero.glance.districtCount) : null,
  };
}

/*
 * The PUT body. The server schema is .strict(), so this is exactly its keys and nothing read-only —
 * the derived glance figures are not sent, and the district count only when the card is configured;
 * expectedUpdatedAt is the version the form was opened with, so a save never silently overwrites
 * someone else's newer edit.
 */
export function toPayload(v: HeroFormValues, expectedUpdatedAt: string): UpdateHomeHeroInput {
  return {
    readMoreLabel: trimPair(v.readMoreLabel),
    checkStatusLabel: trimPair(v.checkStatusLabel),
    slides: v.slides.map((s, index) => ({
      tag: trimPair(s.tag),
      title: trimPair(s.title),
      description: trimPair(s.description),
      ctaLabel: trimPair(s.ctaLabel),
      ctaLink: s.ctaLink.trim(),
      displayOrder: index,
      isActive: s.isActive,
    })),
    isPublished: v.isPublished,
    ...(v.districtCount !== null ? { districtCount: Number(v.districtCount.trim()) } : {}),
    expectedUpdatedAt,
  };
}

const required = (value: string, label: string, max: number): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  return undefined;
};

/*
 * A page on this site and nothing else. "//host" is excluded because the browser reads it as
 * protocol-relative and would leave the site; the character set keeps javascript: and data: out.
 */
const SITE_PATH = /^\/[A-Za-z0-9._~/?=&%#-]*$/;

export function validateLink(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'Button link is required';
  if (v.length > 200) return 'Button link must be at most 200 characters';
  if (!SITE_PATH.test(v) || v.startsWith('//')) return 'Button link must be a page on this site, starting with /';
  return undefined;
}

/* A whole number from 0 to 9999, as programme_module_settings.districtCount accepts. */
export function validateDistrictCount(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'District count is required';
  const n = Number(v);
  if (!Number.isFinite(n)) return 'District count must be a number';
  if (!Number.isInteger(n)) return 'District count must be a whole number';
  if (n < 0) return 'District count cannot be negative';
  if (n > 9999) return 'District count is too large';
  return undefined;
}

/*
 * Both halves of every pair are required: the public site defaults to Marathi, so a field filled in
 * one language leaves half the visitors looking at a blank line.
 */
export function validateHeroForm(v: HeroFormValues): FieldErrors<HeroField> {
  const errors: FieldErrors<HeroField> = {};
  const pair = (prefix: string, value: BilingualValue, label: string, max: number) => {
    errors[`${prefix}.mr`] = required(value.mr, `${label} (Marathi)`, max);
    errors[`${prefix}.en`] = required(value.en, `${label} (English)`, max);
  };

  pair('readMoreLabel', v.readMoreLabel, 'Learn more button', 60);
  pair('checkStatusLabel', v.checkStatusLabel, 'Check status button', 60);

  /* The banner never goes empty: with no visible slide the top of the home page would be a blank box. */
  if (v.slides.length < 1) errors['slides'] = 'At least one slide is required';
  else if (v.slides.length > MAX_SLIDES) errors['slides'] = `At most ${MAX_SLIDES} slides`;
  else if (!v.slides.some((s) => s.isActive)) errors['slides'] = 'At least one slide must be visible';

  v.slides.forEach((s, i) => {
    pair(`slides.${i}.tag`, s.tag, 'Tag', 60);
    pair(`slides.${i}.title`, s.title, 'Heading', 200);
    pair(`slides.${i}.description`, s.description, 'Description', 400);
    pair(`slides.${i}.ctaLabel`, s.ctaLabel, 'Button label', 60);
    errors[`slides.${i}.ctaLink`] = validateLink(s.ctaLink);
  });

  if (v.districtCount !== null) errors['districtCount'] = validateDistrictCount(v.districtCount);

  return errors;
}

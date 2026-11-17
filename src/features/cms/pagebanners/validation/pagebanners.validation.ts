/*
 * The Edit banner form's rules, kept identical to the server's (PUT /cms/page-banners/:key): each half trimmed; a
 * pair blank in both languages = the website's default; one half blank is refused; the title at most 150 characters
 * on one line, the subtitle at most 300. The server checks every request again, and its 422 lands on the same fields.
 */
import type { FieldErrors } from '../../validation';
import type { Bilingual, PageBanner, UpdatePageBannerInput } from '../types/pagebanners.types';
import type { PageBannerEntry } from '../constants';

export const TITLE_MAX = 150;
export const SUBTITLE_MAX = 300;

export type BannerField = 'title.mr' | 'title.en' | 'title' | 'subtitle.mr' | 'subtitle.en' | 'subtitle';

export interface BannerFormValues {
  title: Bilingual;
  subtitle: Bilingual;
}

/* Line breaks, tabs and the other control characters: the title is a single line. */
const CONTROL_RE = /\p{Cc}/u;

const LANG = { mr: 'Marathi', en: 'English' } as const;

function half(values: Bilingual, lang: 'mr' | 'en', what: 'title' | 'subtitle', max: number): string | undefined {
  const value = values[lang].trim();
  const other = values[lang === 'mr' ? 'en' : 'mr'].trim();
  if (!value) return other ? `Enter the ${LANG[lang]} ${what} too, or leave both blank to use the default ${what}` : undefined;
  if (value.length > max) return `${LANG[lang]} ${what} must be at most ${max} characters`;
  if (what === 'title' && CONTROL_RE.test(value)) return `${LANG[lang]} title may not contain line breaks or control characters`;
  return undefined;
}

export function validateBanner(v: BannerFormValues): FieldErrors<BannerField> {
  return {
    'title.mr': half(v.title, 'mr', 'title', TITLE_MAX),
    'title.en': half(v.title, 'en', 'title', TITLE_MAX),
    'subtitle.mr': half(v.subtitle, 'mr', 'subtitle', SUBTITLE_MAX),
    'subtitle.en': half(v.subtitle, 'en', 'subtitle', SUBTITLE_MAX),
  };
}

const blank = (): Bilingual => ({ mr: '', en: '' });

/* The form opens with what the website shows now: the page's own text, else the default (blank where it is not fixed text). */
export const toBannerForm = (item: PageBanner, entry: Pick<PageBannerEntry, 'title' | 'subtitle'>): BannerFormValues => ({
  title: { ...(item.title ?? entry.title) },
  subtitle: { ...(item.subtitle ?? entry.subtitle ?? blank()) },
});

/*
 * One half of what Save sends: null (the default) when both languages are blank or are the default itself, so the
 * page keeps following the website's default instead of a copy of it; otherwise both languages trimmed.
 */
function pair(values: Bilingual, defaults: Bilingual | null): Bilingual | null {
  const mr = values.mr.trim();
  const en = values.en.trim();
  if (!mr && !en) return null;
  if (defaults && mr === defaults.mr && en === defaults.en) return null;
  return { mr, en };
}

export const bannerPayload = (v: BannerFormValues, entry: Pick<PageBannerEntry, 'title' | 'subtitle'>): Required<UpdatePageBannerInput> => ({
  title: pair(v.title, entry.title),
  subtitle: pair(v.subtitle, entry.subtitle),
});

/* A 422's field messages ("body.title.mr", "body.subtitle", …) on the form's fields. */
export function serverBannerErrors(details: { field?: string; message: string }[]): FieldErrors<BannerField> {
  const fields: readonly string[] = ['title.mr', 'title.en', 'title', 'subtitle.mr', 'subtitle.en', 'subtitle'];
  const out: FieldErrors<BannerField> = {};
  for (const d of details) {
    const key = (d.field ?? '').replace(/^body\./, '');
    if (fields.includes(key) && !out[key as BannerField]) out[key as BannerField] = d.message;
  }
  return out;
}

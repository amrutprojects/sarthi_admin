import { describe, expect, it } from 'vitest';
import {
  brandingFormContext, brandingFormFrom, brandingFormSchema, brandingPayload, brandingServerErrors, logoFileError, LOGO_RULE,
  logoDimensionError, logoDimensionRule, logoRulesText, type BrandingFormValues,
} from '../validation/branding.validation';
import { contrastRatio, contrastWarnings, formatRatio } from '../validation/contrast';
import { colourKeystroke } from '../components/format';
import { configured, languageOptions, unset } from './fixtures';

const codes = ['en', 'mr'];
const ctxOf = (b = unset()) => brandingFormContext(b, languageOptions.languages);
const messages = (values: BrandingFormValues, ctx = ctxOf()) => {
  const r = brandingFormSchema(ctx).safeParse(values);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('branding form rules (backend validator mirror)', () => {
  const blank = () => brandingFormFrom(unset(), codes);

  it('starts an unset entity empty, with the default language enabled', () => {
    expect(blank()).toEqual({
      display_name: '',
      colours: { primary: '', accent: '' },
      support_email: '',
      support_phone: '',
      support_hours: { en: '', mr: '' },
      languages: ['mr'],
    });
    expect(messages(blank())).toEqual({});
  });

  it('uses the F-LMS-04 messages', () => {
    const v = blank();
    expect(messages({ ...v, display_name: '  ab  ' })).toEqual({ display_name: 'Enter a display name of at least 3 characters.' });
    expect(messages({ ...v, display_name: 'x'.repeat(61) })).toEqual({ display_name: 'Enter a display name of at most 60 characters.' });
    expect(messages({ ...v, display_name: 'Sarthi‮Portal' })).toEqual({ display_name: 'Enter a display name.' });
    /* ZWJ / ZWNJ stay allowed (Devanagari spelling). */
    expect(messages({ ...v, display_name: 'क्‍ष अमृत' })).toEqual({});
    expect(messages({ ...v, colours: { primary: '#12345', accent: 'abc' } })).toEqual({
      'colours.primary': 'Enter a valid colour.',
      'colours.accent': 'Enter a valid colour.',
    });
    expect(messages({ ...v, support_email: 'not-an-email' })).toEqual({ support_email: 'Enter a valid email address.' });
    expect(messages({ ...v, support_phone: '9876543210' })).toEqual({ support_phone: 'Enter a valid phone number.' });
    expect(messages({ ...v, support_phone: '+91 98765-43210' })).toEqual({});
    expect(messages({ ...v, support_hours: { en: 'x'.repeat(121), mr: '' } })).toEqual({ 'support_hours.en': 'Shorten the text.' });
    expect(messages({ ...v, languages: [] })).toEqual({ languages: 'Keep at least the default language.' });
    expect(messages({ ...v, languages: ['en'] })).toEqual({ languages: "Marathi is the entity's default language and cannot be removed." });
  });

  it('always starts the languages with the default language, in platform order', () => {
    const b = configured();
    const stale = { ...b, settings: b.settings.map((s) => (s.key === 'languages' ? { ...s, effectiveValue: ['en'] } : s)) };
    expect(brandingFormFrom(stale, codes).languages).toEqual(['en', 'mr']);
  });

  it('lets an unset support email stay empty, but not a stored one', () => {
    expect(messages(blank())).toEqual({});
    const b = configured();
    expect(messages({ ...brandingFormFrom(b, codes), support_email: '  ' }, ctxOf(b))).toEqual({ support_email: 'Enter a valid email address.' });
  });
});

describe('brandingPayload', () => {
  it('sends only the changed keys, normalised; empty resets to the default (null)', () => {
    const initial = brandingFormFrom(configured(), codes);
    expect(brandingPayload(initial, initial, codes)).toEqual({});
    const payload = brandingPayload(
      {
        ...initial,
        display_name: '  Sarthi   Portal ',
        colours: { primary: '#1f4e79', accent: '' },
        support_phone: '+91 98765-43211',
        support_hours: { en: ' Mon–Fri ', mr: '' },
        languages: ['mr', 'en'],
      },
      initial,
      codes,
    );
    /* Colour case and language order are not changes; the cleared accent is. */
    expect(payload).toEqual({
      display_name: 'Sarthi Portal',
      colours: { primary: '#1F4E79', accent: null },
      support_phone: '+919876543211',
      support_hours: { en: 'Mon–Fri' },
    });
    expect(brandingPayload({ ...initial, display_name: '', support_phone: '', support_hours: { en: '', mr: '' } }, initial, codes)).toEqual({
      display_name: null,
      support_phone: null,
      support_hours: null,
    });
  });

  it('sends the languages in platform order and a new support email lower-cased', () => {
    const initial = brandingFormFrom(unset(), codes);
    expect(brandingPayload({ ...initial, languages: ['mr', 'en'], support_email: ' Help@Amrut.ORG ' }, initial, codes)).toEqual({
      support_email: 'help@amrut.org',
      languages: ['en', 'mr'],
    });
  });
});

describe('server error mapping', () => {
  it('puts body paths and the default-language rule on the form fields', () => {
    const values = brandingFormFrom(unset(), codes);
    const { fields, other } = brandingServerErrors(
      [
        { field: 'body.colours.accent', message: 'Enter a valid colour.' },
        { field: 'languages', message: 'Marathi is the default.' },
        { field: 'body.support_hours.mr', message: 'Shorten the text.' },
        { field: 'params.entityId', message: 'Invalid id' },
      ],
      values,
    );
    expect(fields).toEqual([
      { path: 'colours.accent', message: 'Enter a valid colour.' },
      { path: 'languages', message: 'Marathi is the default.' },
      { path: 'support_hours.mr', message: 'Shorten the text.' },
    ]);
    expect(other).toEqual([{ field: 'params.entityId', message: 'Invalid id' }]);
  });
});

describe('logo and colour helpers', () => {
  const file = (name: string, type: string, size: number) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepts a PNG within 5 MB only', () => {
    expect(logoFileError(file('logo.png', 'image/png', 2000))).toBeUndefined();
    expect(logoFileError(file('logo.jpg', 'image/jpeg', 2000))).toBe(LOGO_RULE);
    expect(logoFileError(file('logo.png', 'image/png', 5 * 1024 * 1024 + 1))).toBe(LOGO_RULE);
    expect(LOGO_RULE).toBe('Upload a PNG image within the size limit (at most 5 MB).');
  });

  it('applies the size limit of the API logoRules', () => {
    const rules = { maxWidthPx: null, maxHeightPx: null, maxFileMb: 2, types: ['image/png'] };
    expect(logoFileError(file('logo.png', 'image/png', 2 * 1024 * 1024), rules)).toBeUndefined();
    expect(logoFileError(file('logo.png', 'image/png', 2 * 1024 * 1024 + 1), rules)).toBe('Upload a PNG image within the size limit (at most 2 MB).');
  });

  it('refuses a logo over the configured dimensions with the server message, and allows one at the limit', () => {
    const both = { maxWidthPx: 200, maxHeightPx: 100 };
    expect(logoDimensionError({ width: 200, height: 100 }, both)).toBeUndefined();
    expect(logoDimensionError({ width: 201, height: 50 }, both)).toBe('Upload a PNG image of at most 200 × 100 pixels; this one is 201 × 50 pixels.');
    expect(logoDimensionError({ width: 150, height: 101 }, both)).toBe('Upload a PNG image of at most 200 × 100 pixels; this one is 150 × 101 pixels.');
    expect(logoDimensionError({ width: 201, height: 9999 }, { maxWidthPx: 200, maxHeightPx: null })).toBe(
      'Upload a PNG image of at most 200 pixels wide; this one is 201 × 9999 pixels.',
    );
    expect(logoDimensionError({ width: 9999, height: 101 }, { maxWidthPx: null, maxHeightPx: 100 })).toBe(
      'Upload a PNG image of at most 100 pixels high; this one is 9999 × 101 pixels.',
    );
    /* Unset = no limit. */
    expect(logoDimensionRule({ maxWidthPx: null, maxHeightPx: null })).toBeNull();
    expect(logoDimensionError({ width: 20_000, height: 20_000 }, { maxWidthPx: null, maxHeightPx: null })).toBeUndefined();
  });

  it('describes the logo limits for the upload hint', () => {
    expect(logoRulesText({ maxWidthPx: 200, maxHeightPx: 100, maxFileMb: 5, types: ['image/png'] })).toBe('Accepted: PNG, at most 5 MB, at most 200 × 100 pixels.');
    expect(logoRulesText({ maxWidthPx: null, maxHeightPx: 64, maxFileMb: 2, types: ['image/png'] })).toBe('Accepted: PNG, at most 2 MB, at most 64 pixels high.');
    expect(logoRulesText({ maxWidthPx: null, maxHeightPx: null, maxFileMb: 5, types: ['image/png'] })).toBe('Accepted: PNG, at most 5 MB, any dimensions.');
  });

  it('computes WCAG contrast and warns below 4.5:1 against white', () => {
    expect(formatRatio(contrastRatio('#000000', '#FFFFFF'))).toBe('21.00:1');
    expect(contrastWarnings('#1F4E79', '#C0392B')).toEqual([]);
    const w = contrastWarnings('#FFD700', '');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/Primary colour #FFD700 has a contrast of 1\.\d\d:1 against white/);
    expect(contrastWarnings('#1F4E79', '#F1C40F')).toEqual([expect.stringMatching(/^Accent colour #F1C40F/)]);
    expect(contrastWarnings('', 'zzz')).toEqual([]);
  });

  it('filters colour keystrokes to #RRGGBB', () => {
    expect(colourKeystroke('1f4e79')).toBe('#1F4E79');
    expect(colourKeystroke('#1f4e79ff')).toBe('#1F4E79');
    expect(colourKeystroke('#')).toBe('#');
    expect(colourKeystroke('')).toBe('');
  });
});

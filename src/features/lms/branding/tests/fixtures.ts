import type { ApiBranding, BrandingLanguageOptions, BrandingSetting } from '../types/branding.types';

/* Test data shaped exactly like the /api/v1/lms/branding/:entityId responses (catalogue of branding.constants.ts). */
export const AT = '2026-10-01T10:00:00.000Z';

export const languageOptions: BrandingLanguageOptions = {
  languages: [{ code: 'en', label: 'English' }, { code: 'mr', label: 'Marathi' }],
  languagesConfirmed: false,
};

const def = (s: Omit<BrandingSetting, 'hasValue' | 'value' | 'effectiveValue' | 'updatedAt' | 'sensitive'>): BrandingSetting => ({
  ...s,
  sensitive: false,
  hasValue: false,
  value: null,
  effectiveValue: null,
  updatedAt: null,
});

/* The catalogue with nothing set for an entity named "Amrut Kalash" whose default language is Marathi. */
const catalogue = (): BrandingSetting[] => [
  def({ key: 'display_name', fieldId: 'F-LMS-04-01', group: 'branding', type: 'text', label: 'Display name', description: 'Name shown in the app and on notifications. 3–60 characters; the entity name while not set.', required: true, fallback: 'entity_name' }),
  def({ key: 'logo_storage_key', fieldId: 'F-LMS-04-02', group: 'branding', type: 'image', label: 'Logo', description: 'Logo for LMS Admin, app and certificate header. PNG image within the size limit; the platform default while not set.', required: false, fallback: 'platform' }),
  def({ key: 'colours', fieldId: 'F-LMS-04-03', group: 'branding', type: 'colour_pair', label: 'Primary and accent colour', description: 'Theme colours as #RRGGBB; the platform default while not set.', required: false, fallback: 'platform' }),
  def({ key: 'support_email', fieldId: 'F-LMS-04-04', group: 'contact', type: 'email', label: 'Support email', description: 'Contact shown to learners. An organisational mailbox, not a personal address.', required: true, fallback: 'none' }),
  def({ key: 'support_phone', fieldId: 'F-LMS-04-05', group: 'contact', type: 'phone', label: 'Support phone', description: 'Helpdesk number shown to learners, in E.164 format (+919876543210).', required: false, fallback: 'none' }),
  def({ key: 'support_hours', fieldId: 'F-LMS-04-06', group: 'contact', type: 'text_per_language', label: 'Support hours text', description: 'When the helpdesk answers, per language; at most 120 characters each.', required: false, fallback: 'none' }),
  def({ key: 'languages', fieldId: 'F-LMS-04-07', group: 'settings', type: 'language_list', label: 'Enabled languages', description: "Languages offered to learners: a subset of the platform languages (OQ-023) that always keeps the entity's default language.", required: true, fallback: 'default_language' }),
];

export const LOGO = { fileName: 'amk-logo.png', mimeType: 'image/png', fileSize: 12_700, sha256: 'abc123', width: 512, height: 128, url: '/api/v1/lms/branding/e1/logo' };

/* Nothing set: the display name falls back to the entity name, languages to [default], support email missing. */
export const unset = (over: Partial<ApiBranding['entity']> = {}): ApiBranding => {
  const entity = { id: 'e1', name: 'Amrut Kalash', code: 'AMK', defaultLanguage: 'mr', isActive: true, ...over };
  return {
    entity,
    settings: catalogue().map((s) =>
      s.key === 'display_name' ? { ...s, effectiveValue: entity.name } : s.key === 'languages' ? { ...s, effectiveValue: [entity.defaultLanguage] } : s,
    ),
    missingRequired: ['support_email'],
    /* The backend defaults: no dimension limit configured. */
    logoRules: { maxWidthPx: null, maxHeightPx: null, maxFileMb: 5, types: ['image/png'] },
  };
};

const withValue = (s: BrandingSetting, value: unknown): BrandingSetting => ({ ...s, hasValue: true, value, effectiveValue: value, updatedAt: AT });

/* Fully configured: every key set, nothing missing. */
export const configured = (over: Partial<ApiBranding['entity']> = {}): ApiBranding => {
  const base = unset(over);
  const values: Record<string, unknown> = {
    display_name: 'Amrut Kalash LMS',
    logo_storage_key: LOGO,
    colours: { primary: '#1F4E79', accent: '#C0392B' },
    support_email: 'help@amrut.org',
    support_phone: '+919876543210',
    support_hours: { en: 'Mon–Sat, 10:00–18:00' },
    languages: ['en', 'mr'],
  };
  return { ...base, settings: base.settings.map((s) => withValue(s, values[s.key])), missingRequired: [] };
};

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};

/* jsdom has no object URLs; the logo preview needs them. */
export const stubObjectUrls = () => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: () => 'blob:logo-preview' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: () => undefined });
};

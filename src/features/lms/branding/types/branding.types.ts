/*
 * Branding and Settings (AMRUT_KALASH_03 L-04 / FR-304, form F-LMS-04, UI-312), as /api/v1/lms/branding/:entityId
 * returns and accepts it. Configuration, not a catalogue: one settings record per LMS entity, view and update only.
 *
 * The keys are the backend's fixed catalogue (branding.constants.ts). The screens render whatever the API lists,
 * using `type` to pick the control, so labels, descriptions, order and the required flag always come from the API.
 */

/* Tabs of UI-312: branding (display name, logo, colours), contact (email, phone, hours), settings (languages). */
export const BRANDING_GROUPS = ['branding', 'contact', 'settings'] as const;
export type BrandingGroup = (typeof BRANDING_GROUPS)[number];

export const BRANDING_GROUP_LABELS: Record<BrandingGroup, string> = {
  branding: 'Branding',
  contact: 'Contact',
  settings: 'Settings',
};

export type BrandingSettingType = 'text' | 'image' | 'colour_pair' | 'email' | 'phone' | 'text_per_language' | 'language_list';

export const BRANDING_KEYS = [
  'display_name',
  'logo_storage_key',
  'colours',
  'support_email',
  'support_phone',
  'support_hours',
  'languages',
] as const;
export type BrandingKey = (typeof BRANDING_KEYS)[number];

/*
 * What a learner client uses while a key has no value: the entity's name / [its default language], the clients'
 * built-in platform default, or nothing at all.
 */
export type BrandingFallback = 'entity_name' | 'default_language' | 'platform' | 'none';

/* F-LMS-04-03: each colour #RRGGBB (upper case), or null for the platform default. */
export interface BrandingColours {
  primary: string | null;
  accent: string | null;
}

/* F-LMS-04-06: text per platform language code. */
export type SupportHours = Partial<Record<string, string>>;

/* The logo as the API shows it. url is the authenticated GET that streams the file. */
export interface BrandingLogo {
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  width: number;
  height: number;
  url: string;
}

/* One catalogue key with its value for the entity. */
export interface BrandingSetting {
  key: BrandingKey;
  fieldId: string;
  group: BrandingGroup;
  type: BrandingSettingType;
  label: string;
  description: string;
  required: boolean;
  fallback: BrandingFallback;
  /* Write-only key: its value is never returned (hasValue only). */
  sensitive: boolean;
  /* A value is stored for the key. */
  hasValue: boolean;
  /* The stored value; null when not set (always null for a sensitive key). */
  value: unknown;
  /* What the clients use: the value, else the fallback; null = platform default or nothing. */
  effectiveValue: unknown;
  updatedAt: string | null;
}

export interface BrandingEntity {
  id: string;
  name: string;
  code: string;
  defaultLanguage: string;
  isActive: boolean;
}

/* GET / PUT / PATCH /lms/branding/:entityId, PUT / DELETE /lms/branding/:entityId/logo. */
export interface ApiBranding {
  entity: BrandingEntity;
  settings: BrandingSetting[];
  /* Required keys with no value and no fallback (support_email until it is set), whatever the search. */
  missingRequired: BrandingKey[];
  /* F-LMS-04-02: the logo limits in force on the server. Absent from an older API: DEFAULT_LOGO_RULES applies. */
  logoRules?: LogoRules;
}

/*
 * F-LMS-04-02 "size and dimension limits from configuration": the backend's LMS_LOGO_MAX_WIDTH_PX /
 * LMS_LOGO_MAX_HEIGHT_PX (null = no limit on that side) and DOCUMENT_MAX_FILE_MB.
 */
export interface LogoRules {
  maxWidthPx: number | null;
  maxHeightPx: number | null;
  maxFileMb: number;
  types: string[];
}

/* GET /lms/branding/:entityId query: L-04 "Search setting key" (key or label) and the tab. */
export interface BrandingQuery {
  search?: string;
  group?: BrandingGroup;
}

/* PATCH body. undefined = not sent (left alone); null = reset to the default. colours merges primary / accent. */
export interface UpdateBrandingInput {
  display_name?: string | null;
  colours?: { primary?: string | null; accent?: string | null } | null;
  support_email?: string;
  support_phone?: string | null;
  support_hours?: SupportHours | null;
  languages?: string[] | null;
}

/* A platform language (To Be Confirmed, OQ-023), from GET /lms/entities/form-options. */
export interface PlatformLanguage {
  code: string;
  label: string;
}

export interface BrandingLanguageOptions {
  languages: PlatformLanguage[];
  /* false while OQ-023 is open: the platform language list is To Be Confirmed. */
  languagesConfirmed: boolean;
}

/* An entity offered on the Branding listing. isActive is false only on the full Entity Master list. */
export interface BrandingEntityChoice {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

/*
 * F-LMS-04 limits (branding.constants.ts / env DOCUMENT_MAX_FILE_MB). The server re-checks every one of them.
 */
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 60;
export const SUPPORT_HOURS_MAX = 120;
export const SUPPORT_EMAIL_MAX = 254;
export const LOGO_MIME_TYPE = 'image/png';
export const LOGO_ACCEPT = '.png,image/png';
/* Mirrors the backend default DOCUMENT_MAX_FILE_MB (the logo reuses the Document Master's storage). */
export const LOGO_MAX_FILE_MB = 5;
/* Used only while the API sends no logoRules: the backend defaults (no dimension limit). */
export const DEFAULT_LOGO_RULES: LogoRules = { maxWidthPx: null, maxHeightPx: null, maxFileMb: LOGO_MAX_FILE_MB, types: [LOGO_MIME_TYPE] };

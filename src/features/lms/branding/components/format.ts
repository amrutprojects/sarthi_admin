import type { BrandingLogo, PlatformLanguage } from '../types/branding.types';

/* "12.4 KB" / "1.2 MB". */
export const fileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;

/* "logo.png · 512 × 128 px · 12.4 KB". */
export const logoMeta = (l: BrandingLogo): string => `${l.fileName} · ${l.width} × ${l.height} px · ${fileSize(l.fileSize)}`;

/* "Marathi (mr)", or the bare code while the list is loading or when the code is no longer a platform language. */
export const languageLabel = (code: string, languages: PlatformLanguage[] | undefined): string => {
  const found = languages?.find((l) => l.code === code);
  return found ? `${found.label} (${found.code})` : code;
};

/*
 * Keystroke filter for a #RRGGBB box: hex digits only, upper case, one leading "#" added for the user,
 * at most 7 characters. An emptied box stays empty (= platform default).
 */
export const colourKeystroke = (raw: string): string => {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, '');
  return hex || raw.includes('#') ? `#${hex}`.slice(0, 7) : '';
};

/*
 * Colour contrast check for the theme colours (F-LMS-04-03). The backend stores any valid #RRGGBB and leaves the
 * contrast check to the client; it is a warning only and never blocks a save.
 *
 * Relative luminance and contrast ratio as defined by WCAG 2.1 (1.4.3: text needs 4.5:1 at AA). Each colour is
 * checked against white, which covers both uses: white text on the colour, and the colour as text on a white page.
 */
export const HEX_COLOUR_RE = /^#[0-9A-Fa-f]{6}$/;

export const isHexColour = (v: string): boolean => HEX_COLOUR_RE.test(v.trim());

/* WCAG AA minimum for normal-size text. */
export const TEXT_CONTRAST_MIN = 4.5;

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const n = parseInt(hex.trim().slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* "4.47:1" — rounded down, so a value just under a threshold never prints as the threshold itself. */
export const formatRatio = (r: number): string => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;

const WHITE = '#FFFFFF';

/* The contrast warnings for the primary / accent colours; blank or invalid colours are skipped. */
export function contrastWarnings(primary: string, accent: string): string[] {
  const out: string[] = [];
  const pairs: [string, string][] = [
    ['Primary', primary.trim()],
    ['Accent', accent.trim()],
  ];
  for (const [label, hex] of pairs) {
    if (!isHexColour(hex)) continue;
    const r = contrastRatio(hex, WHITE);
    if (r < TEXT_CONTRAST_MIN) {
      out.push(
        `${label} colour ${hex.toUpperCase()} has a contrast of ${formatRatio(r)} against white (WCAG AA needs ${TEXT_CONTRAST_MIN}:1 for text): ` +
          'white text on it, or it used as text on a white page, may be hard to read.',
      );
    }
  }
  return out;
}

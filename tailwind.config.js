/*
 * Tailwind runs alongside the existing design system (src/styles/styles.css), see ADR-0008:
 * - prefix "tw-" so utilities never collide with existing class names (.grid, .card, .f, …);
 * - preflight off so the base reset does not restyle existing screens;
 * - colours, radii and fonts map to the CSS variables of the existing theme, so new components match it.
 * @type {import('tailwindcss').Config}
 */
export default {
  prefix: 'tw-',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-050)',
          100: 'var(--brand-100)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
        saffron: { DEFAULT: 'var(--saffron)', 100: 'var(--saffron-100)' },
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        ink: { DEFAULT: 'var(--text)', 2: 'var(--text-2)', muted: 'var(--muted)' },
        ok: { DEFAULT: 'var(--green)', bg: 'var(--green-bg)' },
        warn: { DEFAULT: 'var(--amber)', bg: 'var(--amber-bg)' },
        danger: { DEFAULT: 'var(--red)', bg: 'var(--red-bg)' },
      },
      borderRadius: { sm: 'var(--r-sm)', DEFAULT: 'var(--r)', lg: 'var(--r-lg)', xl: 'var(--r-xl)' },
      boxShadow: { 1: 'var(--sh-1)', 2: 'var(--sh-2)', 3: 'var(--sh-3)' },
      fontFamily: { sans: 'var(--font)', serif: 'var(--serif)', mono: 'var(--mono)' },
    },
  },
  plugins: [],
};

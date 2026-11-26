import MasterField, { fieldAria } from './MasterField';

interface BilingualFieldProps {
  /* Base id; the two inputs get -mr and -en suffixes. */
  id: string;
  label: string;
  value: { mr: string; en: string };
  onChange: (next: { mr: string; en: string }) => void;
  onBlur?: (half: 'mr' | 'en') => void;
  errorMr?: string;
  errorEn?: string;
  hint?: string;
  maxLength?: number;
  /* Address-length content reads better in a textarea. */
  multiline?: boolean;
  required?: boolean;
  /* Both inputs at once, e.g. while a "not yet available" box is ticked. */
  disabled?: boolean;
  placeholder?: string;
}

/*
 * One piece of managed prose, in both languages.
 *
 * The public site is bilingual and defaults to MARATHI, so a field edited in only one language
 * leaves half the visitors looking at a blank line. Showing the two inputs together — Marathi
 * first, as on the SARTHI portal — makes the pair obvious instead of something to remember, and both
 * halves are validated as required.
 */
export default function BilingualField({
  id, label, value, onChange, onBlur, errorMr, errorEn, hint, maxLength, multiline, required = true, disabled, placeholder,
}: BilingualFieldProps) {
  const control = (half: 'mr' | 'en', fieldId: string, error?: string) => {
    const common = {
      className: 'inp',
      ...fieldAria(fieldId, error),
      value: value[half],
      maxLength,
      disabled,
      placeholder,
      onChange: (e: { target: { value: string } }) => onChange({ ...value, [half]: e.target.value }),
      onBlur: () => onBlur?.(half),
      /* Marathi is typed with an Indic keyboard; the browser's own spellcheck only gets in the way. */
      spellCheck: half === 'en',
      lang: half === 'mr' ? 'mr' : 'en',
    };
    return multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" autoComplete="off" />;
  };

  return (
    <div className="grid g2">
      <MasterField id={`${id}-mr`} label={`${label} (Marathi)`} required={required} error={errorMr} hint={hint}>
        {control('mr', `${id}-mr`, errorMr)}
      </MasterField>
      <MasterField id={`${id}-en`} label={`${label} (English)`} required={required} error={errorEn}>
        {control('en', `${id}-en`, errorEn)}
      </MasterField>
    </div>
  );
}

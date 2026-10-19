import type { ReactNode } from 'react';

/*
 * One labelled form field with a required marker, an optional hint and an inline error message.
 *
 * Markup is the panel-wide .fld / .inp / .hint combination, so no new styling is introduced: the error
 * line reuses .hint and only overrides its colour.
 */
interface MasterFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export default function MasterField({ id, label, required, hint, error, children }: MasterFieldProps) {
  return (
    <div className="fld">
      <label htmlFor={id}>
        {label}
        {required ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={`${id}-error`} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}

/* Props every control in a MasterField needs so screen readers tie the error to the input. */
export const fieldAria = (id: string, error?: string) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
});

import type { ReactNode } from 'react';
import type { PlatformLanguage } from '../types/branding.types';

interface LanguageChecklistProps {
  id: string;
  label: string;
  languages: PlatformLanguage[];
  value: string[];
  onChange: (codes: string[]) => void;
  onBlur?: () => void;
  /* The entity's default language: always ticked and locked (F-LMS-04-07). */
  defaultLanguage: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

/*
 * Enabled languages (F-LMS-04-07): a subset of the platform languages that always keeps the entity's default
 * language. That one is shown ticked and cannot be unticked. A saved code that is no longer a platform language
 * stays visible so it can be removed.
 */
export default function LanguageChecklist({
  id, label, languages, value, onChange, onBlur, defaultLanguage, required, error, hint, disabled,
}: LanguageChecklistProps) {
  const offered = [
    ...languages,
    ...value.filter((c) => !languages.some((l) => l.code === c)).map((c) => ({ code: c, label: `${c} (not in the platform list)`, extra: true })),
  ];
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  /* Every change keeps the default language in the selection, so it can never be sent without it. */
  const toggle = (code: string) => {
    if (disabled || code === defaultLanguage) return;
    const next = value.includes(code) ? value.filter((c) => c !== code) : [...value, code];
    onChange(next.includes(defaultLanguage) ? next : [defaultLanguage, ...next]);
  };

  return (
    <div className="fld">
      <label id={labelId}>
        {label}
        {required ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
      </label>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', background: 'var(--surface)' }}
      >
        {offered.map((l) => {
          const isDefault = l.code === defaultLanguage;
          const boxId = `${id}-${l.code}`;
          return (
            <label key={l.code} htmlFor={boxId} className="f ac gp8" style={{ padding: '3px 0', cursor: isDefault || disabled ? 'default' : 'pointer' }}>
              <input
                id={boxId}
                type="checkbox"
                checked={isDefault || value.includes(l.code)}
                disabled={disabled || isDefault}
                onChange={() => toggle(l.code)}
                onBlur={onBlur}
              />
              <span className="fs13">
                {'extra' in l ? l.label : `${l.label} (${l.code})`}
                {isDefault ? <span className="muted fs12"> · default language, always enabled</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={errorId} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}

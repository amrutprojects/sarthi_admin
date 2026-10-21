import type { ReactNode } from 'react';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { isHexColour } from '../validation/contrast';
import { colourKeystroke } from './format';

interface ColourFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

/*
 * One #RRGGBB colour (F-LMS-04-03): a colour picker and a text box kept in step, plus Clear (empty = the
 * platform default). The text box is the labelled control, so typing and pasting a hex value both work.
 */
export default function ColourField({ id, label, value, onChange, onBlur, error, hint, disabled }: ColourFieldProps) {
  const valid = isHexColour(value);
  return (
    <MasterField id={id} label={label} error={error} hint={hint}>
      <div className="f ac gp8">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value.trim().toLowerCase() : '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onBlur={onBlur}
          style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', flex: 'none' }}
        />
        <input
          className="inp mono grow"
          {...fieldAria(id, error)}
          value={value}
          maxLength={7}
          placeholder="Platform default"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onChange={(e) => onChange(colourKeystroke(e.target.value))}
          onBlur={onBlur}
        />
        <button type="button" className="btn xs" disabled={disabled || !value} onClick={() => onChange('')} aria-label={`Clear ${label.toLowerCase()}`}>
          Clear
        </button>
      </div>
    </MasterField>
  );
}

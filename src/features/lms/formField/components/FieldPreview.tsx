import type { FormFieldTranslations } from '../types/formField.types';
import { dataTypeLabel, sensitivityLabel, stageLabel } from '../types/formField.types';
import { helpIn, labelIn, ruleSummary } from './fieldFormat';

/* What a preview needs of a field: a row of the effective configuration, a configuration row, or the form's values. */
export interface PreviewField {
  fieldCode: string;
  label: string;
  helpText: string | null;
  translations?: FormFieldTranslations;
  dataType: string;
  options: string[] | null;
  rules: Record<string, unknown>;
  isRequired: boolean;
  requiredStage: string | null;
  isSystemLocked?: boolean;
  isCustom?: boolean;
  sensitivity: string;
  isExportable: boolean;
}

interface FieldPreviewProps {
  field: PreviewField;
  /* Platform language code, '' = the default label and help text. */
  lang?: string;
  fileConstraints?: { extensions: readonly string[]; maxBytes: number };
  /* Keeps ids unique when the same field is previewed twice on a page. */
  idPrefix?: string;
}

/* Types whose control the application builds itself (F-LMS-TRN Table 39); the preview names them. */
const COMPOSITE = ['TEXT_ARRAY', 'REFERENCE', 'REFERENCE_ARRAY', 'REPEATING_GROUP', 'ENUM_ARRAY', 'GRID', 'SIGN_OFF'];

/*
 * One field as the configured form shows it: label (in the chosen language), compulsory marker, a disabled
 * control of its type, the help text and the rules the server enforces. Nothing here can be filled in.
 */
export default function FieldPreview({ field, lang = '', fileConstraints, idPrefix = 'pv' }: FieldPreviewProps) {
  const id = `${idPrefix}-${field.fieldCode || 'field'}`;
  const label = labelIn(field, lang) || 'Untitled field';
  const help = helpIn(field, lang);
  const rules = ruleSummary(field.dataType, field.rules, fileConstraints);
  const options = field.options ?? [];

  let control;
  switch (field.dataType) {
    case 'LONG_TEXT':
      control = <textarea id={id} className="inp" rows={2} disabled />;
      break;
    case 'NUMBER':
      control = <input id={id} className="inp" type="number" disabled />;
      break;
    case 'DATE':
      control = <input id={id} className="inp" type="date" disabled />;
      break;
    case 'EMAIL':
      control = <input id={id} className="inp" type="email" disabled />;
      break;
    case 'PHONE':
      control = <input id={id} className="inp" type="tel" disabled />;
      break;
    case 'FILE':
    case 'IMAGE':
      control = <input id={id} className="inp" type="file" disabled />;
      break;
    case 'YES_NO':
      control = (
        <div id={id} role="radiogroup" aria-label={label} className="f ac gp14">
          <label className="f ac gp4 fs13"><input type="radio" disabled /> Yes</label>
          <label className="f ac gp4 fs13"><input type="radio" disabled /> No</label>
        </div>
      );
      break;
    case 'SINGLE_CHOICE':
      control = (
        <select id={id} className="inp" disabled>
          <option>Select…</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case 'MULTIPLE_CHOICE':
      control = (
        <div id={id} role="group" aria-label={label} className="f ac wrap" style={{ gap: '4px 14px' }}>
          {options.length ? (
            options.map((o) => (
              <label key={o} className="f ac gp4 fs13"><input type="checkbox" disabled /> {o}</label>
            ))
          ) : (
            <span className="muted fs12">No options yet.</span>
          )}
        </div>
      );
      break;
    default:
      control = COMPOSITE.includes(field.dataType) ? (
        <div id={id} className="inp muted fs12" aria-disabled="true" style={{ display: 'flex', alignItems: 'center' }}>
          {dataTypeLabel(field.dataType)} — built by the application
        </div>
      ) : (
        <input id={id} className="inp" disabled />
      );
  }

  return (
    <div className="fld">
      <label htmlFor={id}>
        {label}
        {field.isRequired ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {help || rules.length ? (
        <div className="hint">
          {help}
          {help && rules.length ? ' · ' : ''}
          {rules.join(' · ')}
        </div>
      ) : null}
      <div className="f ac gp4 wrap" style={{ marginTop: 4 }}>
        <span className="tag">{dataTypeLabel(field.dataType)}</span>
        {field.isRequired && field.requiredStage ? <span className="tag">Compulsory · {stageLabel(field.requiredStage)}</span> : null}
        {field.isSystemLocked ? <span className="tag">System locked</span> : null}
        {field.isCustom ? <span className="tag">Custom</span> : null}
        {field.sensitivity !== 'INTERNAL' ? <span className="tag">{sensitivityLabel(field.sensitivity)}</span> : null}
        {field.isExportable ? null : <span className="tag">Not exported</span>}
      </div>
    </div>
  );
}

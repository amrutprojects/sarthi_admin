import type { UseFormReturn } from 'react-hook-form';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { RULE_KEYS_BY_TYPE, RULE_LABELS, RULE_LENGTH_MAX, RULE_PATTERN_MAX, dataTypeLabel, type RuleKey } from '../types/formField.types';
import type { FormFieldFormValues } from '../validation/formField.validation';

interface RuleEditorProps {
  form: UseFormReturn<FormFieldFormValues>;
  dataType: string;
  fileConstraints?: { extensions: readonly string[]; maxBytes: number };
}

const HINTS: Record<RuleKey, string> = {
  minLength: `Whole number, 0 to ${RULE_LENGTH_MAX}. Empty = no minimum.`,
  maxLength: `Whole number, 1 to ${RULE_LENGTH_MAX}. Empty = no maximum.`,
  pattern: `Regular expression the whole value must match, up to ${RULE_PATTERN_MAX} characters. For example ^[A-Z]{2}[0-9]{4}$.`,
  min: 'Lowest value accepted. Empty = no minimum.',
  max: 'Highest value accepted. Empty = no maximum.',
  integer: 'Refuse decimals.',
  notInFuture: 'Refuse dates after today.',
  minDate: 'Earliest date accepted. Empty = no lower bound.',
  maxDate: 'Latest date accepted. Empty = no upper bound.',
  minSelected: 'At least this many options must be ticked. At most the number of options.',
  maxSelected: 'At most this many options can be ticked (1 or more).',
};

const PAIR: Partial<Record<RuleKey, RuleKey>> = { maxLength: 'minLength', max: 'min', maxDate: 'minDate', maxSelected: 'minSelected' };

const NO_RULES: Record<string, string> = {
  YES_NO: 'A Yes / No field has no further rules.',
  SINGLE_CHOICE: 'The option list is the rule: the value must be one of the options.',
};

/*
 * The validation rules of a custom field, for its data type (form-field.rules.ts): length and pattern for
 * text, length for long text, minimum / maximum for numbers, bounds for dates, a selection count for multiple
 * choice. Every rule is optional; none is assumed. The file rule is fixed by the specification.
 */
export default function RuleEditor({ form, dataType, fileConstraints }: RuleEditorProps) {
  const { register, trigger, getFieldState, formState: { errors, isSubmitted } } = form;
  const keys = RULE_KEYS_BY_TYPE[dataType] ?? [];
  const rootError = errors.rules?.message ?? errors.rules?.root?.message;
  /* "Minimum not above maximum" spans two inputs: a change to the maximum re-checks the minimum once it was touched. */
  const field = (k: RuleKey) =>
    register(`rules.${k}`, {
      onChange: () => {
        const lo = PAIR[k];
        if (lo && (isSubmitted || getFieldState(`rules.${lo}`).isTouched)) void trigger(`rules.${lo}`);
      },
    });

  if (!keys.length) {
    const fixed =
      dataType === 'FILE' && fileConstraints
        ? `Fixed by the specification: ${fileConstraints.extensions.map((e) => e.toUpperCase()).join(', ')} up to ${Math.round(fileConstraints.maxBytes / (1024 * 1024))} MB.`
        : NO_RULES[dataType] ?? `A ${dataTypeLabel(dataType)} field has no configurable rules.`;
    return (
      <>
        <p className="muted fs12" style={{ margin: '0 0 10px' }}>{fixed}</p>
        {rootError ? <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} role="alert">{rootError}</div> : null}
      </>
    );
  }

  return (
    <>
      <div className="grid g3">
        {keys.map((k) => {
          const id = `ff-rule-${k}`;
          const error = errors.rules?.[k]?.message;
          if (k === 'integer' || k === 'notInFuture') {
            return (
              <MasterField key={k} id={id} label={RULE_LABELS[k]} hint={HINTS[k]}>
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input type="checkbox" id={id} {...field(k)} />
                  {k === 'integer' ? 'Whole numbers only' : 'Not after today'}
                </label>
              </MasterField>
            );
          }
          if (k === 'minDate' || k === 'maxDate') {
            return (
              <MasterField key={k} id={id} label={RULE_LABELS[k]} error={error} hint={HINTS[k]}>
                <input type="date" className="inp" {...fieldAria(id, error)} {...field(k)} />
              </MasterField>
            );
          }
          if (k === 'pattern') {
            return (
              <MasterField key={k} id={id} label={RULE_LABELS[k]} error={error} hint={HINTS[k]}>
                <input className="inp mono" {...fieldAria(id, error)} maxLength={RULE_PATTERN_MAX} autoComplete="off" spellCheck={false} {...field('pattern')} />
              </MasterField>
            );
          }
          const whole = k !== 'min' && k !== 'max';
          return (
            <MasterField key={k} id={id} label={RULE_LABELS[k]} error={error} hint={HINTS[k]}>
              <input
                type="number"
                className="inp"
                {...fieldAria(id, error)}
                inputMode={whole ? 'numeric' : 'decimal'}
                step={whole ? 1 : 'any'}
                min={whole ? (k === 'maxLength' || k === 'maxSelected' ? 1 : 0) : undefined}
                max={whole ? RULE_LENGTH_MAX : undefined}
                {...field(k)}
              />
            </MasterField>
          );
        })}
      </div>
      {rootError ? <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} role="alert">{rootError}</div> : null}
    </>
  );
}

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import Icon from '../../../../components/ui/Icon';
import { OPTIONS_MAX, OPTION_MAX_LENGTH } from '../types/formField.types';
import type { FormFieldFormValues } from '../validation/formField.validation';

interface OptionsEditorProps {
  form: UseFormReturn<FormFieldFormValues>;
}

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

/*
 * The option list of a single- or multiple-choice field: one row per option, in the order the form shows
 * them; each option once (case-insensitive), up to 80 characters, at most 100 options.
 */
export default function OptionsEditor({ form }: OptionsEditorProps) {
  const { control, register, formState: { errors, isSubmitted }, trigger } = form;
  const options = useFieldArray({ control, name: 'options' });
  const rootError = errors.options?.message ?? errors.options?.root?.message;
  const recheck = () => {
    if (isSubmitted) void trigger(['options', 'rules']);
  };

  return (
    <div className="fld">
      <label id="ff-options-label">
        Options<span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>
      </label>
      <div className="tbl-wrap">
        <table className="tbl" aria-labelledby="ff-options-label">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Sr. No.</th>
              <th>Option</th>
              <th style={{ width: 130 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {options.fields.map((f, i) => {
              const error = errors.options?.[i]?.value?.message;
              return (
                <tr key={f.id} className="norow">
                  <td className="muted fs12">{i + 1}</td>
                  <td>
                    <input
                      className="inp sm"
                      aria-label={`Option ${i + 1}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `ff-option-${i}-error` : undefined}
                      maxLength={OPTION_MAX_LENGTH}
                      autoComplete="off"
                      {...register(`options.${i}.value`)}
                    />
                    {errorLine(`ff-option-${i}-error`, error)}
                  </td>
                  <td>
                    <div className="f gp4">
                      <button type="button" className="btn xs" aria-label={`Move option ${i + 1} up`} title="Move up" disabled={i === 0} onClick={() => options.move(i, i - 1)}>↑</button>
                      <button
                        type="button"
                        className="btn xs"
                        aria-label={`Move option ${i + 1} down`}
                        title="Move down"
                        disabled={i === options.fields.length - 1}
                        onClick={() => options.move(i, i + 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn xs"
                        aria-label={`Remove option ${i + 1}`}
                        title="Remove"
                        style={{ color: 'var(--red)' }}
                        onClick={() => {
                          options.remove(i);
                          recheck();
                        }}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!options.fields.length ? (
              <tr className="norow">
                <td colSpan={3} className="muted fs12">No options yet. A choice field needs at least one.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="f ac gp8 wrap mt8">
        <button
          type="button"
          className="btn sm"
          disabled={options.fields.length >= OPTIONS_MAX}
          onClick={() => {
            options.append({ value: '' }, { focusName: `options.${options.fields.length}.value` });
            recheck();
          }}
        >
          <Icon name="plus" />Add option
        </button>
        <span className="muted fs12" aria-live="polite">
          {options.fields.length} of at most {OPTIONS_MAX} options
        </span>
      </div>
      {errorLine('ff-options-error', rootError) ?? (
        <div className="hint">Each option once (capitals ignored), up to {OPTION_MAX_LENGTH} characters, in the order the form lists them.</div>
      )}
    </div>
  );
}

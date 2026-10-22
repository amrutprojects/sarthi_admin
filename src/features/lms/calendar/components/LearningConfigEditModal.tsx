import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KvList, ModeTag } from '../../../../components/ui';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { toastError, toastOk } from '../../../cms/shared';
import { calendarService } from '../services/calendarService';
import { LEARNING_CONFIG_MODE_LABELS, type ApiLearningConfigValue } from '../types/learningConfig.types';
import {
  configFormFrom, configFormSchema, configValueOf, formatConfigValue, optionText, sameConfigValue, unitText, type ConfigFormValues,
} from '../validation/learningConfig.validation';
import ConfigSourceBadge from './ConfigSourceBadge';

interface LearningConfigEditModalProps {
  row: ApiLearningConfigValue;
  entityId: string;
  entityName?: string;
  onClose: () => void;
  /* Called after a successful save (the page reloads the configuration and closes the dialog). */
  onSaved: () => void | Promise<void>;
}

const FORM_ID = 'lc-config-form';

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

/*
 * Edits one learning-configuration value (F-LMS-05-07): a typed editor for the key's type, the delivery mode
 * it applies to (mode-specific keys), and the mandatory reason recorded in the audit trail with the change.
 */
export default function LearningConfigEditModal({ row, entityId, entityName, onClose, onSaved }: LearningConfigEditModalProps) {
  const schema = useMemo(() => configFormSchema(row), [row]);
  const {
    control, register, handleSubmit, watch, setError,
    formState: { errors },
  } = useForm<ConfigFormValues>({ resolver: zodResolver(schema), defaultValues: configFormFrom(row), mode: 'onTouched' });
  const [busy, setBusy] = useState(false);
  const clear = watch('clear');
  const scope = watch('scope');

  const submit = handleSubmit(async (v) => {
    if (busy) return;
    const value = configValueOf(row, v);
    const mode = row.mode && v.scope === 'mode' ? row.mode : undefined;
    /* The server writes nothing for an unchanged value; say so instead of a silent "saved". */
    if ((row.mode === null || mode) && sameConfigValue(value, row.value)) {
      setError('root.value', { type: 'unchanged', message: 'The value is unchanged. Change it, or cancel.' });
      return;
    }
    setBusy(true);
    try {
      await calendarService.updateLearningConfig(row.key, { entityId, ...(mode ? { mode } : {}), value, reason: v.reason.trim() });
      toastOk(`${row.label} updated`);
      await onSaved();
    } catch (err) {
      /* 400 "Enter a value within the allowed range" (field value), mode on a key without modes, reason. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        let shown = false;
        for (const d of err.details) {
          const f = (d.field ?? '').replace(/^(body|params|query)\./, '');
          if (f === 'reason') setError('reason', { type: 'server', message: d.message });
          else if (f === 'mode') setError('scope', { type: 'server', message: d.message });
          else if (f === 'value' || f.startsWith('value.')) setError('root.value', { type: 'server', message: d.message });
          else continue;
          shown = true;
        }
        if (shown) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  });

  const valueError =
    errors.num?.message ?? errors.choice?.message ?? errors.list?.message ?? errors.text?.message ?? errors.clear?.message ?? errors.root?.value?.message;
  const unit = row.unit ? unitText(row.unit, 2).trim() : '';

  let editor: ReactNode;
  switch (row.type) {
    case 'integer':
    case 'duration':
    case 'percentage':
      editor = (
        <MasterField id="lc-cfg-num" label={`Value${unit ? ` (${unit})` : ''}`} required error={valueError} hint={row.type === 'percentage' ? 'A percentage from 0 to 100.' : `A whole number, at least ${row.min ?? 0}.`}>
          <input
            className="inp"
            {...fieldAria('lc-cfg-num', valueError)}
            inputMode={row.type === 'percentage' ? 'decimal' : 'numeric'}
            autoComplete="off"
            disabled={clear}
            {...register('num')}
          />
        </MasterField>
      );
      break;
    case 'range':
      editor = (
        <div className="grid g2">
          <MasterField id="lc-cfg-min" label={`Minimum${unit ? ` (${unit})` : ''}`} required error={errors.min?.message}>
            <input className="inp" {...fieldAria('lc-cfg-min', errors.min?.message)} inputMode="numeric" autoComplete="off" disabled={clear} {...register('min')} />
          </MasterField>
          <MasterField id="lc-cfg-max" label={`Maximum${unit ? ` (${unit})` : ''}`} required error={errors.max?.message ?? errors.root?.value?.message}>
            <input className="inp" {...fieldAria('lc-cfg-max', errors.max?.message)} inputMode="numeric" autoComplete="off" disabled={clear} {...register('max')} />
          </MasterField>
        </div>
      );
      break;
    case 'enum':
      editor = (
        <MasterField id="lc-cfg-choice" label="Value" required error={valueError}>
          <select className="inp" {...fieldAria('lc-cfg-choice', valueError)} disabled={clear} {...register('choice')}>
            <option value="">Select a value</option>
            {(row.options ?? []).map((o) => (
              <option key={o} value={o}>{optionText(o)}</option>
            ))}
          </select>
        </MasterField>
      );
      break;
    case 'enum-list':
      editor = (
        <div className="fld">
          <label id="lc-cfg-list-label">
            Values<span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>
          </label>
          <Controller
            control={control}
            name="list"
            render={({ field }) => (
              <div role="group" aria-labelledby="lc-cfg-list-label" className="f ac wrap" style={{ gap: '6px 14px' }}>
                {(row.options ?? []).map((o) => (
                  <label key={o} htmlFor={`lc-cfg-list-${o}`} className="f ac gp4" style={{ cursor: 'pointer' }}>
                    <input
                      id={`lc-cfg-list-${o}`}
                      type="checkbox"
                      disabled={clear}
                      checked={field.value.includes(o)}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.checked ? [...field.value, o] : field.value.filter((x) => x !== o))}
                    />
                    <span className="fs13">{optionText(o)}</span>
                  </label>
                ))}
              </div>
            )}
          />
          {errorLine('lc-cfg-list-error', valueError) ?? <div className="hint">Choose one or more.</div>}
        </div>
      );
      break;
    case 'labels':
      editor = (
        <div className="fld">
          <label id="lc-cfg-labels-label">
            Labels<span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>
          </label>
          <div className="grid g2">
            {Array.from({ length: row.length ?? 0 }, (_, i) => (
              <div key={i}>
                <input
                  className="inp"
                  aria-label={`Label ${i + 1}`}
                  aria-invalid={errors.labels?.[i] ? true : undefined}
                  maxLength={60}
                  autoComplete="off"
                  disabled={clear}
                  {...register(`labels.${i}`)}
                />
                {errorLine(`lc-cfg-label-${i}-error`, errors.labels?.[i]?.message)}
              </div>
            ))}
          </div>
          {errorLine('lc-cfg-labels-error', valueError) ?? <div className="hint">{row.length} labels of 1 to 60 characters, in order 1 to {row.length}.</div>}
        </div>
      );
      break;
    case 'text':
      editor = (
        <MasterField id="lc-cfg-text" label="Value" required error={valueError} hint="1 to 500 characters.">
          <textarea className="inp" rows={3} maxLength={500} {...fieldAria('lc-cfg-text', valueError)} disabled={clear} {...register('text')} />
        </MasterField>
      );
      break;
  }

  return (
    <Modal
      title={`Edit ${row.label}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save value'}
          </button>
        </>
      }
    >
      <div className="mb14">
        <KvList
          pairs={[
            ['Entity', entityName ?? '—'],
            ['Key', <span className="mono fs12">{row.key}</span>],
            ['Delivery mode', row.mode ? <ModeTag mode={row.mode} /> : 'Not mode-specific'],
            [
              'Current value',
              <span>
                {formatConfigValue(row, row.value)} <ConfigSourceBadge row={row} />
              </span>,
            ],
            ...(row.kind === 'SYLLABUS' ? ([['Syllabus value', formatConfigValue(row, row.syllabusValue)]] as [string, ReactNode][]) : []),
            ['Source', row.sourceNote ?? '—'],
            ['Open questions', row.openQuestions.length ? row.openQuestions.join(', ') : '—'],
          ]}
        />
      </div>

      <form id={FORM_ID} onSubmit={submit} noValidate>
        {row.mode ? (
          <div className="fld">
            <label id="lc-cfg-scope-label">Apply to</label>
            <div role="radiogroup" aria-labelledby="lc-cfg-scope-label" className="f ac wrap" style={{ gap: '6px 14px' }}>
              <label htmlFor="lc-cfg-scope-mode" className="f ac gp4" style={{ cursor: 'pointer' }}>
                <input id="lc-cfg-scope-mode" type="radio" value="mode" {...register('scope')} />
                <span className="fs13">{LEARNING_CONFIG_MODE_LABELS[row.mode]} only</span>
              </label>
              <label htmlFor="lc-cfg-scope-all" className="f ac gp4" style={{ cursor: 'pointer' }}>
                <input id="lc-cfg-scope-all" type="radio" value="all" {...register('scope')} />
                <span className="fs13">Both modes alike (Offline and Online)</span>
              </label>
            </div>
            {errorLine('lc-cfg-scope-error', errors.scope?.message) ?? (
              <div className="hint">
                {scope === 'all'
                  ? 'Sets the same value for Offline and Online. Which rules differ by mode is still open (OQ-042).'
                  : `Sets the ${LEARNING_CONFIG_MODE_LABELS[row.mode]} value only.`}
              </div>
            )}
          </div>
        ) : null}

        {editor}

        {row.kind === 'PRESCRIBED' && row.value !== null ? (
          <label htmlFor="lc-cfg-clear" className="f ac gp8 mb14" style={{ cursor: 'pointer' }}>
            <input id="lc-cfg-clear" type="checkbox" {...register('clear')} />
            <span className="fs13">Clear the value (back to To Be Confirmed)</span>
          </label>
        ) : null}

        <MasterField id="lc-cfg-reason" label="Reason for the change" required error={errors.reason?.message} hint="Recorded in the audit trail with the old and new value. Up to 500 characters.">
          <textarea className="inp" rows={3} maxLength={500} {...fieldAria('lc-cfg-reason', errors.reason?.message)} {...register('reason')} />
        </MasterField>
      </form>
    </Modal>
  );
}

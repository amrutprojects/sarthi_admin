import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { ConfirmModal } from '../../../cms/shared';
import type { FieldDef, ItemFormValues } from '../types/trackVariant.types';
import type { ItemFormConfig } from '../validation/itemForms';

interface ItemFormModalProps {
  config: ItemFormConfig;
  /* Sends the payload; throws the ApiError of a refused save. The caller closes the dialog and reloads. */
  onSave: (payload: object) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'tv-item-form';

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

/*
 * The add / edit dialog of a curriculum item (phase, track module, learning component, OFT card, assessment
 * component, readiness gate): React Hook Form + Zod with the backend's rules. It validates on submit and once a
 * field is touched, blocks double submits, keeps the values after a refused save, puts the server's field answers
 * (409 duplicate number / code / position, 400 reference of another variant, gate order) on the matching control,
 * and asks before discarding unsaved changes.
 */
export default function ItemFormModal({ config, onSave, onClose }: ItemFormModalProps) {
  const {
    control, register, handleSubmit, watch, setError,
    formState: { errors, isDirty },
  } = useForm<ItemFormValues>({ resolver: zodResolver(config.schema), defaultValues: config.defaults, mode: 'onTouched' });
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<{ message: string; details: string[] } | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const values = watch();

  const fields = config.fields.filter((f) => !f.showIf || f.showIf(values));
  const names = new Set(fields.map((f) => f.name));
  const message = (name: string): string | undefined => {
    const e = errors[name] as { message?: unknown } | undefined;
    return typeof e?.message === 'string' ? e.message : undefined;
  };

  const close = () => (isDirty && !busy ? setDiscarding(true) : onClose());

  const submit = handleSubmit(async (v) => {
    if (busy) return;
    setBusy(true);
    setRefused(null);
    try {
      await onSave(config.payload(v));
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setRefused({ message: 'Something went wrong. Try again.', details: [] });
        return;
      }
      /* Field answers go next to the field; the rest (and the message) stay in the dialog's summary. */
      const rest: string[] = [];
      for (const d of err.details) {
        const name = (d.field ?? '').replace(/^(body|params|query)\./, '').split('.')[0];
        if (names.has(name)) setError(name, { type: 'server', message: d.message });
        else rest.push(d.message);
      }
      setRefused({ message: err.status === 403 ? `Not permitted: ${err.message}` : err.message, details: rest });
    } finally {
      setBusy(false);
    }
  });

  const control_ = (f: FieldDef) => {
    const id = `tv-f-${f.name}`;
    const error = message(f.name);
    switch (f.type) {
      case 'text':
        return (
          <MasterField key={f.name} id={id} label={f.label} required={f.required} error={error} hint={f.hint}>
            <input
              className={'inp' + (f.mono ? ' mono' : '')}
              {...fieldAria(id, error)}
              maxLength={f.maxLength}
              inputMode={f.inputMode}
              autoComplete="off"
              readOnly={f.readOnly}
              style={f.mono ? { textTransform: 'uppercase' } : undefined}
              {...register(f.name)}
            />
          </MasterField>
        );
      case 'textarea':
        return (
          <MasterField key={f.name} id={id} label={f.label} required={f.required} error={error} hint={f.hint}>
            <textarea className="inp" {...fieldAria(id, error)} rows={f.rows ?? 3} maxLength={f.maxLength} readOnly={f.readOnly} {...register(f.name)} />
          </MasterField>
        );
      case 'select':
        return (
          <MasterField key={f.name} id={id} label={f.label} required={f.required} error={error} hint={f.hint}>
            <select className="inp" {...fieldAria(id, error)} {...register(f.name)}>
              <option value="">{f.placeholder ?? 'Select'}</option>
              {f.options.map((o) => (
                <option key={o.v} value={o.v} disabled={o.disabled}>{o.l}</option>
              ))}
            </select>
          </MasterField>
        );
      case 'checkboxes':
        return (
          <div className="fld" key={f.name}>
            <label id={`${id}-label`}>
              {f.label}
              {f.required ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
            </label>
            <Controller
              control={control}
              name={f.name}
              render={({ field }) => {
                const list = Array.isArray(field.value) ? field.value : [];
                return (
                  <div
                    role="group"
                    aria-labelledby={`${id}-label`}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className="f ac wrap"
                    style={{ gap: '6px 14px' }}
                  >
                    {f.options.map((o) => (
                      <label key={o.v} htmlFor={`${id}-${o.v}`} className="f ac gp4" style={{ cursor: 'pointer' }}>
                        <input
                          id={`${id}-${o.v}`}
                          type="checkbox"
                          checked={list.includes(o.v)}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(e.target.checked ? [...list, o.v] : list.filter((x) => x !== o.v))}
                        />
                        <span className="fs13">{o.l}</span>
                      </label>
                    ))}
                  </div>
                );
              }}
            />
            {errorLine(`${id}-error`, error) ?? (f.hint ? <div className="hint">{f.hint}</div> : null)}
          </div>
        );
      case 'checkbox':
        return (
          <div className="fld" key={f.name}>
            <label htmlFor={id} className="f ac gp8" style={{ cursor: 'pointer' }}>
              <input id={id} type="checkbox" {...register(f.name)} />
              <span className="fs13">{f.label}</span>
            </label>
            {errorLine(`${id}-error`, error) ?? (f.hint ? <div className="hint">{f.hint}</div> : null)}
          </div>
        );
    }
  };

  return (
    <>
      <Modal
        title={config.title}
        size="wide"
        onClose={close}
        footer={
          <>
            <button type="button" className="btn" disabled={busy} onClick={close}>Cancel</button>
            <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
              {busy ? 'Saving…' : config.submitLabel}
            </button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {refused ? (
            <div className="callout c-err mb14" role="alert">
              <div>
                <b>Not saved. </b>
                {refused.message}
                {refused.details.length ? (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {refused.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
          {config.intro ? <p className="muted fs12" style={{ margin: '0 0 10px' }}>{config.intro}</p> : null}
          <div className="grid g2">
            {fields.map((f) => (
              <div key={f.name} style={f.wide ? { gridColumn: '1 / -1' } : undefined}>
                {control_(f)}
              </div>
            ))}
          </div>
        </form>
      </Modal>
      {discarding ? (
        <ConfirmModal
          title="Discard changes?"
          message="This form has unsaved changes. Closing it now discards them."
          confirmLabel="Discard changes"
          danger
          onClose={() => setDiscarding(false)}
          onConfirm={onClose}
        />
      ) : null}
    </>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { MasterConfig } from '../config';
import { masterFormSchema, type MasterFormInput, type MasterFormValues } from '../schemas/masterSchema';

export interface MasterFormProps {
  master: MasterConfig;
  mode: 'create' | 'edit';
  defaultValues?: Partial<MasterFormInput>;
  submitting?: boolean;
  /* Server-side field errors (422 / 409) mapped onto the form. */
  serverErrors?: Partial<Record<keyof MasterFormValues, string>>;
  onSubmit: (values: MasterFormValues) => void;
  onCancel: () => void;
}

const field = 'tw-flex tw-flex-col tw-gap-1';
const labelCls = 'tw-text-xs tw-font-semibold tw-text-ink-2';
const errorText = 'tw-text-xs tw-text-danger';

/* Create / edit form for any master: React Hook Form + Zod (rules mirror the backend). Status is not editable here. */
export default function MasterForm({ master, mode, defaultValues, submitting, serverErrors = {}, onSubmit, onCancel }: MasterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MasterFormInput, unknown, MasterFormValues>({
    resolver: zodResolver(masterFormSchema(master)),
    defaultValues: { code: '', name: '', description: '', isMandatory: false, ...defaultValues },
  });
  const err = (k: keyof MasterFormValues) => errors[k]?.message ?? serverErrors[k];
  const id = (k: string) => `mf-${master.key}-${k}`;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="tw-flex tw-flex-col tw-gap-4"
      aria-label={`${mode === 'create' ? 'Add' : 'Edit'} ${master.label.toLowerCase()}`}
    >
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-3">
        <div className={`${field} sm:tw-col-span-2`}>
          <label htmlFor={id('name')} className={labelCls}>
            Name
          </label>
          <input id={id('name')} className="inp" autoComplete="off" aria-invalid={!!err('name')} {...register('name')} />
          {err('name') ? (
            <span className={errorText} role="alert">
              {err('name')}
            </span>
          ) : null}
        </div>
        <div className={field}>
          <label htmlFor={id('code')} className={labelCls}>
            Code
          </label>
          <input
            id={id('code')}
            className="inp mono"
            autoComplete="off"
            maxLength={master.codeMax}
            aria-invalid={!!err('code')}
            {...register('code')}
          />
          {err('code') ? (
            <span className={errorText} role="alert">
              {err('code')}
            </span>
          ) : null}
        </div>
      </div>

      <div className={field}>
        <label htmlFor={id('description')} className={labelCls}>
          Description (optional)
        </label>
        <textarea id={id('description')} className="inp" rows={3} aria-invalid={!!err('description')} {...register('description')} />
        {err('description') ? (
          <span className={errorText} role="alert">
            {err('description')}
          </span>
        ) : null}
      </div>

      {master.hasMandatory ? (
        <label className="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-text-sm">
          <input type="checkbox" className="tw-accent-brand-600" {...register('isMandatory')} />
          Mandatory document
        </label>
      ) : null}

      <div className="tw-flex tw-justify-end tw-gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? `Create ${master.label.toLowerCase()}` : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

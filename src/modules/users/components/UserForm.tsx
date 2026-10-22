import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ApiRole } from '../../roles-permissions';
import { createUserSchema, editUserSchema, type UserFormValues } from '../schemas/userSchema';

export interface UserFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<UserFormValues>;
  /* Roles offered on create (only when the signed-in user may assign roles). */
  roles?: ApiRole[];
  submitting?: boolean;
  /* Server-side field errors (422) mapped onto the form. */
  serverErrors?: Partial<Record<keyof UserFormValues, string>>;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

const field = 'tw-flex tw-flex-col tw-gap-1';
const errorText = 'tw-text-xs tw-text-danger';

/* Create / edit user form: React Hook Form + Zod (rules mirror the backend), styled with the theme tokens. */
export default function UserForm({ mode, defaultValues, roles = [], submitting, serverErrors = {}, onSubmit, onCancel }: UserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'create' ? createUserSchema : editUserSchema),
    defaultValues: { name: '', email: '', password: '', roleIds: [], ...defaultValues },
  });
  const roleIds = watch('roleIds');
  const err = (k: keyof UserFormValues) => errors[k]?.message ?? serverErrors[k];

  return (
    <form
      id="user-form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="tw-flex tw-flex-col tw-gap-4"
      aria-label={mode === 'create' ? 'Add user' : 'Edit user'}
    >
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
        <div className={field}>
          <label htmlFor="uf-name" className="tw-text-xs tw-font-semibold tw-text-ink-2">
            Full name
          </label>
          <input id="uf-name" className="inp" autoComplete="off" aria-invalid={!!err('name')} {...register('name')} />
          {err('name') ? (
            <span className={errorText} role="alert">
              {err('name')}
            </span>
          ) : null}
        </div>
        <div className={field}>
          <label htmlFor="uf-email" className="tw-text-xs tw-font-semibold tw-text-ink-2">
            Email
          </label>
          <input id="uf-email" type="email" className="inp" autoComplete="off" aria-invalid={!!err('email')} {...register('email')} />
          {err('email') ? (
            <span className={errorText} role="alert">
              {err('email')}
            </span>
          ) : null}
        </div>
      </div>

      <div className={field}>
        <label htmlFor="uf-pass" className="tw-text-xs tw-font-semibold tw-text-ink-2">
          {mode === 'edit' ? 'New password (leave blank to keep the current one)' : 'Password'}
        </label>
        <input
          id="uf-pass"
          type="password"
          className="inp"
          autoComplete="new-password"
          aria-invalid={!!err('password')}
          {...register('password')}
        />
        {err('password') ? (
          <span className={errorText} role="alert">
            {err('password')}
          </span>
        ) : (
          <span className="tw-text-xs tw-text-ink-muted">At least 10 characters, with upper-case, lower-case and a digit.</span>
        )}
      </div>

      {mode === 'create' && roles.length ? (
        <fieldset className="tw-m-0 tw-flex tw-flex-col tw-gap-2 tw-rounded tw-border tw-border-solid tw-border-line tw-p-3">
          <legend className="tw-px-1 tw-text-xs tw-font-semibold tw-text-ink-2">Roles</legend>
          <div className="tw-grid tw-grid-cols-1 tw-gap-1 sm:tw-grid-cols-2">
            {roles
              .filter((r) => r.isActive)
              .map((r) => (
                <label key={r.id} className="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-text-sm">
                  <input
                    type="checkbox"
                    className="tw-accent-brand-600"
                    checked={roleIds.includes(r.id)}
                    onChange={(e) => setValue('roleIds', e.target.checked ? [...roleIds, r.id] : roleIds.filter((x) => x !== r.id))}
                  />
                  {r.name}
                  {r.platform === 'LMS' ? <span className="tw-text-xs tw-text-ink-muted">(LMS role)</span> : null}
                </label>
              ))}
          </div>
          <span className="tw-text-xs tw-text-ink-muted">You can only assign roles whose permissions you hold yourself.</span>
        </fieldset>
      ) : null}

      <div className="tw-flex tw-justify-end tw-gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

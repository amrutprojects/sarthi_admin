import { ApiError } from '../../../services/api-client';
import type { UserFormValues } from '../schemas/userSchema';

/* Field errors from a 422 / 409 response, mapped onto the form. */
export function serverFieldErrors(err: unknown): Partial<Record<keyof UserFormValues, string>> {
  if (!(err instanceof ApiError)) return {};
  if (err.status === 409 && /email/i.test(err.message)) return { email: err.message };
  const out: Partial<Record<keyof UserFormValues, string>> = {};
  for (const d of err.details)
    if (d.field && ['name', 'email', 'password'].includes(d.field)) out[d.field as keyof UserFormValues] = d.message;
  return out;
}

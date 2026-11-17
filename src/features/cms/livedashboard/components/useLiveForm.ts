import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { LiveDashboardField } from '../types/livedashboard.types';
import { serverErrors } from '../validation/livedashboard.validation';

/*
 * The state every Live Dashboard form shares (settings, card, figure, district): the values, which fields were
 * touched, the field messages the server returned, and a guarded submit. A field's own message shows once it was
 * left or the form was submitted; a server message shows until the next submit. Entered values survive a failed
 * save; a 422 with field messages is shown on the fields, anything else as a toast.
 */
export function useLiveForm<V extends object>(
  formId: string,
  initial: V,
  validate: (v: V) => FieldErrors<LiveDashboardField>,
  onSave: (v: V) => Promise<void>,
) {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<LiveDashboardField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validate(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof V>(key: K, value: V[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  /* Scrolls the first field with a message into view, so a long form never fails without saying where. */
  const revealFirstError = () =>
    document
      .getElementById(formId)
      ?.querySelector('[aria-invalid="true"], [role="alert"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local)) {
      revealFirstError();
      return;
    }
    setBusy(true);
    setServer({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        flushSync(() => setServer(mapped));
        if (!isValid(mapped)) {
          revealFirstError();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return { values, set, show, touch, submit, busy, dirty };
}

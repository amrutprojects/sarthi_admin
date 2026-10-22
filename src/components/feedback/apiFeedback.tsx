import { useCallback, useEffect, useState, type ReactNode } from 'react';
import AS from '../../legacy';
import { Modal } from '../ui/Overlay';
import { ApiError } from '../../services/api-client';

/* Toast an API failure with the backend's message (and field details). */
export function toastError(err: unknown): void {
  const msg = err instanceof ApiError ? (err.status === 403 ? 'Not permitted: ' : '') + err.fullMessage : 'Something went wrong';
  AS.ui.toast(msg, 'err');
}

export const toastOk = (msg: string) => AS.ui.toast(msg, 'ok');

/* Load data from the API with loading / error state and a reload function. */
export function useApiData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Failed to load', 0, 'ERROR'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

/* Run a mutation: disables the trigger while pending, toasts the outcome, then calls onDone. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, success: string, onDone?: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toastOk(success);
      await onDone?.();
      return true;
    } catch (err) {
      toastError(err);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}

export function LoadState({ loading, error, onRetry }: { loading: boolean; error: ApiError | null; onRetry: () => void }) {
  if (error) {
    return (
      <div className="callout c-err mb14">
        <div>
          <b>Could not load data from the server. </b>
          {error.fullMessage}{' '}
          <button type="button" className="btn xs" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ padding: '6px 0' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel" style={{ height: 14, marginBottom: 10, width: 100 - i * 8 + '%' }} />
        ))}
      </div>
    );
  }
  return null;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /* Optional detail under the message, e.g. a list of what the action affects. */
  children?: ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={'btn ' + (danger ? 'danger' : 'primary')} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
      {children}
    </Modal>
  );
}

export const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

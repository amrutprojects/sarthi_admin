import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useUiStore } from '../store/ui.store';

/* Screen state (e.g. filters) kept in the UI store for the session, so it survives navigating away and back. */
export default function usePersistentState<T extends object>(key: string, defaults: T): [T, Dispatch<SetStateAction<T>>] {
  const stored = useUiStore((s) => s.pageState[key]) as Partial<T> | undefined;
  const setPageState = useUiStore((s) => s.setPageState);
  const value = { ...defaults, ...(stored ?? {}) } as T;
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      const current = { ...defaults, ...((useUiStore.getState().pageState[key] as Partial<T> | undefined) ?? {}) } as T;
      setPageState(key, typeof next === 'function' ? (next as (p: T) => T)(current) : next);
    },
    // defaults is a constant object per screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, setPageState],
  );
  return [value, setValue];
}

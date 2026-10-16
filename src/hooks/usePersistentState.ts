import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import AS from '../legacy';

/* Page state kept in AS.state[key] so it survives navigation, like the original portal. */
export default function usePersistentState<T extends object>(key: string, defaults: T): [T, Dispatch<SetStateAction<T>>] {
  const [s, setS] = useState<T>(() => ({ ...defaults, ...((AS.state[key] as Partial<T> | undefined) || {}) }));
  useEffect(() => { AS.state[key] = s; }, [key, s]);
  return [s, setS];
}

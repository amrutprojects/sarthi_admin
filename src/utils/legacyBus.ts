import { useEffect, useState } from 'react';

/* Lets code that mutates the shared mock data (AS.render / bump) ask React components to re-render. */
type Listener = (tick: number) => void;
const listeners = new Set<Listener>();
let tick = 0;

export function bump(): void {
  tick += 1;
  listeners.forEach((fn) => fn(tick));
}

export function useLegacyTick(): number {
  const [t, setT] = useState(tick);
  useEffect(() => {
    listeners.add(setT);
    return () => { listeners.delete(setT); };
  }, []);
  return t;
}

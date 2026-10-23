import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

/* jsdom lacks these browser APIs used by the UI. */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
/* Nor object URLs: chosen files are opened through them. */
URL.createObjectURL ??= (() => 'blob:test') as typeof URL.createObjectURL;
URL.revokeObjectURL ??= (() => undefined) as typeof URL.revokeObjectURL;
/* Nor scrolling: AdminLayout scrolls to the top on every navigation. */
window.scrollTo = (() => undefined) as typeof window.scrollTo;
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID: () => '00000000-0000-4000-8000-000000000000' },
  });
}

/* "as of" of a live answer, in the Panel's locale. */
export const fetchedAtLabel = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

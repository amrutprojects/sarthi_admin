import type { PageMeta } from '../../services/api-client';
import type { MasterQuery } from './components/MasterTable';

/*
 * Search, status filter, sorting and paging done in the browser, for the short lists of a CMS page section (board
 * members, schemes, impact figures…) whose API returns the whole list at once. It turns that list into the
 * `rows` + `meta` a MasterTable takes, so these lists look and behave exactly like FAQ Management, which pages
 * on the server.
 */
export interface ClientListOptions<T> {
  /* The text a search term is matched against, e.g. both languages of the title. */
  searchText: (row: T) => string;
  /* One value per sortable column key; strings compare case-insensitively, in Marathi/English collation. */
  sortValue: Record<string, (row: T) => string | number | null | undefined>;
  /* Whether the row is active, for the status filter. */
  isActive?: (row: T) => boolean;
}

const collator = new Intl.Collator(['en', 'mr'], { sensitivity: 'base', numeric: true });

function compare(a: string | number | null | undefined, b: string | number | null | undefined): number {
  /* Blank values sort last whichever way the column is sorted, as the server-paged lists do. */
  if (a == null || a === '') return b == null || b === '' ? 0 : 1;
  if (b == null || b === '') return -1;
  return typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
}

export function clientPage<T>(items: readonly T[], q: MasterQuery, opts: ClientListOptions<T>): { rows: T[]; meta: PageMeta } {
  const term = q.search.trim().toLowerCase();
  let list = term ? items.filter((row) => opts.searchText(row).toLowerCase().includes(term)) : [...items];
  if (q.status !== '' && opts.isActive) list = list.filter((row) => opts.isActive!(row) === (q.status === 'true'));

  const value = opts.sortValue[q.sortBy];
  if (value) {
    const sign = q.sortOrder === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const blank = (v: unknown) => v == null || v === '';
      /* Keep blanks last in both directions instead of flipping them to the top on desc. */
      if (blank(va) || blank(vb)) return compare(va, vb);
      return sign * compare(va, vb);
    });
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / q.limit));
  const page = Math.min(Math.max(1, q.page), totalPages);
  const start = (page - 1) * q.limit;
  return { rows: list.slice(start, start + q.limit), meta: { page, limit: q.limit, total, totalPages } };
}

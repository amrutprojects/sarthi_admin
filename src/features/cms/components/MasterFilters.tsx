import type { Option } from '../../../types/legacy';
import { optionLabel, type GeoOption } from '../types';

/*
 * Option lists for the CMS filter bars.
 *
 * They go through the panel-wide FilterBar component (the same one Batches and Districts use), so the
 * CMS listings get the same full-width filter band rather than a row of controls squeezed into the
 * table toolbar.
 */

export const STATUS_OPTIONS: Option[] = [
  { v: '', l: 'All statuses' },
  { v: 'true', l: 'Active only' },
  { v: 'false', l: 'Inactive only' },
];

interface GeoFilterArgs {
  options: GeoOption[];
  loading: boolean;
  /* Label of the "no filter" entry, e.g. "All states". */
  allLabel: string;
  /* Shown instead when a parent selection is still missing, e.g. "All districts (pick a state)". */
  waitingLabel?: string;
  waiting?: boolean;
  /* The current filter value (often from a deep link such as ?centreId=). */
  selected?: string;
  /* Label for selected when the list does not contain it, e.g. "Pune Centre (PNC) (inactive)". */
  selectedLabel?: string;
}

/*
 * A parent filter (state / district) as FilterBar options.
 *
 * FilterBar has no loading or disabled state of its own, so the placeholder entry carries that
 * information: the field still reads sensibly while the list is on its way, instead of looking like a
 * filter with nothing in it.
 *
 * The lists hold active records only. A deep link may name an inactive one; it is then added as its own
 * entry, so the field shows what the listing is really filtered by (not "All …" while filtering) and
 * choosing "All …" is a real change that clears it.
 */
export function geoFilterOptions({ options, loading, allLabel, waitingLabel, waiting, selected, selectedLabel }: GeoFilterArgs): Option[] {
  const out: Option[] = waiting
    ? [{ v: '', l: waitingLabel ?? allLabel }]
    : loading
      ? [{ v: '', l: 'Loading…' }]
      : [{ v: '', l: allLabel }, ...options.map((o) => ({ v: o.id, l: optionLabel(o) }))];
  if (selected && !loading && !out.some((o) => o.v === selected)) out.push({ v: selected, l: selectedLabel ?? 'Selected record (inactive)' });
  return out;
}

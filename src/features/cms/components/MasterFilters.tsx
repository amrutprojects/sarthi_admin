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
}

/*
 * A parent filter (state / district) as FilterBar options.
 *
 * FilterBar has no loading or disabled state of its own, so the placeholder entry carries that
 * information: the field still reads sensibly while the list is on its way, instead of looking like a
 * filter with nothing in it.
 */
export function geoFilterOptions({ options, loading, allLabel, waitingLabel, waiting }: GeoFilterArgs): Option[] {
  if (waiting) return [{ v: '', l: waitingLabel ?? allLabel }];
  if (loading) return [{ v: '', l: 'Loading…' }];
  return [{ v: '', l: allLabel }, ...options.map((o) => ({ v: o.id, l: optionLabel(o) }))];
}

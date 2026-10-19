/* Shapes shared by the three CMS masters. Per-entity shapes live in each module's types folder. */

/* One option of a geography dropdown, as /cms/states/:id/districts and friends return it. */
export interface GeoOption {
  id: string;
  name: string;
  code: string | null;
}

/* Label shown in a select: "Pune (PUN)", or just the name when the record has no code. */
export const optionLabel = (o: { name: string; code: string | null }) => (o.code ? `${o.name} (${o.code})` : o.name);

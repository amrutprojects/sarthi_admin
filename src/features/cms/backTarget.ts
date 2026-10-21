/*
 * Back target of a CMS list page: the parent record the list was opened from (a deep link such as
 * /cms/batches?centreId=…), most specific first, else the dashboard.
 *
 * `allowed` says whether the user may open that parent's View page (pages pass useCan()(viewAction)). The
 * same deep link is also reached from same-module links ("Other students of this batch"), so it is not
 * proof the user came from — or can see — the parent; a parent they cannot open is skipped rather than
 * sending Back to an access notice.
 *
 *   listBackTarget([[params.get('districtId'), '/cms/districts', can('viewDistricts')], [params.get('stateId'), '/cms/states', can('viewStates')]])
 */
export const listBackTarget = (parents: [id: string | null | undefined, viewPath: string, allowed?: boolean][]): string => {
  for (const [id, path, allowed] of parents) if (id && allowed !== false) return `${path}/${encodeURIComponent(id)}`;
  return '/dashboard';
};

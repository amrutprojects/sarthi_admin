/*
 * Programme data readers (candidates, centres, tasks, …) over the seeded mock service AS.db
 * (src/legacy/data.js). The backend does not serve these modules yet; when it does, replace
 * these readers with calls through ./http.
 *
 * Identity, roles and permissions are NOT mock: they come from the backend (./authApi, ./rbacApi).
 */
import AS from '../../legacy';

const db = () => AS.db;

export const api = {
  config: () => db().config,
  districts: () => db().districts,
  centres: () => db().centres,
  tasks: () => db().tasks,
  openTaskCount: () => db().tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
  notifications: () => db().notifications,
  search: (q: string) => db().search(q),
};

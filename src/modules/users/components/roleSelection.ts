import { WEBSITE_ADMIN_ROLE } from '../../auth';

interface RoleLike {
  id: string;
  code: string;
}

/*
 * Ticks or unticks a role in a role picker. Website Admin is always held alone (the backend refuses it next to any
 * other role): ticking it clears the other roles, and ticking another role clears it.
 */
export function toggleRole(selected: string[], role: RoleLike, roles: RoleLike[]): string[] {
  if (selected.includes(role.id)) return selected.filter((id) => id !== role.id);
  if (role.code === WEBSITE_ADMIN_ROLE) return [role.id];
  const website = new Set(roles.filter((r) => r.code === WEBSITE_ADMIN_ROLE).map((r) => r.id));
  return [...selected.filter((id) => !website.has(id)), role.id];
}

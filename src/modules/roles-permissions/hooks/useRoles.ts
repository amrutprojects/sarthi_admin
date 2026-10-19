import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../services/rbacApi';

export const roleKeys = { all: ['roles'] as const, list: () => [...roleKeys.all, 'list'] as const };

/* All roles (small list), e.g. for role pickers. Pass enabled=false when the user may not view roles. */
export function useRoles(enabled = true) {
  return useQuery({ queryKey: roleKeys.list(), queryFn: () => rolesApi.listAll(), enabled, staleTime: 60_000 });
}

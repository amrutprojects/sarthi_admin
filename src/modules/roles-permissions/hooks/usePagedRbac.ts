import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { permissionsApi, rolesApi, type ListParams } from '../services/rbacApi';

/* Server-paged role and permission lists. The previous page stays on screen while the next one loads. */
export function usePagedRoles(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ['roles', 'paged', params],
    queryFn: ({ signal }) => rolesApi.list(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePagedPermissions(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ['permissions', 'paged', params],
    queryFn: ({ signal }) => permissionsApi.list(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/* Total count only (limit 1), for KPI tiles. */
export const countOf = (r: { data?: { meta?: { total: number } } }) => r.data?.meta?.total ?? '—';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MasterConfig } from '../config';
import { masterApi } from '../services/masterApi';
import type { MasterInput, MasterListParams } from '../types';

/* Query keys per master: invalidating masterKeys.all(m) refreshes its lists, details and options. */
export const masterKeys = {
  all: (m: MasterConfig) => ['masters', m.key] as const,
  list: (m: MasterConfig, params: MasterListParams) => [...masterKeys.all(m), 'list', params] as const,
  detail: (m: MasterConfig, id: string) => [...masterKeys.all(m), 'detail', id] as const,
  options: (m: MasterConfig) => [...masterKeys.all(m), 'options'] as const,
};

/* Paged, filtered list. Keeps the previous page on screen while the next one loads. */
export function useMasterList(m: MasterConfig, params: MasterListParams) {
  return useQuery({
    queryKey: masterKeys.list(m, params),
    queryFn: ({ signal }) => masterApi.list(m, params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMasterRecord(m: MasterConfig, id: string | null) {
  return useQuery({ queryKey: masterKeys.detail(m, id ?? ''), queryFn: () => masterApi.get(m, id!), enabled: !!id });
}

/* Active, non-deleted values for dropdowns elsewhere in the panel. */
export function useMasterOptions(m: MasterConfig) {
  return useQuery({ queryKey: masterKeys.options(m), queryFn: ({ signal }) => masterApi.options(m, signal), staleTime: 60_000 });
}

/* Every write invalidates the master's queries, so lists, details and dropdowns refetch. */
function useMasterMutation<TVars, TResult>(m: MasterConfig, fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: masterKeys.all(m) }) });
}

export const useCreateMaster = (m: MasterConfig) =>
  useMasterMutation(m, ({ input, idempotencyKey }: { input: MasterInput; idempotencyKey: string }) =>
    masterApi.create(m, input, idempotencyKey),
  );
export const useUpdateMaster = (m: MasterConfig) =>
  useMasterMutation(m, ({ id, input }: { id: string; input: MasterInput }) => masterApi.update(m, id, input));
export const useSetMasterStatus = (m: MasterConfig) =>
  useMasterMutation(m, ({ id, isActive }: { id: string; isActive: boolean }) => masterApi.setStatus(m, id, isActive));
export const useDeleteMaster = (m: MasterConfig) => useMasterMutation(m, (id: string) => masterApi.remove(m, id));

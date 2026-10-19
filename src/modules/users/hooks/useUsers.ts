import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/userApi';
import type { CreateUserInput, UpdateUserInput, UserListParams } from '../types/user.types';

/* Query keys for the users module: invalidating userKeys.all refreshes every users query. */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

/* Paged, filtered user list. Keeps the previous page on screen while the next one loads. */
export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => userApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string | null) {
  return useQuery({ queryKey: userKeys.detail(id ?? ''), queryFn: () => userApi.get(id!), enabled: !!id });
}

/* Every write invalidates the users queries, so lists and details refetch. */
function useUserMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }) });
}

export const useCreateUser = () =>
  useUserMutation((input: CreateUserInput & { idempotencyKey: string }) => {
    const { idempotencyKey, ...body } = input;
    return userApi.create(body, idempotencyKey);
  });
export const useUpdateUser = () => useUserMutation(({ id, input }: { id: string; input: UpdateUserInput }) => userApi.update(id, input));
export const useSetUserStatus = () =>
  useUserMutation(({ id, isActive }: { id: string; isActive: boolean }) => userApi.setStatus(id, isActive));
export const useDeleteUser = () => useUserMutation((id: string) => userApi.remove(id));
export const useReplaceUserRoles = () =>
  useUserMutation(({ id, roleIds }: { id: string; roleIds: string[] }) => userApi.replaceRoles(id, roleIds));

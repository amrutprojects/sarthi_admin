import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '../../auth';
import { apiKeyApi, lmsSyncApi } from '../services/lmsSyncApi';
import type { LmsSyncDetail, LmsSyncStatus } from '../types/lmsSync.types';

export const lmsSyncKeys = {
  status: ['lms-sync', 'status'] as const,
  detail: (studentId: string) => ['lms-sync', 'detail', studentId] as const,
  apiKeys: ['lms-api-keys'] as const,
};

export interface LmsSyncFeature {
  /* The server has M1 sync and the user may see flags: show the column, filter and sync detail. */
  visible: boolean;
  /* The user may push / retry (lms-sync.update) and the server's sync is switched on. */
  canPush: boolean;
  /* The server reports the sync switched off (LMS_SYNC_ENABLED): flags shown, pushes refused. */
  paused: boolean;
  status: LmsSyncStatus | undefined;
}

/*
 * Whether the LMS sync screens apply: the user holds lms-sync.view and GET /lms-sync/status answers. A server
 * without M1 (404) or a user it refuses (403) leaves the register exactly as it was.
 */
export function useLmsSyncFeature(): LmsSyncFeature {
  const can = useCan();
  const mayView = can('viewLmsSync');
  const q = useQuery({
    queryKey: lmsSyncKeys.status,
    queryFn: lmsSyncApi.status,
    enabled: mayView,
    retry: false,
    staleTime: 60_000,
  });
  const visible = mayView && q.isSuccess;
  return {
    visible,
    canPush: visible && can('pushLmsSync') && !!q.data?.enabled,
    paused: visible && !q.data?.enabled,
    status: q.data,
  };
}

export function useLmsSyncDetail(studentId: string, enabled = true) {
  return useQuery({
    queryKey: lmsSyncKeys.detail(studentId),
    queryFn: () => lmsSyncApi.detail(studentId),
    enabled: enabled && !!studentId,
  });
}

/* Push or Retry one student; the answer is the updated detail, and the register and counts are refreshed. */
export function useSyncAction(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: 'push' | 'retry') => (kind === 'push' ? lmsSyncApi.push(studentId) : lmsSyncApi.retry(studentId)),
    onSuccess: (d: LmsSyncDetail) => {
      qc.setQueryData(lmsSyncKeys.detail(studentId), d);
      void qc.invalidateQueries({ queryKey: lmsSyncKeys.status });
      void qc.invalidateQueries({ queryKey: ['students', 'list'] });
    },
  });
}

export function useBulkPush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => lmsSyncApi.bulkPush(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lmsSyncKeys.status });
      void qc.invalidateQueries({ queryKey: ['students', 'list'] });
    },
  });
}

/* The key list holds no secrets (prefix only), so it may live in the query cache. */
export function useApiKeys(enabled = true) {
  return useQuery({ queryKey: lmsSyncKeys.apiKeys, queryFn: apiKeyApi.list, enabled });
}

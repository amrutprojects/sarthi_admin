import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '../../auth';
import { apiKeyApi, lmsSyncApi } from '../services/lmsSyncApi';
import type { LmsSyncListQuery, LmsSyncSummary } from '../types/lmsSync.types';

export const lmsSyncKeys = {
  all: ['lms-sync'] as const,
  summary: ['lms-sync', 'summary'] as const,
  list: (q: LmsSyncListQuery) => ['lms-sync', 'list', q] as const,
  detail: (studentId: string) => ['lms-sync', 'detail', studentId] as const,
  apiKeys: ['api-keys'] as const,
};

export interface LmsSyncFeature {
  /* The server has the M1 sync and the user may read it (imports.view or candidates.view). */
  visible: boolean;
  /* The user may push / retry (imports.update). The server queues even while the sync is switched off. */
  canPush: boolean;
  /* LMS_SYNC_ENABLED is off: show the banner; queued students are sent once it is on. */
  paused: boolean;
  summary: LmsSyncSummary | undefined;
}

/*
 * Whether the LMS sync screens apply: the user may read the register and GET /lms-sync/summary answers. A server
 * without M1 (404) or a refused user (403) leaves the register exactly as it was.
 */
export function useLmsSyncFeature(): LmsSyncFeature {
  const can = useCan();
  const mayView = can('viewLmsSync');
  const q = useQuery({ queryKey: lmsSyncKeys.summary, queryFn: lmsSyncApi.summary, enabled: mayView, retry: false, staleTime: 60_000 });
  const visible = mayView && q.isSuccess;
  return { visible, canPush: visible && can('pushLmsSync'), paused: visible && !q.data?.syncEnabled, summary: q.data };
}

export function useLmsSyncList(q: LmsSyncListQuery, enabled = true) {
  return useQuery({ queryKey: lmsSyncKeys.list(q), queryFn: () => lmsSyncApi.list(q), enabled, placeholderData: keepPreviousData });
}

export function useLmsSyncDetail(studentId: string, enabled = true) {
  return useQuery({
    queryKey: lmsSyncKeys.detail(studentId),
    queryFn: () => lmsSyncApi.detail(studentId),
    enabled: enabled && !!studentId,
  });
}

/* Push (one or many) and Retry; afterwards the summary, register and details are refreshed. */
export function useSyncActions() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: lmsSyncKeys.all });
  return {
    push: useMutation({ mutationFn: (ids: string[]) => lmsSyncApi.push(ids), onSuccess: refresh }),
    retry: useMutation({ mutationFn: (ids?: string[]) => lmsSyncApi.retry(ids), onSuccess: refresh }),
  };
}

/* The key list holds no secrets (prefix only), so it may live in the query cache. */
export function useApiKeys(enabled = true) {
  return useQuery({ queryKey: lmsSyncKeys.apiKeys, queryFn: () => apiKeyApi.list(), enabled });
}

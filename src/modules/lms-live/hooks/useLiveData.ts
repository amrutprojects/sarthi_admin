import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lmsLiveApi } from '../services/lmsLiveApi';

export const lmsLiveKeys = {
  all: ['lms-live'] as const,
  state: ['lms-live', 'state'] as const,
  read: (what: string, ...args: unknown[]) => ['lms-live', 'read', what, ...args] as const,
};

export interface LiveDataSource {
  /* The state is still being asked for (first load only; it is cached). */
  pending: boolean;
  /* Show live data (the server says "live"). Anything else (off, master switch off, error, old server) = local. */
  live: boolean;
}

/*
 * Which source the LMS screens show. Off is the default and the fallback: any error of the state call (404 on a server
 * without G-2, 403, network) keeps the screens on their current local data, exactly as before G-2.
 */
export function useLiveDataSource(): LiveDataSource {
  const q = useQuery({ queryKey: lmsLiveKeys.state, queryFn: lmsLiveApi.state, retry: false, staleTime: 60_000 });
  return { pending: q.isPending, live: q.isSuccess && q.data.live };
}

/* The full state for the System Settings switch. */
export function useLiveDataState() {
  return useQuery({ queryKey: lmsLiveKeys.state, queryFn: lmsLiveApi.state, retry: false, staleTime: 60_000 });
}

/* Switch on / off; afterwards every LMS screen re-reads its source. */
export function useSetLiveData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: lmsLiveApi.setState,
    onSuccess: (state) => {
      qc.setQueryData(lmsLiveKeys.state, state);
      void qc.invalidateQueries({ queryKey: lmsLiveKeys.all });
    },
  });
}

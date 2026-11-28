import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { ApplicationDetail, ApplicationListQuery, BatchListQuery, HeadOfficeState } from '../types/ippApprovals.types';

/* Query keys of the module: every write invalidates ippKeys.all, because one decision changes the lists, the counts and the batches. */
export const ippKeys = {
  all: ['ipp-approvals'] as const,
  summary: ['ipp-approvals', 'summary'] as const,
  dashboard: ['ipp-approvals', 'dashboard'] as const,
  districts: ['ipp-approvals', 'districts'] as const,
  applications: (q: ApplicationListQuery) => ['ipp-approvals', 'applications', q] as const,
  application: (id: string) => ['ipp-approvals', 'application', id] as const,
  batches: (q: BatchListQuery) => ['ipp-approvals', 'batches', q] as const,
  batch: (id: string) => ['ipp-approvals', 'batch', id] as const,
  batchOptions: (districtId?: string) => ['ipp-approvals', 'batch-options', districtId ?? ''] as const,
  officers: ['ipp-approvals', 'officers'] as const,
  headOffice: ['ipp-approvals', 'head-office'] as const,
  link: ['ipp-approvals', 'link'] as const,
};

export const useApprovalSummary = () => useQuery({ queryKey: ippKeys.summary, queryFn: () => ippApprovalsApi.summary() });
export const useDashboardFigures = () => useQuery({ queryKey: ippKeys.dashboard, queryFn: () => ippApprovalsApi.dashboard() });

export const useIppDistricts = (enabled = true) =>
  useQuery({ queryKey: ippKeys.districts, queryFn: () => ippApprovalsApi.districts(), enabled, staleTime: 5 * 60_000 });

/* Server-paged list; the previous page stays on screen while the next one loads. */
export const useApplications = (query: ApplicationListQuery) =>
  useQuery({
    queryKey: ippKeys.applications(query),
    queryFn: ({ signal }) => ippApprovalsApi.applications(query, signal),
    placeholderData: keepPreviousData,
  });

export const useApplication = (id: string) =>
  useQuery({ queryKey: ippKeys.application(id), queryFn: () => ippApprovalsApi.application(id), enabled: !!id });

export const useBatches = (query: BatchListQuery) =>
  useQuery({
    queryKey: ippKeys.batches(query),
    queryFn: ({ signal }) => ippApprovalsApi.batches(query, signal),
    placeholderData: keepPreviousData,
  });

export const useBatch = (id: string) => useQuery({ queryKey: ippKeys.batch(id), queryFn: () => ippApprovalsApi.batch(id), enabled: !!id });

export const useBatchOptions = (districtId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ippKeys.batchOptions(districtId),
    queryFn: () => ippApprovalsApi.batchOptions(districtId),
    enabled,
    staleTime: 60_000,
  });

export const useOfficers = () => useQuery({ queryKey: ippKeys.officers, queryFn: () => ippApprovalsApi.officers() });
export const useHeadOffice = () => useQuery({ queryKey: ippKeys.headOffice, queryFn: () => ippApprovalsApi.headOffice() });
export const useLink = () => useQuery({ queryKey: ippKeys.link, queryFn: () => ippApprovalsApi.link() });

/*
 * A write. The module's queries are read again afterwards, also after a refusal: a 409 says that the application has
 * moved on in the meantime, so what is on screen is old.
 */
function useIppMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  onData?: (result: TResult, qc: QueryClient) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => onData?.(result, qc),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ippKeys.all });
    },
  });
}

export const useApproveMany = () =>
  useIppMutation(({ ids, reason }: { ids: string[]; reason: string | null }) => ippApprovalsApi.approve(ids, reason));
export const useApproveBatch = () =>
  useIppMutation(({ batchId, reason }: { batchId: string; reason: string | null }) => ippApprovalsApi.approveBatch(batchId, reason));
export const useApproveOne = () =>
  useIppMutation(
    ({ id, reason }: { id: string; reason: string | null }) => ippApprovalsApi.approveOne(id, reason),
    (detail, qc) => qc.setQueryData<ApplicationDetail>(ippKeys.application(detail.id), detail),
  );
export const useReject = () =>
  useIppMutation(
    ({ id, reason }: { id: string; reason: string }) => ippApprovalsApi.reject(id, reason),
    (detail, qc) => qc.setQueryData<ApplicationDetail>(ippKeys.application(detail.id), detail),
  );

export const useSetOfficerDistricts = () =>
  useIppMutation(({ userId, districtIds }: { userId: string; districtIds: string[] }) =>
    ippApprovalsApi.setOfficerDistricts(userId, districtIds),
  );

export const useSetHeadOffice = () =>
  useIppMutation(
    (enabled: boolean) => ippApprovalsApi.setHeadOffice(enabled),
    ({ enabled, updatedAt, updatedBy }, qc) => qc.setQueryData<HeadOfficeState>(ippKeys.headOffice, { enabled, updatedAt, updatedBy }),
  );

export const useRetryLink = () => useIppMutation((ids: string[] | undefined) => ippApprovalsApi.retryLink(ids));
export const useTestLink = () => useIppMutation<void, { ok: boolean; message: string }>(() => ippApprovalsApi.testLink());

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { studentApi, type StudentListQuery } from '../services/importApi';

/* Register counts (GET /students/summary), optionally for one district; shared by the dashboard and the candidate list. */
export function useStudentSummary(centre?: string) {
  return useQuery({
    queryKey: ['students', 'summary', centre ?? 'ALL'],
    queryFn: () => studentApi.summary(centre || undefined),
  });
}

/* One server page of the student register (GET /students); the previous page stays visible while the next loads. */
export function useStudentList(q: StudentListQuery) {
  return useQuery({
    queryKey: ['students', 'list', q],
    queryFn: () => studentApi.list(q),
    placeholderData: keepPreviousData,
  });
}

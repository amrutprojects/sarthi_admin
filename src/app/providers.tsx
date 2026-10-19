import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../modules/auth/AuthContext';
import { ApiError } from '../services/api-client';

/*
 * Server state lives in TanStack Query (ADR-0007): every API read is a query, every write a mutation that
 * invalidates the queries it changes. Client-only UI state lives in the Zustand store (store/).
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        /* Do not retry client errors (4xx): they will not succeed on retry. */
        retry: (failures, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 2,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

const queryClient = createQueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

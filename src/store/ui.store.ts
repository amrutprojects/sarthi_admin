import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Shared client-only UI state (ADR-0007). Server data never goes here (that is TanStack Query's job),
 * and nothing sensitive is persisted: only the sidebar preference is saved to localStorage.
 */
interface UiState {
  sidebarCollapsed: boolean;
  /* Mobile/tablet off-canvas sidebar. */
  sidebarOpen: boolean;
  /* Per-screen filters, kept for the session so they survive navigation (key → filter object). */
  pageState: Record<string, unknown>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPageState: (key: string, value: unknown) => void;
}

/* localStorage can throw (private mode, blocked storage); fall back to memory. */
const safeStorage = createJSONStorage(() => {
  try {
    const probe = '__ui_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarOpen: false,
      pageState: {},
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setPageState: (key, value) => set((s) => ({ pageState: { ...s.pageState, [key]: value } })),
    }),
    { name: 'amrut-admin-ui', storage: safeStorage, partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);

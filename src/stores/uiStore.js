import { create } from "zustand";

export const useUIStore = create((set) => ({
  loading: false,
  error: null,
  loadingCount: 0, // Para manejar múltiples cargas simultáneas

  startLoading: () =>
    set((state) => ({
      loading: true,
      loadingCount: state.loadingCount + 1,
    })),

  stopLoading: () =>
    set((state) => {
      const newCount = state.loadingCount - 1;
      return {
        loading: newCount > 0,
        loadingCount: newCount,
      };
    }),

  setError: (error) =>
    set({
      error: error?.message || error || "Error desconocido",
      loading: false,
      loadingCount: 0,
    }),

  clearError: () => set({ error: null }),
}));

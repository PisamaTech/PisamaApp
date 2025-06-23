import { create } from "zustand";

export const useUIStore = create((set) => ({
  loading: false,
  error: null,
  loadingCount: 0, // Para manejar múltiples cargas simultáneas
  theme: "light",
  toast: {
    isOpen: false,
    type: "error", // "error" o "success"
    title: "",
    message: "",
  },

  // --- Estados para Reagendamiento ---
  isReagendamientoMode: false, // Indica si estamos en modo reagendamiento
  penalizedBookingForReagendamiento: null, // Guarda la reserva original a reagendar
  // --- Fin Estados para Reagendamiento ---

  //Manejo de cargas
  startLoading: () => set({ loading: true }),

  stopLoading: () => set({ loading: false }),

  //Seteo de errores
  setError: (error) =>
    set({
      error: error?.message || error || "Error desconocido",
      loading: false,
    }),

  clearError: () => set({ error: null }),

  // Acción para mostrar el toast
  showToast: ({ type, title, message }) =>
    set({
      toast: {
        isOpen: true,
        type,
        title,
        message,
      },
    }),

  // Acción para cerrar el toast
  hideToast: () =>
    set({
      toast: {
        isOpen: false,
        type: "error",
        title: "",
        message: "",
      },
    }),

  setTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

  // --- Acciones para Reagendamiento ---
  startReagendamientoMode: (penalizedBooking) =>
    set({
      isReagendamientoMode: true,
      penalizedBookingForReagendamiento: penalizedBooking,
    }),

  stopReagendamientoMode: () =>
    set({
      isReagendamientoMode: false,
      penalizedBookingForReagendamiento: null,
    }),
  // --- Fin Acciones para Reagendamiento ---
}));

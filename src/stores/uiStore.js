import { create } from "zustand";

export const useUIStore = create((set) => ({
  loading: false,
  loadingMessage: "Cargando...", // Mensaje personalizable para el loading
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

  // ✅ ACTUALIZADO: Manejo de cargas con mensaje personalizable
  startLoading: (message = "Cargando...") =>
    set({
      loading: true,
      loadingMessage: message,
    }),

  stopLoading: () =>
    set({
      loading: false,
      loadingMessage: "Cargando...", // Reset al mensaje por defecto
    }),

  //Seteo de errores
  setError: (error) =>
    set({
      error: error?.message || error || "Error desconocido",
      loading: false,
      loadingMessage: "Cargando...", // ✅ NUEVO: Reset del mensaje también en errores
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

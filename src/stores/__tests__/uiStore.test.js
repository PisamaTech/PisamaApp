import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      loading: false,
      loadingMessage: "Cargando...",
      error: null,
      loadingCount: 0,
      theme: "light",
      toast: {
        isOpen: false,
        type: "error",
        title: "",
        message: "",
      },
      isReagendamientoMode: false,
      penalizedBookingForReagendamiento: null,
    });
  });

  describe("loading state", () => {
    it("should start loading with default message", () => {
      const { startLoading } = useUIStore.getState();
      startLoading();

      const state = useUIStore.getState();
      expect(state.loading).toBe(true);
      expect(state.loadingMessage).toBe("Cargando...");
    });

    it("should start loading with custom message", () => {
      const { startLoading } = useUIStore.getState();
      startLoading("Guardando datos...");

      const state = useUIStore.getState();
      expect(state.loading).toBe(true);
      expect(state.loadingMessage).toBe("Guardando datos...");
    });

    it("should stop loading and reset message", () => {
      const { startLoading, stopLoading } = useUIStore.getState();

      startLoading("Procesando...");
      expect(useUIStore.getState().loading).toBe(true);

      stopLoading();
      const state = useUIStore.getState();
      expect(state.loading).toBe(false);
      expect(state.loadingMessage).toBe("Cargando...");
    });
  });

  describe("error handling", () => {
    it("should set error with message string", () => {
      const { setError } = useUIStore.getState();
      setError("Error de conexión");

      const state = useUIStore.getState();
      expect(state.error).toBe("Error de conexión");
      expect(state.loading).toBe(false);
    });

    it("should set error from error object with message property", () => {
      const { setError } = useUIStore.getState();
      const errorObj = { message: "Error de autenticación" };
      setError(errorObj);

      const state = useUIStore.getState();
      expect(state.error).toBe("Error de autenticación");
    });

    it("should set default error message for unknown errors", () => {
      const { setError } = useUIStore.getState();
      setError(null);

      const state = useUIStore.getState();
      expect(state.error).toBe("Error desconocido");
    });

    it("should clear error", () => {
      const { setError, clearError } = useUIStore.getState();

      setError("Some error");
      expect(useUIStore.getState().error).toBe("Some error");

      clearError();
      expect(useUIStore.getState().error).toBeNull();
    });

    it("should stop loading and reset message when setting error", () => {
      const { startLoading, setError } = useUIStore.getState();

      startLoading("Processing...");
      setError("Failed");

      const state = useUIStore.getState();
      expect(state.loading).toBe(false);
      expect(state.loadingMessage).toBe("Cargando...");
      expect(state.error).toBe("Failed");
    });
  });

  describe("toast notifications", () => {
    it("should show success toast", () => {
      const { showToast } = useUIStore.getState();
      showToast({
        type: "success",
        title: "Éxito",
        message: "Operación completada",
      });

      const state = useUIStore.getState();
      expect(state.toast.isOpen).toBe(true);
      expect(state.toast.type).toBe("success");
      expect(state.toast.title).toBe("Éxito");
      expect(state.toast.message).toBe("Operación completada");
    });

    it("should show error toast", () => {
      const { showToast } = useUIStore.getState();
      showToast({
        type: "error",
        title: "Error",
        message: "Algo salió mal",
      });

      const state = useUIStore.getState();
      expect(state.toast.isOpen).toBe(true);
      expect(state.toast.type).toBe("error");
      expect(state.toast.title).toBe("Error");
      expect(state.toast.message).toBe("Algo salió mal");
    });

    it("should hide toast and reset values", () => {
      const { showToast, hideToast } = useUIStore.getState();

      showToast({
        type: "success",
        title: "Test",
        message: "Test message",
      });

      expect(useUIStore.getState().toast.isOpen).toBe(true);

      hideToast();

      const state = useUIStore.getState();
      expect(state.toast.isOpen).toBe(false);
      expect(state.toast.type).toBe("error");
      expect(state.toast.title).toBe("");
      expect(state.toast.message).toBe("");
    });
  });

  describe("theme", () => {
    it("should toggle theme from light to dark", () => {
      const { setTheme } = useUIStore.getState();

      expect(useUIStore.getState().theme).toBe("light");

      setTheme();
      expect(useUIStore.getState().theme).toBe("dark");
    });

    it("should toggle theme from dark to light", () => {
      const { setTheme } = useUIStore.getState();

      // Set initial theme to dark
      useUIStore.setState({ theme: "dark" });

      setTheme();
      expect(useUIStore.getState().theme).toBe("light");
    });

    it("should toggle theme multiple times", () => {
      const { setTheme } = useUIStore.getState();

      setTheme();
      expect(useUIStore.getState().theme).toBe("dark");

      setTheme();
      expect(useUIStore.getState().theme).toBe("light");

      setTheme();
      expect(useUIStore.getState().theme).toBe("dark");
    });
  });

  describe("reagendamiento mode", () => {
    it("should start reagendamiento mode with booking data", () => {
      const { startReagendamientoMode } = useUIStore.getState();
      const mockBooking = {
        id: 123,
        consultorio_id: 1,
        start_time: "2025-03-15T10:00:00Z",
      };

      startReagendamientoMode(mockBooking);

      const state = useUIStore.getState();
      expect(state.isReagendamientoMode).toBe(true);
      expect(state.penalizedBookingForReagendamiento).toEqual(mockBooking);
    });

    it("should stop reagendamiento mode and clear booking", () => {
      const { startReagendamientoMode, stopReagendamientoMode } =
        useUIStore.getState();

      const mockBooking = { id: 456 };
      startReagendamientoMode(mockBooking);

      expect(useUIStore.getState().isReagendamientoMode).toBe(true);

      stopReagendamientoMode();

      const state = useUIStore.getState();
      expect(state.isReagendamientoMode).toBe(false);
      expect(state.penalizedBookingForReagendamiento).toBeNull();
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useUIStore.getState();

      expect(state.loading).toBe(false);
      expect(state.loadingMessage).toBe("Cargando...");
      expect(state.error).toBeNull();
      expect(state.loadingCount).toBe(0);
      expect(state.theme).toBe("light");
      expect(state.toast.isOpen).toBe(false);
      expect(state.toast.type).toBe("error");
      expect(state.toast.title).toBe("");
      expect(state.toast.message).toBe("");
      expect(state.isReagendamientoMode).toBe(false);
      expect(state.penalizedBookingForReagendamiento).toBeNull();
    });
  });
});

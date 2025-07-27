import { useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { confirmarReserva } from "@/services/reservationLogic";

export const useReservationHandler = (resetReservationState) => {
  const { startLoading, stopLoading, showToast } = useUIStore();

  const handleReservation = useCallback(
    async (hourlyEvents) => {
      resetReservationState();
      try {
        startLoading("Confirmando reserva...");
        const result = await confirmarReserva(hourlyEvents);

        // // Cerrar diálogo y limpiar estado
        return result;
      } catch (error) {
        showToast({
          type: "error",
          title: "Error en reserva",
          message: error.message,
        });
        throw error;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading, showToast, resetReservationState] // Dependencias correctas
  );

  return { handleReservation };
};

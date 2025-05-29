import { useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { confirmarReserva } from "@/services/reservationLogic";
import { useEventStore } from "@/stores/calendarStore";
import { mapReservationToEvent } from "@/utils/calendarUtils";

export const useReservationHandler = (resetReservationState) => {
  const { startLoading, stopLoading, showToast } = useUIStore();
  const { addEvent } = useEventStore();

  const handleReservation = useCallback(
    async (hourlyEvents) => {
      try {
        startLoading();
        const result = await confirmarReserva(hourlyEvents);

        showToast({
          type: "success",
          title: "Reserva exitosa",
          message: "Las reservas se han creado correctamente",
        });

        // Agrego nuevos eventos al calendario con el formato correcto
        const newEvents = result.map(mapReservationToEvent);
        addEvent(newEvents);
        // Cerrar diálogo y limpiar estado
        resetReservationState();
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
    [startLoading, stopLoading, showToast, resetReservationState, addEvent] // Dependencias correctas
  );

  return { handleReservation };
};

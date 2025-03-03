import { useState } from "react";
import {
  generateHourlyEvents,
  isSameSlot,
} from "@/components/calendar/calendarHelper";
import { useCalendarEvents } from "./useCalendarEvents";

export const useCalendarState = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hourlyEvents, setHourlyEvents] = useState([]);

  const { events, loadEvents } = useCalendarEvents();

  // Función para abrir Dialog si se hace click sobre botón de AGENDAR
  const handleSelectSlot = (slotInfo) => {
    const { start, end, resourceId } = slotInfo;

    if (
      selectedSlot &&
      isSameSlot(start, selectedSlot.start, resourceId, selectedSlot.resourceId)
    ) {
      setIsDialogOpen(true);
    } else {
      setSelectedSlot({ start, end, resourceId });
    }
  };

  // Función para confirmar la reserva
  const handleConfirmReserve = (reservationData) => {
    const newHourlyEvents = generateHourlyEvents(reservationData); // Creo reservas individuales
    setHourlyEvents(newHourlyEvents); // Actualizar el estado con los eventos generados
    setIsConfirmDialogOpen(true); // Abrir el diálogo después de actualizar el estado
  };

  const resetReservationState = () => {
    setSelectedSlot(null);
    setHourlyEvents([]);
    setIsConfirmDialogOpen(false);
  };

  // Función para cancelar la reserva
  const cancelarReserveDialog = () => {
    setIsDialogOpen(false);
  };

  // Función para ponerle a la celda seleccionada la clase "slotSelected"
  const slotPropGetter = (date, resourceId) => ({
    className: isSameSlot(
      date,
      selectedSlot?.start,
      resourceId,
      selectedSlot?.resourceId
    )
      ? "slotSelected"
      : "",
  });

  return {
    selectedSlot,
    isDialogOpen,
    isConfirmDialogOpen,
    hourlyEvents,
    handleSelectSlot,
    handleConfirmReserve,
    resetReservationState,
    setIsDialogOpen,
    setIsConfirmDialogOpen,
    cancelarReserveDialog,
  };
};

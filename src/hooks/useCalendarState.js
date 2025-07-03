import { useState } from "react";
import {
  generateHourlyEvents,
  isSameSlot,
} from "@/components/calendar/calendarHelper";
import { generateRecurringEvents } from "@/utils/calendarUtils";

export const useCalendarState = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hourlyEvents, setHourlyEvents] = useState([]);

  // Función para abrir Dialog si se hace click sobre botón de AGENDAR
  const handleSelectSlot = (slotInfo, selectedResource) => {
    const { start, end, resourceId } = slotInfo;

    if (
      selectedSlot &&
      isSameSlot(start, selectedSlot.start, resourceId, selectedSlot.resourceId)
    ) {
      // Si está en vista semanal el resource viene "null". Por lo que se establece el resourceId del consultorio seleccionado (selectedResource).
      if (resourceId === null) {
        setSelectedSlot({ ...selectedSlot, resourceId: selectedResource });
      }
      setIsDialogOpen(true);
    } else {
      setSelectedSlot({ start, end, resourceId });
    }
  };

  // Función para manejar la selección de eventos
  const handleSelectEvent = (slotEvent) => {
    console.log(slotEvent);
    const { id } = slotEvent;
    setSelectedSlot(null); // Elimino si hay una celda seleccionada para agendar.

    if (selectedEvent?.id === id) {
      setIsEventDialogOpen(true);
    } else {
      setSelectedEvent(slotEvent);
    }
  };

  // Función para confirmar la reserva
  const handleConfirmReserve = (reservationData) => {
    const newHourlyEvents = generateHourlyEvents(reservationData); // Creo reservas individuales
    // Si la hora en FIJA, genero recurrencias por 6 meses
    if (newHourlyEvents[0].tipo === "Fija") {
      const reservaFija = newHourlyEvents.flatMap((baseEvent) => {
        return generateRecurringEvents(baseEvent);
      });
      console.log(reservaFija);
      setHourlyEvents(reservaFija); // Actualizar el estado con los eventos FIJOS generados
    } else {
      console.log(newHourlyEvents);
      setHourlyEvents(newHourlyEvents); // Actualizar el estado con los eventos EVENTUALES generados
    }
    setIsConfirmDialogOpen(true); // Abrir el diálogo después de actualizar el estado
  };

  // Función que resetea los datos de la reservas
  const resetReservationState = () => {
    setSelectedSlot(null);
    setHourlyEvents([]);
    setIsConfirmDialogOpen(false);
  };

  // Función para cancelar la reserva
  const cancelarReserveDialog = () => {
    setIsDialogOpen(false);
  };

  return {
    selectedSlot,
    selectedEvent,
    isDialogOpen,
    isConfirmDialogOpen,
    isEventDialogOpen,
    hourlyEvents,
    handleSelectSlot,
    handleSelectEvent,
    handleConfirmReserve,
    resetReservationState,
    setIsDialogOpen,
    setIsConfirmDialogOpen,
    setIsEventDialogOpen,
    cancelarReserveDialog,
  };
};
